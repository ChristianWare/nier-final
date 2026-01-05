"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents } from "@/lib/pricing/calcQuote";
import { BookingStatus } from "@prisma/client";

type CreateBookingRequestInput = {
  serviceTypeId: string;
  vehicleId?: string | null;

  pickupAt: string; // ISO
  passengers: number;
  luggage: number;

  pickupAddress: string;
  pickupPlaceId?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;

  dropoffAddress: string;
  dropoffPlaceId?: string | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;

  distanceMiles?: number | null;
  durationMinutes?: number | null;

  // NEW for hourly
  hoursRequested?: number | null;

  specialRequests?: string | null;
};

export async function createBookingRequest(input: CreateBookingRequestInput) {
  const session = await auth();
  const userId = session?.user?.userId;
  if (!userId) return { error: "Unauthorized" as const };

  const service = await db.serviceType.findUnique({
    where: { id: input.serviceTypeId },
  });
  if (!service || !service.active)
    return { error: "Service not available" as const };

  const vehicle = input.vehicleId
    ? await db.vehicle.findUnique({ where: { id: input.vehicleId } })
    : null;

  // If they selected a vehicle, ensure active
  if (input.vehicleId && (!vehicle || !vehicle.active)) {
    return { error: "Vehicle not available" as const };
  }

  const quote = calcQuoteCents({
    pricingStrategy: service.pricingStrategy,
    distanceMiles: input.distanceMiles ?? null,
    durationMinutes: input.durationMinutes ?? null,
    hoursRequested: input.hoursRequested ?? null,
    vehicleMinHours: vehicle?.minHours ?? 0,

    serviceMinFareCents: service.minFareCents,
    serviceBaseFeeCents: service.baseFeeCents,
    servicePerMileCents: service.perMileCents,
    servicePerMinuteCents: service.perMinuteCents,
    servicePerHourCents: service.perHourCents,

    vehicleBaseFareCents: vehicle?.baseFareCents ?? 0,
    vehiclePerMileCents: vehicle?.perMileCents ?? 0,
    vehiclePerMinuteCents: vehicle?.perMinuteCents ?? 0,
    vehiclePerHourCents: vehicle?.perHourCents ?? 0,
  });

  const booking = await db.booking.create({
    data: {
      userId,
      serviceTypeId: service.id,
      vehicleId: vehicle?.id ?? null,

      status: BookingStatus.PENDING_REVIEW,

      pickupAt: new Date(input.pickupAt),
      passengers: input.passengers,
      luggage: input.luggage,

      pickupAddress: input.pickupAddress,
      pickupPlaceId: input.pickupPlaceId ?? null,
      pickupLat: input.pickupLat ?? null,
      pickupLng: input.pickupLng ?? null,

      dropoffAddress: input.dropoffAddress,
      dropoffPlaceId: input.dropoffPlaceId ?? null,
      dropoffLat: input.dropoffLat ?? null,
      dropoffLng: input.dropoffLng ?? null,

      distanceMiles: input.distanceMiles ?? null,
      durationMinutes: input.durationMinutes ?? null,

      // NEW: hourly tracking
      hoursRequested: quote.requestedHours ?? input.hoursRequested ?? null,
      hoursBilled: quote.billedHours ?? null,

      specialRequests: input.specialRequests ?? null,

      subtotalCents: quote.subtotalCents,
      totalCents: quote.totalCents,
    },
  });

  return { success: true as const, bookingId: booking.id };
}
