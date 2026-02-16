// actions/corporate/getCorporateInvoiceData.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { getCompanySettings } from "../admin/companySettings";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";

function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (val as any).toNumber === "function")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (val as any).toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/* ─────────────────────────────────────────────
   Human-readable labels
   ───────────────────────────────────────────── */

function paymentMethodLabel(method: string, cardLast4?: string | null): string {
  switch (method) {
    case "CARD_ON_FILE":
      return cardLast4 ? `Card on File (····${cardLast4})` : "Card on File";
    case "INVOICE":
      return "Invoice";
    case "CHECK":
      return "Check";
    case "ACH":
      return "ACH Transfer";
    default:
      return method;
  }
}

function paymentTermsLabel(terms: string): string {
  switch (terms) {
    case "DUE_ON_RECEIPT":
      return "Due on Receipt";
    case "NET_15":
      return "Net 15";
    case "NET_30":
      return "Net 30";
    case "NET_45":
      return "Net 45";
    default:
      return terms;
  }
}

function invoiceStatusLabel(status: string, dueDate: Date | null): string {
  if (status === "PAID") return "PAID";
  if (status === "SENT" && dueDate && dueDate < new Date()) return "OVERDUE";
  if (status === "SENT") return "SENT";
  if (status === "DRAFT") return "DRAFT";
  if (status === "VOID") return "VOID";
  return status;
}

/* ─────────────────────────────────────────────
   Main action
   ───────────────────────────────────────────── */

export async function getCorporateInvoiceData(
  invoiceId: string,
): Promise<{ ok: true; data: InvoiceData } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const userId =
    (session.user as { id?: string }).id ??
    (session.user as { userId?: string }).userId;

  if (!userId) return { ok: false, error: "Unauthorized" };

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: true },
    });

    const isAdmin = user?.roles?.includes("ADMIN") ?? false;

    // Load invoice with account and line items.
    // CorporateInvoiceLineItem.bookingId is a plain String (no Prisma relation),
    // so we query the booking separately below.
    const invoice = await db.corporateInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        corporateAccount: true,
        lineItems: true,
      },
    });

    if (!invoice) return { ok: false, error: "Invoice not found." };

    // Authorization: admin or corporate contact for this account
    if (!isAdmin) {
      const contact = await db.corporateContact.findFirst({
        where: {
          userId,
          corporateAccountId: invoice.corporateAccountId,
          active: true,
        },
      });
      if (!contact) return { ok: false, error: "Not authorized." };
    }

    // Company settings
    const companySettings = await getCompanySettings();

    // Load the first booking for trip details
    // (bookingId is a plain string on line items, not a Prisma relation)
    const firstLineItem = invoice.lineItems[0] ?? null;
    const firstBooking = firstLineItem?.bookingId
      ? await db.booking.findUnique({
          where: { id: firstLineItem.bookingId },
          include: {
            serviceType: { select: { name: true } },
            vehicle: { select: { name: true } },
            assignment: {
              include: {
                driver: { select: { name: true } },
              },
            },
            stops: {
              orderBy: { stopOrder: "asc" },
              select: { address: true, stopOrder: true },
            },
            corporatePassenger: { select: { name: true } },
          },
        })
      : null;

    // Build line items
    const lineItems: InvoiceLineItem[] = invoice.lineItems.map((li) => ({
      description: li.description,
      amount: li.amountCents,
    }));

    // Add discount line if applicable
    if (invoice.discountCents > 0) {
      const discountPercent = invoice.corporateAccount?.discountPercent
        ? Number(invoice.corporateAccount.discountPercent)
        : null;

      lineItems.push({
        description: discountPercent
          ? `Corporate Discount (${discountPercent}%)`
          : "Corporate Discount",
        amount: -invoice.discountCents,
      });
    }

    const account = invoice.corporateAccount;

    // Booking confirmation code
    const bookingConfirmation = firstLineItem?.bookingId
      ? firstLineItem.bookingId.slice(0, 8).toUpperCase()
      : null;

    // Build billing address
    const billingAddress = [
      account?.billingAddress,
      account?.billingCity,
      account?.billingState,
      account?.billingZip,
    ]
      .filter(Boolean)
      .join(", ");

    // Card last4 placeholder — uncomment Stripe calls below if you want to show last4
    const cardLast4: string | null = null;
    // if (account?.paymentMethod === "CARD_ON_FILE" && firstBooking) {
    //   const payment = await db.payment.findUnique({
    //     where: { bookingId: firstBooking.id },
    //     select: { stripePaymentIntentId: true },
    //   });
    //   if (payment?.stripePaymentIntentId) {
    //     const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    //     const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string);
    //     cardLast4 = pm.card?.last4 ?? null;
    //   }
    // }

    // Determine invoice status
    const invoiceStatus = invoiceStatusLabel(invoice.status, invoice.dueDate);

    // Driver name comes from booking → assignment → driver (not a direct booking.driver field)
    const driverName = firstBooking?.assignment?.driver?.name ?? undefined;

    const data: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: formatInvoiceDate(invoice.createdAt),
      paidDate: invoice.paidAt ? formatInvoiceDate(invoice.paidAt) : null,
      logoUrl: companySettings.logoUrl || undefined,

      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },

      customer: {
        name: account?.name ?? "Corporate Client",
        email: account?.billingEmail ?? "",
        phone: billingAddress || null,
      },

      trip: firstBooking
        ? {
            date: formatTripDateTime(
              firstBooking.pickupAt,
              companySettings.timezone,
            ),
            pickupAddress: firstBooking.pickupAddress,
            dropoffAddress: firstBooking.dropoffAddress,
            stops: firstBooking.stops.map((s) => ({
              address: s.address,
              stopOrder: s.stopOrder,
            })),
            serviceName: firstBooking.serviceType?.name ?? "Transportation",
            vehicleName: firstBooking.vehicle?.name ?? "Vehicle",
            passengers: firstBooking.passengers,
            luggage: firstBooking.luggage,
            distanceMiles: toNumber(firstBooking.distanceMiles),
            durationMinutes: firstBooking.durationMinutes,
          }
        : {
            date: formatInvoiceDate(invoice.periodStart),
            pickupAddress: "—",
            dropoffAddress: "—",
            stops: [],
            serviceName: "Corporate Transportation",
            vehicleName: "—",
            passengers: 0,
            luggage: 0,
            distanceMiles: null,
            durationMinutes: null,
          },

      lineItems,

      subtotalCents: invoice.subtotalCents,
      feesCents: 0,
      taxesCents: 0,
      totalCents: invoice.totalCents,
      tipCents: 0,
      amountPaidCents: invoice.amountPaidCents,
      amountRefundedCents: 0,

      currency: "usd",

      // ─── Corporate-specific fields ───
      paymentMethod: account
        ? paymentMethodLabel(account.paymentMethod, cardLast4)
        : undefined,
      paymentTerms: account
        ? paymentTermsLabel(account.paymentTerms)
        : undefined,
      dueDate: invoice.dueDate ? formatInvoiceDate(invoice.dueDate) : undefined,
      invoiceStatus,
      poNumber: account?.poNumber ?? undefined,
      driverName,
      bookingConfirmation: bookingConfirmation ?? undefined,
      corporateAccountName: account?.name ?? undefined,
    };

    return { ok: true, data };
  } catch (err) {
    console.error("[getCorporateInvoiceData] Error:", err);
    return { ok: false, error: "Failed to load invoice." };
  }
}
