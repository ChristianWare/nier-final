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

export type EstimateInvoiceData = InvoiceData & {
  hoursRequested?: number | null;
  hoursBilled?: number | null;
  pricingStrategy?: string | null;
};

export async function getBookingEstimateData(
  bookingId: string,
): Promise<
  { ok: true; data: EstimateInvoiceData } | { ok: false; error: string }
> {
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

  const company = {
    name: companySettings.officeName || "Nier Transportation",
    address: companySettings.officeAddress || "",
    city: companySettings.officeCity || "",
    phone: companySettings.dispatchPhone || "",
    email: companySettings.supportEmail || "",
  };

  const logoUrl = (companySettings as Record<string, unknown>).logoUrl as
    | string
    | undefined;

  // ── Trip group: build combined estimate from all siblings ──
  if (booking.tripGroupId) {
    const tripGroup = await db.tripGroup.findUnique({
      where: { id: booking.tripGroupId },
      include: {
        bookings: {
          orderBy: { pickupAt: "asc" },
          include: {
            serviceType: { select: { name: true, pricingStrategy: true } },
            vehicle: { select: { name: true } },
            stops: {
              orderBy: { stopOrder: "asc" },
              select: { address: true, stopOrder: true },
            },
          },
        },
      },
    });

    if (!tripGroup) return { ok: false, error: "Trip group not found" };

    const siblings = tripGroup.bookings;
    const groupTotal = siblings.reduce((sum, b) => sum + b.totalCents, 0);
    const confirmationCode = booking.tripGroupId.slice(0, 8).toUpperCase();

    const lineItems: InvoiceLineItem[] = siblings.map((sibling, idx) => {
      const isHourly = sibling.serviceType?.pricingStrategy === "HOURLY";
      const hoursBilled = decimalToNumber(sibling.hoursBilled);
      const desc = `Ride ${idx + 1}: ${sibling.serviceType?.name ?? "Transportation"} — ${sibling.vehicle?.name ?? "Vehicle"}${isHourly && hoursBilled ? ` (${hoursBilled} hrs)` : ""}`;
      return {
        description: desc,
        amount: sibling.totalCents,
      };
    });

    const legs = siblings.map((sibling, idx) => ({
      legNumber: idx + 1,
      date: formatTripDateTime(sibling.pickupAt, companyTz),
      pickupAddress: sibling.pickupAddress,
      dropoffAddress: sibling.dropoffAddress,
      serviceName: sibling.serviceType?.name ?? "Transportation",
      amountCents: sibling.totalCents,
    }));

    const firstSibling = siblings[0];
    const lastSibling = siblings[siblings.length - 1];

    // Check if any leg is hourly (for the hours display in PDF)
    const hasHourlyLeg = siblings.some(
      (s) => s.serviceType?.pricingStrategy === "HOURLY",
    );

    const estimateData: EstimateInvoiceData = {
      invoiceNumber: confirmationCode,
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: null,
      logoUrl,
      company,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      trip: {
        date: formatTripDateTime(
          firstSibling?.pickupAt ?? booking.pickupAt,
          companyTz,
        ),
        pickupAddress: firstSibling?.pickupAddress ?? booking.pickupAddress,
        dropoffAddress: lastSibling?.dropoffAddress ?? booking.dropoffAddress,
        stops: [],
        serviceName:
          siblings.length > 1
            ? `Multi-Trip (${siblings.length} rides)`
            : (firstSibling?.serviceType?.name ?? "Transportation"),
        vehicleName:
          siblings.length > 1
            ? `${siblings.length} rides`
            : (firstSibling?.vehicle?.name ?? "Vehicle"),
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: null,
        durationMinutes: null,
      },
      legs,
      lineItems,
      subtotalCents: groupTotal,
      feesCents: 0,
      taxesCents: 0,
      totalCents: groupTotal,
      tipCents: 0,
      amountPaidCents: 0,
      amountRefundedCents: 0,
      currency: tripGroup.currency ?? booking.currency ?? "usd",
      paymentMethodDisplay: null,
      bookingConfirmation: confirmationCode,
      pricingStrategy: hasHourlyLeg ? "HOURLY" : null,
    };

    return { ok: true, data: estimateData };
  }

  // ── Single booking ──
  const stopCount = booking.stops?.length ?? 0;
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
  const baseFareCents = booking.subtotalCents - stopSurchargeCents;

  const isHourly = booking.serviceType?.pricingStrategy === "HOURLY";
  const hoursRequested = decimalToNumber(booking.hoursRequested);
  const hoursBilled = decimalToNumber(booking.hoursBilled);

  const lineItems: InvoiceLineItem[] = [];

  lineItems.push({
    description: `${booking.serviceType?.name ?? "Transportation"} — ${booking.vehicle?.name ?? "Vehicle"}${isHourly && hoursBilled ? ` (${hoursBilled} hrs)` : ""}`,
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

  const estimateData: EstimateInvoiceData = {
    invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
    invoiceDate: formatInvoiceDate(booking.createdAt),
    paidDate: null,
    logoUrl,
    company,
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
    hoursRequested,
    hoursBilled,
    pricingStrategy: booking.serviceType?.pricingStrategy ?? null,
  };

  return { ok: true, data: estimateData };
}
