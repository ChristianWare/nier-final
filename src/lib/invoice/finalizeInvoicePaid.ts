/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/invoice/finalizeInvoicePaid.ts
import { db } from "@/lib/db";
import { sendInvoiceReceiptEmail } from "@/lib/email/sendInvoiceReceiptEmail";

type FinalizeArgs = {
  invoiceId: string;
  paymentIntentId: string | null;
  amountReceivedCents: number; // total charged by Stripe (base + tip)
  tipCents: number;
  receiptUrl?: string | null;
};

/**
 * Idempotently mark an invoice as paid from a Stripe payment_intent.succeeded
 * event, log an activity event, and email the customer a receipt.
 * Safe to call multiple times for the same PaymentIntent (webhook retries).
 */
export async function finalizeInvoicePaid(args: FinalizeArgs): Promise<void> {
  const invoice = await db.invoice.findUnique({
    where: { id: args.invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      subtotalCents: true,
      totalCents: true,
      amountPaidCents: true,
      currency: true,
      memo: true,
      stripePaymentIntentId: true,
      user: { select: { name: true, email: true } },
      guestName: true,
      guestEmail: true,
      lineItems: {
        orderBy: { position: "asc" },
        select: {
          description: true,
          quantity: true,
          unitAmountCents: true,
        },
      },
    },
  });

  if (!invoice) {
    console.warn(`[finalizeInvoicePaid] invoice ${args.invoiceId} not found`);
    return;
  }

  // Idempotency: already settled by this same PaymentIntent → stop (no double receipt)
  if (
    invoice.status === "PAID" &&
    invoice.stripePaymentIntentId === args.paymentIntentId
  ) {
    return;
  }

  const tipCents = Math.max(0, Math.round(args.tipCents || 0));
  const baseReceived = Math.max(0, args.amountReceivedCents - tipCents);
  const newAmountPaid = Math.min(
    invoice.totalCents,
    invoice.amountPaidCents + baseReceived,
  );
  const isFullyPaid = newAmountPaid >= invoice.totalCents;
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaidCents: newAmountPaid,
        tipCents,
        status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
        paidAt: isFullyPaid ? now : null,
        receiptUrl: args.receiptUrl ?? undefined,
        stripePaymentIntentId: args.paymentIntentId ?? undefined,
      },
    });

    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        eventType: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
        metadata: {
          amountReceivedCents: args.amountReceivedCents,
          tipCents,
          paymentIntentId: args.paymentIntentId ?? null,
        },
      },
    });
  });

  console.log(
    `✅ Invoice ${invoice.invoiceNumber} marked ${isFullyPaid ? "PAID" : "PARTIALLY_PAID"} (${newAmountPaid}¢ of ${invoice.totalCents}¢)`,
  );

  // ── Receipt email (best-effort) ──
  const to = invoice.user?.email ?? invoice.guestEmail ?? null;
  const name = invoice.user?.name ?? invoice.guestName ?? null;

  if (to) {
    try {
      await sendInvoiceReceiptEmail({
        to,
        name,
        invoiceNumber: invoice.invoiceNumber,
        lineItems: invoice.lineItems,
        subtotalCents: invoice.subtotalCents,
        tipCents,
        amountPaidCents: newAmountPaid + tipCents,
        currency: invoice.currency ?? "usd",
        paidAtISO: isFullyPaid ? now.toISOString() : null,
        memo: invoice.memo,
        invoiceId: invoice.id,
      });
    } catch (e) {
      console.error(
        `[finalizeInvoicePaid] receipt email failed for ${invoice.invoiceNumber}:`,
        e,
      );
    }
  }
}