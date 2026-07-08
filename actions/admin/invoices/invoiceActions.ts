/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { revalidatePath } from "next/cache";
import { sendInvoiceLinkEmail } from "@/lib/email/sendInvoiceLinkEmail";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? null;
  const roles = ((session?.user as any)?.roles ?? []) as string[];
  const isAdmin = role === "ADMIN" || roles.includes("ADMIN");
  const actorId = (session?.user as any)?.id ?? null;
  if (!session || !isAdmin) return null;
  return { actorId };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/* ── Send the pay link to the customer ── */
export async function adminSendInvoice(input: {
  invoiceId: string;
  overrideEmail?: string | null;
}): Promise<{ ok: true; recipient: string } | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      memo: true,
      subtotalCents: true,
      totalCents: true,
      amountPaidCents: true,
      currency: true,
      dueDate: true,
      user: { select: { name: true, email: true } },
      guestName: true,
      guestEmail: true,
      lineItems: {
        orderBy: { position: "asc" },
        select: { description: true, quantity: true, unitAmountCents: true },
      },
    },
  });

  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "VOID") return { error: "This invoice is voided." };

  const override = (input.overrideEmail ?? "").trim().toLowerCase();
  if (override && !isValidEmail(override)) {
    return { error: "Enter a valid email address." };
  }

  const recipient =
    override || invoice.user?.email || invoice.guestEmail || null;
  if (!recipient) {
    return { error: "No email on file. Add one or send to a specific address." };
  }

  const name = invoice.user?.name ?? invoice.guestName ?? null;
  const totalDueCents = invoice.totalCents - invoice.amountPaidCents;
  const payUrl = `${appUrl()}/pay/invoice/${invoice.id}`;

  try {
    await sendInvoiceLinkEmail({
      to: recipient,
      name,
      invoiceNumber: invoice.invoiceNumber,
      lineItems: invoice.lineItems,
      subtotalCents: invoice.subtotalCents,
      totalDueCents,
      currency: invoice.currency ?? "usd",
      payUrl,
      memo: invoice.memo,
      dueDateISO: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      invoiceId: invoice.id,
    });
  } catch (e) {
    console.error("[adminSendInvoice] email failed:", e);
    return { error: "Could not send the email. Please try again." };
  }

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
        sentAt: new Date(),
      },
    });
    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        eventType: "SENT",
        createdById: admin.actorId,
        metadata: { recipientEmail: recipient },
      },
    });
  });

  revalidatePath(`/admin/invoices/${invoice.id}`);
  revalidatePath("/admin/invoices");
  return { ok: true, recipient };
}

/* ── Void an invoice ── */
export async function adminVoidInvoice(input: {
  invoiceId: string;
}): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    select: { id: true, status: true, amountPaidCents: true, totalCents: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "PAID" || invoice.amountPaidCents >= invoice.totalCents) {
    return { error: "You can't void an invoice that's already been paid." };
  }
  if (invoice.status === "VOID") return { ok: true };

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "VOID", voidedAt: new Date() },
    });
    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        eventType: "VOIDED",
        createdById: admin.actorId,
      },
    });
  });

  revalidatePath(`/admin/invoices/${invoice.id}`);
  revalidatePath("/admin/invoices");
  return { ok: true };
}

/* ── Record an offline / manual payment ── */
export async function adminMarkInvoicePaid(input: {
  invoiceId: string;
  note?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    select: { id: true, status: true, totalCents: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status === "VOID") {
    return { error: "This invoice is voided." };
  }

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        amountPaidCents: invoice.totalCents,
        paidAt: new Date(),
      },
    });
    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        eventType: "PAID",
        createdById: admin.actorId,
        metadata: {
          manual: true,
          note: (input.note ?? "").trim() || null,
        },
      },
    });
  });

  revalidatePath(`/admin/invoices/${invoice.id}`);
  revalidatePath("/admin/invoices");
  return { ok: true };
}

/* ── Delete a draft invoice ── */
export async function adminDeleteInvoice(input: {
  invoiceId: string;
}): Promise<{ ok: true } | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    select: { id: true, status: true },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "DRAFT") {
    return { error: "Only draft invoices can be deleted. Void it instead." };
  }

  // Cascades remove line items + events (onDelete: Cascade in schema)
  await db.invoice.delete({ where: { id: invoice.id } });

  revalidatePath("/admin/invoices");
  return { ok: true };
}