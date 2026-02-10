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

    const invoice = await db.corporateInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        corporateAccount: {
          select: {
            id: true,
            name: true,
            billingEmail: true,
            billingAddress: true,
            billingCity: true,
            billingState: true,
            billingZip: true,
            discountPercent: true,
          },
        },
        lineItems: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!invoice) return { ok: false, error: "Invoice not found." };

    // Auth: admin or corporate contact
    if (!isAdmin) {
      const contact = await db.corporateContact.findFirst({
        where: {
          userId,
          corporateAccountId: invoice.corporateAccountId,
        },
      });
      if (!contact) return { ok: false, error: "Forbidden." };
    }

    // Fetch bookings linked to line items
    const bookingIds = invoice.lineItems
      .map((li) => li.bookingId)
      .filter(Boolean) as string[];

    const bookings = await db.booking.findMany({
      where: { id: { in: bookingIds } },
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        corporatePassenger: { select: { name: true } },
        stops: {
          orderBy: { stopOrder: "asc" },
          select: { address: true, stopOrder: true },
        },
      },
    });

    const companySettings = await getCompanySettings();

    // Build line items
    const lineItems: InvoiceLineItem[] = invoice.lineItems.map((li) => ({
      description: li.description,
      amount: li.amountCents,
    }));

    if (invoice.discountCents > 0) {
      lineItems.push({
        description: `Corporate Discount (${invoice.corporateAccount?.discountPercent ?? ""}%)`,
        amount: -invoice.discountCents,
      });
    }

    const firstBooking = bookings[0] ?? null;
    const account = invoice.corporateAccount;

    const billingAddress = [
      account?.billingAddress,
      account?.billingCity,
      account?.billingState,
      account?.billingZip,
    ]
      .filter(Boolean)
      .join(", ");

    const data: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: formatInvoiceDate(invoice.createdAt),
      paidDate: invoice.paidAt ? formatInvoiceDate(invoice.paidAt) : null,

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
            date: formatTripDateTime(firstBooking.pickupAt),
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
    };

    return { ok: true, data };
  } catch (err) {
    console.error("[getCorporateInvoiceData] Error:", err);
    return { ok: false, error: "Failed to load invoice." };
  }
}
