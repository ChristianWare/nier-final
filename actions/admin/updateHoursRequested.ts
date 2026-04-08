/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  const roles = session?.user?.roles as string[] | undefined;
  const actorId =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);
  if (!session?.user || !actorId || !roles?.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }
  return { actorId };
}

const Schema = z.object({
  bookingId: z.string().min(1),
  hoursRequested: z.coerce.number().min(0.5).max(96),
});

export async function updateHoursRequested(formData: FormData): Promise<{
  error?: string;
  success?: boolean;
  newHours?: number;
  billedHours?: number;
  newSubtotalCents?: number;
  newTotalCents?: number;
}> {
  const { actorId } = await requireAdmin();

  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid data." };

  const { bookingId, hoursRequested } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      serviceType: true,
      vehicle: true,
      stops: { select: { id: true } },
      payment: {
        select: { id: true, status: true, amountPaidCents: true },
      },
      assignment: {
        select: { id: true, driverPaymentCents: true },
      },
    },
  });

  if (!booking) return { error: "Booking not found." };

  const svc = booking.serviceType;
  const veh = booking.vehicle;

  if (!svc || svc.pricingStrategy !== "HOURLY") {
    return { error: "This booking does not use hourly pricing." };
  }

  // ── Replicate PriceBreakdownCard math exactly ──────────────────────────────
  const perHourCents = (svc.perHourCents ?? 0) + (veh?.perHourCents ?? 0);
  const vehicleBaseFareCents = veh?.baseFareCents ?? 0;
  const serviceBaseFeeCents = svc.baseFeeCents ?? 0;
  const serviceMinFareCents = svc.minFareCents ?? 0;
  const vehicleMinHours = veh?.minHours ?? 0;
  // serviceMinHours is not stored on the model; PriceBreakdownCard receives 0
  const effectiveMinHours = Math.max(0, vehicleMinHours);
  const billed = Math.max(
    Math.ceil(hoursRequested),
    Math.ceil(effectiveMinHours),
  );
  const timeCharge = Math.round(billed * perHourCents);
  const rideCharge = Math.max(timeCharge, vehicleBaseFareCents);

  const stopCount = booking.stops?.length ?? 0;
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;

  let subtotalCents = rideCharge + serviceBaseFeeCents + stopSurchargeCents;
  if (subtotalCents < serviceMinFareCents) subtotalCents = serviceMinFareCents;

  const feesCents = booking.feesCents ?? 0;
  const taxesCents = booking.taxesCents ?? 0;
  const newTotalCents = subtotalCents + feesCents + taxesCents;
  // ──────────────────────────────────────────────────────────────────────────

  const oldTotalCents = booking.totalCents;
  const oldHours = booking.hoursRequested
    ? Number(booking.hoursRequested)
    : null;
  const priceChanged = oldTotalCents !== newTotalCents;

  const tx: any[] = [
    db.booking.update({
      where: { id: bookingId },
      data: {
        hoursRequested,
        hoursBilled: billed,
        subtotalCents,
        totalCents: newTotalCents,
      },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: booking.status as BookingStatus,
        eventType: "TRIP_EDITED",
        metadata: {
          changes: [
            {
              field: "Hours Requested",
              oldValue: oldHours,
              newValue: hoursRequested,
            },
          ],
          fieldsEdited: ["Hours Requested"],
        },
        createdById: actorId,
      },
    }),
  ];

  if (priceChanged) {
    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId,
          status: booking.status as BookingStatus,
          eventType: "PRICE_ADJUSTED",
          metadata: {
            oldSubtotalCents: booking.subtotalCents,
            newSubtotalCents: subtotalCents,
            oldFeesCents: feesCents,
            newFeesCents: feesCents,
            oldTaxesCents: taxesCents,
            newTaxesCents: taxesCents,
            oldTotalCents,
            newTotalCents,
            currency: booking.currency,
            reason: "Hours updated by admin",
          },
          createdById: actorId,
        },
      }),
    );

    // Sync payment total if paid and balance has grown
    const isPaid = booking.payment?.status === "PAID";
    const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
    if (isPaid && booking.payment && newTotalCents > amountPaidCents) {
      tx.push(
        db.payment.update({
          where: { id: booking.payment.id },
          data: { amountTotalCents: newTotalCents },
        }),
      );
    }
  }

  await db.$transaction(tx);

  // ── Auto-adjust driver pay proportionally ─────────────────────────────────
  if (
    priceChanged &&
    oldTotalCents > 0 &&
    newTotalCents > 0 &&
    booking.assignment?.driverPaymentCents &&
    booking.assignment.driverPaymentCents > 0
  ) {
    const pct = booking.assignment.driverPaymentCents / oldTotalCents;
    const newDriverPay = Math.round(pct * newTotalCents);
    await db.$transaction([
      db.assignment.update({
        where: { bookingId },
        data: { driverPaymentCents: newDriverPay },
      }),
      db.bookingStatusEvent.create({
        data: {
          bookingId,
          status: booking.status as BookingStatus,
          eventType: "DRIVER_PAY_ADJUSTED",
          metadata: {
            reason: "Automatic adjustment after hours change",
            oldDriverPayCents: booking.assignment.driverPaymentCents,
            newDriverPayCents: newDriverPay,
            percentage: Math.round(pct * 10000) / 100,
            oldBookingTotalCents: oldTotalCents,
            newBookingTotalCents: newTotalCents,
          },
          createdById: actorId,
        },
      }),
    ]);
  }

  revalidatePath(`/admin/bookings/${bookingId}`);

  return {
    success: true,
    newHours: hoursRequested,
    billedHours: billed,
    newSubtotalCents: subtotalCents,
    newTotalCents,
  };
}
