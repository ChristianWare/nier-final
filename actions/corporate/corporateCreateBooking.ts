/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth"; 
import { calcQuoteCents, EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";
import { BookingStatus, ServicePricingStrategy } from "@prisma/client";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";

// ✅ Corporate bookings go straight to CONFIRMED (or PENDING_REVIEW if you want admin approval)
const CORPORATE_BOOKING_STATUS: BookingStatus = "CONFIRMED";

type StopInput = {
  address: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type CorporateCreateBookingInput = {
  serviceTypeId: string;
  vehicleId: string;

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

  stops?: StopInput[];

  distanceMiles?: number | null;
  durationMinutes?: number | null;

  hoursRequested?: number | null;

  specialRequests?: string | null;

  // Flight info
  flightAirline?: string | null;
  flightNumber?: string | null;
  flightScheduledAt?: string | null;
  flightTerminal?: string | null;

  // Event type (hourly bookings)
  eventType?: string | null;

  // Passenger
  corporatePassengerId?: string | null;
  newPassengerName?: string | null;
  newPassengerEmail?: string | null;
  newPassengerPhone?: string | null;

  // Cost tracking
  costCenter?: string | null;
  projectCode?: string | null;
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const PHX_TZ = "America/Phoenix";

function ymdInPhoenix(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PHX_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function corporateCreateBooking(
  input: CorporateCreateBookingInput,
) {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? null;

  if (!session || !userId) {
    return { error: "Please log in to continue." as const };
  }

  // ─── Verify the user is a corporate contact ───
  const contact = await db.corporateContact.findFirst({
    where: { userId, active: true },
    select: {
      id: true,
      corporateAccountId: true,
      corporateAccount: {
        select: {
          id: true,
          name: true,
          status: true,
          discountPercent: true,
          billingCycle: true,
          paymentTerms: true,
        },
      },
    },
  });

  if (!contact || !contact.corporateAccount) {
    return { error: "No corporate account found for your user." as const };
  }

  const corpAccount = contact.corporateAccount;

  if (corpAccount.status !== "ACTIVE") {
    return {
      error:
        "Your corporate account is not active. Please contact Nier Transportation." as const,
    };
  }

  const corporateAccountId = corpAccount.id;
  const corporateDiscountPercent = corpAccount.discountPercent
    ? Number(corpAccount.discountPercent)
    : null;

  // ─── Basic validation ───
  if (!input.serviceTypeId)
    return { error: "Please select a service." as const };
  if (!input.vehicleId) return { error: "Please select a vehicle." as const };
  if (!input.pickupAddress?.trim())
    return { error: "Missing pickup address." as const };
  if (!input.dropoffAddress?.trim())
    return { error: "Missing dropoff address." as const };

  if (!Number.isFinite(input.passengers) || input.passengers < 1)
    return { error: "Passengers must be at least 1." as const };
  if (!Number.isFinite(input.luggage) || input.luggage < 0)
    return { error: "Luggage cannot be negative." as const };

  const pickupAtDate = new Date(input.pickupAt);
  if (!Number.isFinite(pickupAtDate.getTime()))
    return { error: "Invalid pickup time." as const };

  // ─── Blackout check ───
  const ymd = ymdInPhoenix(pickupAtDate);
  const blackout = await db.blackoutDate.findUnique({ where: { ymd } });
  if (blackout)
    return {
      error: "That date is unavailable. Please choose another day." as const,
    };

  // ─── Service / Vehicle ───
  const service = await db.serviceType.findUnique({
    where: { id: input.serviceTypeId },
    include: {
      fees: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!service || !service.active)
    return { error: "Service not available." as const };

  const vehicle = await db.vehicle.findUnique({
    where: { id: input.vehicleId },
  });
  if (!vehicle || !vehicle.active)
    return { error: "Vehicle not available." as const };

  // ─── Distance guard for point-to-point ───
  const distanceMiles = input.distanceMiles ?? null;
  const durationMinutes = input.durationMinutes ?? null;
  const hoursRequested = input.hoursRequested ?? null;

  if (
    service.pricingStrategy === ServicePricingStrategy.POINT_TO_POINT &&
    (!distanceMiles || distanceMiles <= 0)
  ) {
    return {
      error:
        "Missing route distance. Please re-check the route before submitting.",
    } as const;
  }

  // ─── Passenger resolution ───
  let resolvedPassengerId: string | null = null;

  if (input.corporatePassengerId) {
    const passenger = await db.corporatePassenger.findUnique({
      where: { id: input.corporatePassengerId },
      select: { id: true, corporateAccountId: true, active: true },
    });

    if (!passenger || passenger.corporateAccountId !== corporateAccountId) {
      return { error: "Passenger not found on your account." as const };
    }
    if (!passenger.active) {
      return { error: "That passenger is no longer active." as const };
    }

    resolvedPassengerId = passenger.id;
  } else if (input.newPassengerName?.trim()) {
    // Create new passenger on the roster
    const newPassenger = await db.corporatePassenger.create({
      data: {
        corporateAccountId,
        name: input.newPassengerName.trim(),
        email: input.newPassengerEmail?.trim() || null,
        phone: input.newPassengerPhone?.trim() || null,
      },
    });
    resolvedPassengerId = newPassenger.id;
  } else {
    return { error: "Please select or add a passenger." as const };
  }

  // ─── Process stops ───
  const validStops = (input.stops ?? []).filter(
    (s) =>
      s.address?.trim() &&
      s.lat != null &&
      s.lng != null &&
      s.lat !== 0 &&
      s.lng !== 0,
  );
  const stopCount = validStops.length;

  // ─── Calculate quote ───
  const quote = calcQuoteCents({
    pricingStrategy: service.pricingStrategy,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    stopCount,
    fees: (service.fees ?? []).map((f) => ({
      label: f.label,
      amountCents: f.amountCents,
    })),
    vehicleMinHours: vehicle.minHours ?? 0,
    serviceMinHours: service.minHours ?? 0,

    serviceMinFareCents: service.minFareCents,
    serviceBaseFeeCents: service.baseFeeCents,
    servicePerMileCents: service.perMileCents,
    servicePerMinuteCents: service.perMinuteCents,
    servicePerHourCents: service.perHourCents,

    vehicleBaseFareCents: vehicle.baseFareCents ?? 0,
    vehiclePerMileCents: vehicle.perMileCents ?? 0,
    vehiclePerMinuteCents: vehicle.perMinuteCents ?? 0,
    vehiclePerHourCents: vehicle.perHourCents ?? 0,
  });

  // ─── Apply corporate discount ───
  let finalSubtotalCents = quote.breakdown.subtotalCents;
  let finalTotalCents = quote.totalCents;
  let appliedDiscountCents = 0;

  if (corporateDiscountPercent && corporateDiscountPercent > 0) {
    appliedDiscountCents = Math.round(
      finalTotalCents * (corporateDiscountPercent / 100),
    );
    finalTotalCents = finalTotalCents - appliedDiscountCents;
    finalSubtotalCents = finalSubtotalCents - appliedDiscountCents;
  }

  // Parse flight scheduled time
  const flightScheduledAt = input.flightScheduledAt
    ? new Date(input.flightScheduledAt)
    : null;

  const stopSurchargeCents = stopCount * EXTRA_STOP_FEE_CENTS;

  // ─── Create booking ───
  const booking = await db.booking.create({
    data: {
      // No userId — corporate bookings belong to the account, not a personal user
      serviceTypeId: service.id,
      vehicleId: vehicle.id,

      status: CORPORATE_BOOKING_STATUS,

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
      eventType: input.eventType?.trim() || null,

      // Flight info
      flightAirline: input.flightAirline?.trim() || null,
      flightNumber: input.flightNumber?.trim().toUpperCase() || null,
      flightScheduledAt:
        flightScheduledAt && Number.isFinite(flightScheduledAt.getTime())
          ? flightScheduledAt
          : null,
      flightTerminal: input.flightTerminal?.trim() || null,

      // Stop count and surcharge
      stopCount,
      stopSurchargeCents,

      // Pricing (with corporate discount applied)
      subtotalCents: finalSubtotalCents,
      totalCents: finalTotalCents,
      discountCents: appliedDiscountCents > 0 ? appliedDiscountCents : null,

      // Corporate fields
      corporateAccountId,
      corporatePassengerId: resolvedPassengerId,
      costCenter: input.costCenter?.trim() || null,
      projectCode: input.projectCode?.trim() || null,

      // Create stops
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

      // Create fee snapshots
      fees:
        service.fees.length > 0
          ? {
              create: service.fees.map((fee) => ({
                label: fee.label,
                amountCents: fee.amountCents,
                serviceFeeId: fee.id,
              })),
            }
          : undefined,
    },
    select: { id: true },
  });

  // ─── Notify Nier admin ───
  try {
    await sendAdminNotificationsForBookingEvent({
      event: "BOOKING_REQUESTED",
      bookingId: booking.id,
    });
  } catch (e) {
    console.error("Failed to send admin notifications:", e);
  }

  return {
    success: true as const,
    bookingId: booking.id,
  };
}
