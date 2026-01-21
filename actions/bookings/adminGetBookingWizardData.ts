"use server";

import { db } from "@/lib/db";

export async function adminGetBookingWizardData({
  bookingId,
}: {
  bookingId: string;
}) {
  if (!bookingId) return { error: "Missing bookingId" };

  const b = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      currency: true,
      subtotalCents: true,
      feesCents: true,
      taxesCents: true,
      totalCents: true,
      payment: {
        select: { status: true, checkoutUrl: true },
      },
      assignment: {
        select: { driverId: true, vehicleUnitId: true },
      },
    },
  });

  if (!b) return { error: "Booking not found" };

  return {
    booking: {
      bookingId: b.id,
      currency: b.currency ?? "USD",
      subtotalCents: b.subtotalCents ?? 0,
      feesCents: b.feesCents ?? 0,
      taxesCents: b.taxesCents ?? 0,
      totalCents: b.totalCents ?? 0,
      paymentStatus: b.payment?.status ?? null,
      checkoutUrl: b.payment?.checkoutUrl ?? null,
      assignmentDriverId: b.assignment?.driverId ?? null,
      assignmentVehicleUnitId: b.assignment?.vehicleUnitId ?? null,
    },
  };
}
