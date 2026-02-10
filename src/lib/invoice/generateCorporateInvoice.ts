import { db } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

type InvoiceResult =
  | { ok: true; invoiceId: string; charged: boolean }
  | { ok: false; error: string };

/* ─────────────────────────────────────────────
   Generate next invoice number
   e.g. INV-2026-0001, INV-2026-0002
   ───────────────────────────────────────────── */

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await db.corporateInvoice.findFirst({
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

/* ─────────────────────────────────────────────
   Calculate due date from payment terms
   ───────────────────────────────────────────── */

function calculateDueDate(paymentTerms: string): Date {
  const now = new Date();
  switch (paymentTerms) {
    case "NET_15":
      return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    case "NET_30":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "NET_45":
      return new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    case "DUE_ON_RECEIPT":
    default:
      return now;
  }
}

/* ─────────────────────────────────────────────
   Build line item description
   ───────────────────────────────────────────── */

function buildLineItemDescription(booking: {
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  serviceType: { name: string };
  corporatePassenger?: { name: string } | null;
}): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
  }).format(booking.pickupAt);

  const passenger = booking.corporatePassenger?.name ?? "Guest";
  const service = booking.serviceType.name;
  const pickup = booking.pickupAddress.split(",")[0];
  const dropoff = booking.dropoffAddress.split(",")[0];

  return `${date} — ${service} — ${passenger} — ${pickup} → ${dropoff}`;
}

/* ─────────────────────────────────────────────
   Charge card on file via Stripe
   ───────────────────────────────────────────── */

async function chargeCardOnFile(
  stripeCustomerId: string,
  amountCents: number,
  invoiceNumber: string,
  companyName: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Get the default payment method
    const customer = (await stripe.customers.retrieve(
      stripeCustomerId,
    )) as Stripe.Customer;

    if (customer.deleted) {
      return { ok: false, error: "Stripe customer has been deleted." };
    }

    let paymentMethodId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id;

    // Fallback: grab first attached card
    if (!paymentMethodId) {
      const methods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
        limit: 1,
      });
      if (methods.data.length === 0) {
        return { ok: false, error: "No card on file." };
      }
      paymentMethodId = methods.data[0].id;
    }

    // Create and confirm a PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `${companyName} — Invoice ${invoiceNumber}`,
      metadata: { invoiceNumber, corporateCustomerId: stripeCustomerId },
    });

    if (intent.status === "succeeded") {
      return { ok: true };
    }

    return {
      ok: false,
      error: `Payment intent status: ${intent.status}`,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown payment error.";
    console.error("[chargeCardOnFile] Error:", message);
    return { ok: false, error: message };
  }
}

/* ─────────────────────────────────────────────
   MAIN: Generate invoice for a completed
   corporate booking (PER_RIDE flow)
   ───────────────────────────────────────────── */

export async function generateCorporateInvoice(
  bookingId: string,
  adminUserId?: string,
): Promise<InvoiceResult> {
  try {
    // ─── 1. Load booking with corporate account ───
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        serviceType: { select: { name: true } },
        corporatePassenger: { select: { name: true } },
        corporateAccount: true,
      },
    });

    if (!booking) {
      return { ok: false, error: "Booking not found." };
    }

    if (!booking.corporateAccountId || !booking.corporateAccount) {
      return { ok: false, error: "Not a corporate booking." };
    }

    // Check if an invoice already exists for this booking
    const existingLineItem = await db.corporateInvoiceLineItem.findFirst({
      where: { bookingId },
    });

    if (existingLineItem) {
      return {
        ok: false,
        error: "Invoice already generated for this booking.",
      };
    }

    const account = booking.corporateAccount;

    // ─── 2. Calculate amounts ───
    const subtotalCents = booking.totalCents;
    const discountPercent = account.discountPercent
      ? Number(account.discountPercent)
      : 0;
    const discountCents = Math.round(subtotalCents * (discountPercent / 100));
    const totalCents = subtotalCents - discountCents;

    // ─── 3. Generate invoice number + due date ───
    const invoiceNumber = await nextInvoiceNumber();
    const dueDate = calculateDueDate(account.paymentTerms);
    const now = new Date();

    // ─── 4. Build line item description ───
    const description = buildLineItemDescription(booking);

    // ─── 5. Create invoice + line item + event in a transaction ───
    const invoice = await db.$transaction(async (tx) => {
      const inv = await tx.corporateInvoice.create({
        data: {
          corporateAccountId: account.id,
          invoiceNumber,
          periodStart: booking.pickupAt,
          periodEnd: booking.pickupAt,
          subtotalCents,
          discountCents,
          totalCents,
          amountPaidCents: 0,
          status: "SENT",
          dueDate,
          sentAt: now,
          lineItems: {
            create: {
              bookingId: booking.id,
              description,
              amountCents: subtotalCents,
            },
          },
          events: {
            create: {
              eventType: "CREATED",
              createdById: adminUserId ?? null,
              metadata: {
                bookingId: booking.id,
                subtotalCents,
                discountCents,
                totalCents,
                billingCycle: account.billingCycle,
              },
            },
          },
        },
      });

      // Create a SENT event
      await tx.corporateInvoiceEvent.create({
        data: {
          invoiceId: inv.id,
          eventType: "SENT",
          createdById: adminUserId ?? null,
          metadata: { sentTo: account.billingEmail },
        },
      });

      return inv;
    });

    // ─── 6. Auto-charge if CARD_ON_FILE ───
    let charged = false;

    if (
      account.paymentMethod === "CARD_ON_FILE" &&
      account.stripeCustomerId &&
      totalCents > 0
    ) {
      const chargeResult = await chargeCardOnFile(
        account.stripeCustomerId,
        totalCents,
        invoiceNumber,
        account.name,
      );

      if (chargeResult.ok) {
        charged = true;

        await db.$transaction(async (tx) => {
          await tx.corporateInvoice.update({
            where: { id: invoice.id },
            data: {
              status: "PAID",
              amountPaidCents: totalCents,
              paidAt: new Date(),
            },
          });

          await tx.corporateInvoiceEvent.create({
            data: {
              invoiceId: invoice.id,
              eventType: "PAYMENT_RECORDED",
              createdById: adminUserId ?? null,
              metadata: {
                method: "CARD_ON_FILE",
                amountCents: totalCents,
                stripeCustomerId: account.stripeCustomerId,
              },
            },
          });
        });
      } else {
        // Card charge failed — log it but invoice stays SENT
        console.error(
          `[generateCorporateInvoice] Auto-charge failed for ${invoiceNumber}:`,
          chargeResult.error,
        );

        await db.corporateInvoiceEvent.create({
          data: {
            invoiceId: invoice.id,
            eventType: "PAYMENT_FAILED",
            createdById: adminUserId ?? null,
            metadata: {
              method: "CARD_ON_FILE",
              error: chargeResult.error,
              amountCents: totalCents,
            },
          },
        });
      }
    }

    return { ok: true, invoiceId: invoice.id, charged };
  } catch (err) {
    console.error("[generateCorporateInvoice] Error:", err);
    return { ok: false, error: "Failed to generate invoice." };
  }
}

/* ─────────────────────────────────────────────
   Handle corporate booking completion
   
   Call this whenever a corporate booking
   transitions to COMPLETED status.
   ───────────────────────────────────────────── */

export async function handleCorporateBookingCompleted(
  bookingId: string,
  adminUserId?: string,
): Promise<InvoiceResult> {
  // Load the booking to check billing cycle
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      corporateAccountId: true,
      corporateAccount: {
        select: { billingCycle: true },
      },
    },
  });

  if (!booking?.corporateAccountId || !booking.corporateAccount) {
    // Not a corporate booking — nothing to do
    return { ok: true, invoiceId: "", charged: false };
  }

  const cycle = booking.corporateAccount.billingCycle;

  if (cycle === "PER_RIDE") {
    // Generate invoice immediately
    return generateCorporateInvoice(bookingId, adminUserId);
  }

  // MONTHLY or WEEKLY — rides accumulate, invoice generated later by cron
  // Nothing to do now, the booking is already linked to the corporate account
  return { ok: true, invoiceId: "", charged: false };
}
