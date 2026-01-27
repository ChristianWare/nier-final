"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents, EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";
import { BookingStatus, ServicePricingStrategy } from "@prisma/client";
import { randomUUID } from "crypto";
import { queueAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";

// ✅ Stop input type
type StopInput = {
  address: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

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

  // Extra stops
  stops?: StopInput[];

  distanceMiles?: number | null;
  durationMinutes?: number | null;

  hoursRequested?: number | null;

  specialRequests?: string | null;

  // Flight info fields
  flightAirline?: string | null;
  flightNumber?: string | null;
  flightScheduledAt?: string | null;
  flightTerminal?: string | null;
  flightGate?: string | null;

  // Guest fields
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;

  // ✅ NEW: Phone for logged-in users
  contactPhone?: string | null;
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
  const contactPhone = (input.contactPhone ?? "").trim();

  // Validation for guests
  if (!userId) {
    if (!guestName) return { error: "Please enter your name." as const };
    if (!guestEmail || !isValidEmail(guestEmail))
      return { error: "Please enter a valid email address." as const };
    if (!guestPhone)
      return { error: "Please enter your phone number." as const };
  }

  // ✅ Validation for logged-in users - require phone
  if (userId && !contactPhone) {
    return { error: "Please enter a phone number for this trip." as const };
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

  // Normalize numeric inputs
  const distanceMiles = numOrNull(input.distanceMiles);
  const durationMinutes = numOrNull(input.durationMinutes);
  const hoursRequested = numOrNull(input.hoursRequested);

  // Process stops
  const stopsInput = input.stops ?? [];
  const validStops = stopsInput.filter(
    (s) => s.address && s.lat != null && s.lng != null,
  );
  const stopCount = validStops.length;

  // Validate distance for point-to-point
  if (
    service.pricingStrategy === ServicePricingStrategy.POINT_TO_POINT &&
    (!distanceMiles || distanceMiles <= 0)
  ) {
    return {
      error:
        "Missing route distance. Please re-check the route estimate (miles) before submitting.",
    } as const;
  }

  // Calculate quote WITH stop count
  const quote = calcQuoteCents({
    pricingStrategy: service.pricingStrategy,

    distanceMiles,
    durationMinutes,
    hoursRequested,
    stopCount,

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

  // Parse flight scheduled time if provided
  const flightScheduledAt = input.flightScheduledAt
    ? new Date(input.flightScheduledAt)
    : null;

  // Calculate stop surcharge separately for storage
  const stopSurchargeCents = stopCount * EXTRA_STOP_FEE_CENTS;

  // Create booking with stops
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

      // Flight info fields
      flightAirline: input.flightAirline?.trim() || null,
      flightNumber: input.flightNumber?.trim().toUpperCase() || null,
      flightScheduledAt: flightScheduledAt,
      flightTerminal: input.flightTerminal?.trim() || null,
      flightGate: input.flightGate?.trim().toUpperCase() || null,

      // Store stop count and surcharge
      stopCount,
      stopSurchargeCents,

      subtotalCents: quote.breakdown.subtotalCents,
      totalCents: quote.totalCents,

      // Create stops as nested records
      stops: {
        create: validStops.map((stop, index) => ({
          stopOrder: index + 1,
          address: stop.address,
          placeId: stop.placeId ?? null,
          lat: stop.lat ?? null,
          lng: stop.lng ?? null,
          waitTimeMinutes: 5,
        })),
      },
    },
    select: { id: true, guestClaimToken: true },
  });

  // ✅ Save phone to user profile if logged in and user doesn't have one yet
  if (userId && contactPhone) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });

      // Only update if user doesn't have a phone yet (don't overwrite existing)
      if (!user?.phone) {
        await db.user.update({
          where: { id: userId },
          data: { phone: contactPhone },
        });
      }
    } catch (e) {
      // Non-critical - log but don't fail the booking
      console.error("Failed to save phone to user profile:", e);
    }
  }

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
