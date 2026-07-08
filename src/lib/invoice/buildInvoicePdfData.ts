/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/invoice/buildInvoicePdfData.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import InvoiceDocumentPDF, {
  type InvoiceDocData,
} from "@/lib/invoice/InvoiceDocumentPDF";

function fmtDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Build the mode-aware PDF data (invoice vs receipt) for one invoice,
 * pulling company info from settings. Returns null if the invoice
 * doesn't exist. This is the single source of truth used by the
 * download route AND both emails, so they never diverge.
 */
export async function buildInvoicePdfData(
  invoiceId: string,
): Promise<InvoiceDocData | null> {
  const [invoice, settings] = await Promise.all([
    db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        status: true,
        memo: true,
        subtotalCents: true,
        totalCents: true,
        amountPaidCents: true,
        tipCents: true,
        currency: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
        user: { select: { name: true, email: true, phone: true } },
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        lineItems: {
          orderBy: { position: "asc" },
          select: {
            description: true,
            quantity: true,
            unitAmountCents: true,
          },
        },
      },
    }),
    getCompanySettings(),
  ]);

  if (!invoice) return null;

  const amountDueCents = Math.max(
    0,
    invoice.totalCents - invoice.amountPaidCents,
  );

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: fmtDate(invoice.createdAt) ?? "",
    dueDate: fmtDate(invoice.dueDate),
    paidDate: fmtDate(invoice.paidAt),
    status: invoice.status,
    company: {
      name: settings.companyName ?? "Nier Transportation",
      address: settings.officeAddress ?? "",
      city: settings.officeCity ?? "",
      phone: settings.dispatchPhone ?? "",
      email: settings.supportEmail ?? settings.emailReplyTo ?? "",
    },
    customer: {
      name: invoice.user?.name ?? invoice.guestName ?? "Customer",
      email: invoice.user?.email ?? invoice.guestEmail ?? "",
      phone: invoice.user?.phone ?? invoice.guestPhone ?? null,
    },
    lineItems: invoice.lineItems,
    subtotalCents: invoice.subtotalCents,
    tipCents: invoice.tipCents,
    amountPaidCents: invoice.amountPaidCents,
    amountDueCents,
    currency: invoice.currency ?? "usd",
    memo: invoice.memo,
  };
}

/**
 * Render an invoice's PDF to a Buffer (or null if not found / on error).
 * Used by the download route and email attachments.
 */
export async function renderInvoicePdfBuffer(
  invoiceId: string,
): Promise<Buffer | null> {
  const data = await buildInvoicePdfData(invoiceId);
  if (!data) return null;
  try {
    const buf = await renderToBuffer(
      createElement(InvoiceDocumentPDF, { data }) as any,
    );
    return Buffer.from(buf);
  } catch (e) {
    console.error("[renderInvoicePdfBuffer] failed:", e);
    return null;
  }
}