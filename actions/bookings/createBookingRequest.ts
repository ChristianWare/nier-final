"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents } from "@/lib/pricing/calcQuote";
import { BookingStatus, ServicePricingStrategy } from "@prisma/client";
import { randomUUID } from "crypto";
import { queueAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";

type CreateBookingRequestInput = {
  serviceTypeId: string;
  vehicleId?: string | null;

  pickupAt: string;
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

  hoursRequested?: number | null;

  specialRequests?: string | null;

  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
};

const PHX_TZ = "America/Phoenix";

function ymdInPhoenix(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PHX_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// ✅ Helps when client accidentally sends strings, NaN, etc.
function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createBookingRequest(input: CreateBookingRequestInput) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | null)?.id ?? null;

  const guestName = (input.guestName ?? "").trim();
  const guestEmail = (input.guestEmail ?? "").trim().toLowerCase();
  const guestPhone = (input.guestPhone ?? "").trim();

  if (!userId) {
    if (!guestName) return { error: "Please enter your name." as const };
    if (!guestEmail || !isValidEmail(guestEmail))
      return { error: "Please enter a valid email address." as const };
    if (!guestPhone)
      return { error: "Please enter your phone number." as const };
  }

  const pickupAtDate = new Date(input.pickupAt);
  const ymd = ymdInPhoenix(pickupAtDate);

  const isBlackout = await db.blackoutDate.findUnique({ where: { ymd } });
  if (isBlackout) {
    return {
      error: "That date is unavailable. Please choose another day." as const,
    };
  }

  const service = await db.serviceType.findUnique({
    where: { id: input.serviceTypeId },
  });
  if (!service || !service.active)
    return { error: "Service not available" as const };

  const vehicle = input.vehicleId
    ? await db.vehicle.findUnique({ where: { id: input.vehicleId } })
    : null;

  if (input.vehicleId && (!vehicle || !vehicle.active)) {
    return { error: "Vehicle not available" as const };
  }

  // ✅ Normalize numeric inputs (prevents NaN/string weirdness)
  const distanceMiles = numOrNull(input.distanceMiles);
  const durationMinutes = numOrNull(input.durationMinutes);
  const hoursRequested = numOrNull(input.hoursRequested);

  // ✅ IMPORTANT: if distance is missing, you will ALWAYS fall back to minFare.
  // Better to fail fast so you fix the route-estimate pipeline.
  if (
    service.pricingStrategy === ServicePricingStrategy.POINT_TO_POINT &&
    (!distanceMiles || distanceMiles <= 0)
  ) {
    return {
      error:
        "Missing route distance. Please re-check the route estimate (miles) before submitting.",
    } as const;
  }

  const quote = calcQuoteCents({
    pricingStrategy: service.pricingStrategy,

    distanceMiles,
    durationMinutes,
    hoursRequested,

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

  const claimToken = userId ? null : randomUUID();

  const booking = await db.booking.create({
    data: {
      userId: userId ?? undefined,

      guestName: userId ? undefined : guestName,
      guestEmail: userId ? undefined : guestEmail,
      guestPhone: userId ? undefined : guestPhone,
      guestClaimToken: claimToken ?? undefined,

      serviceTypeId: service.id,
      vehicleId: vehicle?.id ?? null,

      status: BookingStatus.PENDING_REVIEW,

      pickupAt: pickupAtDate,
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

      distanceMiles,
      durationMinutes,

      hoursRequested: quote.requestedHours ?? hoursRequested ?? null,
      hoursBilled: quote.billedHours ?? null,

      specialRequests: input.specialRequests ?? null,

      // ✅ FIX: Access subtotalCents from the breakdown object
      subtotalCents: quote.breakdown.subtotalCents,
      totalCents: quote.totalCents,
    },
    select: { id: true, guestClaimToken: true },
  });

  await queueAdminNotificationsForBookingEvent({
    event: "BOOKING_REQUESTED",
    bookingId: booking.id,
  });

  return {
    success: true as const,
    bookingId: booking.id,
    claimToken: booking.guestClaimToken ?? null,
  };
}
