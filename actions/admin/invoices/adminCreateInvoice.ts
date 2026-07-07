/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../../auth";
import { revalidatePath } from "next/cache";

/* ─────────────────────────────────────────────
   Generate next invoice number: INV-2026-0001
   Separate sequence from CorporateInvoice (different table).
   ───────────────────────────────────────────── */
async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await db.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let seq = 1;
  if (latest) {
    const parts = latest.invoiceNumber.split("-");
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type LineItemInput = {
  description: string;
  quantity: number;
  unitAmountCents: number;
};

type AdminCreateInvoiceInput = {
  customerKind: "account" | "guest";

  // When account:
  userId?: string | null;

  // When guest:
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;

  lineItems: LineItemInput[];

  memo?: string | null;
  internalNotes?: string | null;
  dueDate?: string | null; // ISO date string (yyyy-mm-dd) or null
  allowTip: boolean;
};

type Result =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { error: string };

export async function adminCreateInvoice(
  input: AdminCreateInvoiceInput,
): Promise<Result> {
  // ── Auth: admin only ──
  const session = await auth();
  const role = (session?.user as any)?.role ?? null;
  const roles = ((session?.user as any)?.roles ?? []) as string[];
  const isAdmin = role === "ADMIN" || roles.includes("ADMIN");
  if (!session || !isAdmin) return { error: "Not authorized." };

  const adminId = (session.user as any)?.id ?? null;

  // ── Validate line items ──
  const rawItems = Array.isArray(input.lineItems) ? input.lineItems : [];
  const cleaned = rawItems
    .map((li) => ({
      description: (li.description ?? "").trim(),
      quantity: Math.max(1, Math.floor(Number(li.quantity) || 0)),
      unitAmountCents: Math.max(0, Math.round(Number(li.unitAmountCents) || 0)),
    }))
    .filter((li) => li.description.length > 0);

  if (cleaned.length === 0) {
    return { error: "Add at least one line item with a description." };
  }

  const subtotalCents = cleaned.reduce(
    (sum, li) => sum + li.quantity * li.unitAmountCents,
    0,
  );

  if (subtotalCents <= 0) {
    return { error: "Invoice total must be greater than $0." };
  }

  // ── Validate customer ──
  let userId: string | null = null;
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  let guestPhone: string | null = null;

  if (input.customerKind === "account") {
    if (!input.userId) return { error: "Select an account holder." };
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) return { error: "Selected account holder was not found." };
    userId = user.id;
  } else {
    const email = (input.guestEmail ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return { error: "Enter a valid guest email." };
    }
    guestEmail = email;
    guestName = (input.guestName ?? "").trim() || null;
    guestPhone = (input.guestPhone ?? "").trim() || null;
  }

  // ── Optional due date ──
  let dueDate: Date | null = null;
  if (input.dueDate) {
    const d = new Date(input.dueDate);
    if (!isNaN(d.getTime())) dueDate = d;
  }

  // ── Create invoice + line items + activity event ──
  const invoiceNumber = await nextInvoiceNumber();

  try {
    const invoice = await db.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          status: "DRAFT",
          userId,
          guestName,
          guestEmail,
          guestPhone,
          memo: (input.memo ?? "").trim() || null,
          internalNotes: (input.internalNotes ?? "").trim() || null,
          subtotalCents,
          totalCents: subtotalCents,
          allowTip: Boolean(input.allowTip),
          dueDate,
          createdById: adminId,
          lineItems: {
            create: cleaned.map((li, idx) => ({
              description: li.description,
              quantity: li.quantity,
              unitAmountCents: li.unitAmountCents,
              position: idx,
            })),
          },
          events: {
            create: {
              eventType: "CREATED",
              createdById: adminId,
              metadata: { subtotalCents },
            },
          },
        },
        select: { id: true, invoiceNumber: true },
      });
      return created;
    });

    revalidatePath("/admin/invoices");

    return {
      ok: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    };
  } catch (e: any) {
    console.error("[adminCreateInvoice] failed:", e);
    return { error: "Could not create the invoice. Please try again." };
  }
}