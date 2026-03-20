"use server";

import { db } from "@/lib/db";
import { getCompanySettings } from "../admin/companySettings";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";

function decimalToNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function getBookingEstimateData(
  bookingId: string,
): Promise<{ ok: true; data: InvoiceData } | { ok: false; error: string }> {
  if (!bookingId) return { ok: false, error: "Missing booking ID" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      serviceType: { select: { name: true, pricingStrategy: true } },
      vehicle: { select: { name: true } },
      user: { select: { name: true, email: true, phone: true } },
      stops: {
        orderBy: { stopOrder: "asc" },
        select: { address: true, stopOrder: true },
      },
    },
  });

  if (!booking) return { ok: false, error: "Booking not found" };

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone ?? "America/Phoenix";

  const customerName =
    booking.user?.name?.trim() ||
    booking.guestName?.trim() ||
    booking.user?.email ||
    booking.guestEmail ||
    "Guest";

  const customerEmail = booking.user?.email || booking.guestEmail || "";
  const customerPhone =
    booking.user?.phone?.trim() || booking.guestPhone?.trim() || null;

  const stopCount = booking.stops?.length ?? 0;
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
  const baseFareCents = booking.subtotalCents - stopSurchargeCents;

  const lineItems: InvoiceLineItem[] = [];

  lineItems.push({
    description: `${booking.serviceType?.name ?? "Transportation"} — ${booking.vehicle?.name ?? "Vehicle"}`,
    amount: baseFareCents,
  });

  if (stopCount > 0 && stopSurchargeCents > 0) {
    lineItems.push({
      description: `Extra Stop${stopCount > 1 ? "s" : ""} (${stopCount} × $15.00)`,
      amount: stopSurchargeCents,
    });
  }

  if (booking.feesCents > 0) {
    lineItems.push({
      description: "Service Fee",
      amount: booking.feesCents,
    });
  }

  const estimateData: InvoiceData = {
    invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
    invoiceDate: formatInvoiceDate(booking.createdAt),
    paidDate: null,
    logoUrl: (companySettings as Record<string, unknown>).logoUrl as
      | string
      | undefined,
    company: {
      name: companySettings.officeName || "Nier Transportation",
      address: companySettings.officeAddress || "",
      city: companySettings.officeCity || "",
      phone: companySettings.dispatchPhone || "",
      email: companySettings.supportEmail || "",
    },
    customer: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    trip: {
      date: formatTripDateTime(booking.pickupAt, companyTz),
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      stops: booking.stops.map((s) => ({
        address: s.address,
        stopOrder: s.stopOrder,
      })),
      serviceName: booking.serviceType?.name ?? "Transportation",
      vehicleName: booking.vehicle?.name ?? "Vehicle",
      passengers: booking.passengers,
      luggage: booking.luggage,
      distanceMiles: decimalToNumber(booking.distanceMiles),
      durationMinutes: booking.durationMinutes,
    },
    lineItems,
    subtotalCents: booking.subtotalCents,
    feesCents: booking.feesCents,
    taxesCents: booking.taxesCents,
    totalCents: booking.totalCents,
    tipCents: 0,
    amountPaidCents: 0,
    amountRefundedCents: 0,
    currency: booking.currency ?? "usd",
    paymentMethodDisplay: null,
    bookingConfirmation: booking.id.slice(0, 8).toUpperCase(),
  };

  return { ok: true, data: estimateData };
}
