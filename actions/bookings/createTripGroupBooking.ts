/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════════════════
// File: actions/bookings/createTripGroupBooking.ts
// ═══════════════════════════════════════════════════════════════════
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents, EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";
import { BookingStatus, ServicePricingStrategy } from "@prisma/client";
import { randomUUID } from "crypto";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";
import { sendBookingRequestedEmail } from "@/lib/email/sendBookingRequestedEmail";

// ─── Types ───

type StopInput = {
  address: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type LegInput = {
  serviceTypeId: string;
  vehicleId?: string | null;

  pickupAt: string; // ISO string
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

  flightAirline?: string | null;
  flightNumber?: string | null;
  flightScheduledAt?: string | null;
  flightTerminal?: string | null;
  flightGate?: string | null;

  eventType?: string | null;
};

export type CreateTripGroupInput = {
  legs: LegInput[];

  // Guest fields (shared across all legs)
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;

  // Phone for logged-in users
  contactPhone?: string | null;

  // Optional group label
  label?: string | null;
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

export async function createTripGroupBooking(input: CreateTripGroupInput) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | null)?.id ?? null;

  const guestName = (input.guestName ?? "").trim();
  const guestEmail = (input.guestEmail ?? "").trim().toLowerCase();
  const guestPhone = (input.guestPhone ?? "").trim();
  const contactPhone = (input.contactPhone ?? "").trim();

  // ─── Validate contact info ───
  if (!userId) {
    if (!guestName) return { error: "Please enter your name." };
    if (!guestEmail || !isValidEmail(guestEmail))
      return { error: "Please enter a valid email address." };
    if (!guestPhone) return { error: "Please enter your phone number." };
  }

  if (userId && !contactPhone) {
    return { error: "Please enter a phone number for this trip." };
  }

  // ─── Validate legs ───
  if (!input.legs || input.legs.length < 2) {
    return { error: "A multi-day trip requires at least 2 rides." };
  }

  if (input.legs.length > 10) {
    return { error: "Maximum 10 rides per trip group." };
  }

  // ─── Validate each leg and compute pricing ───
  const legData: Array<{
    leg: LegInput;
    service: any;
    vehicle: any;
    quote: any;
    validStops: StopInput[];
    pickupAtDate: Date;
    flightScheduledAt: Date | null;
    stopSurchargeCents: number;
  }> = [];

  for (let i = 0; i < input.legs.length; i++) {
    const leg = input.legs[i];
    const legLabel = `Ride ${i + 1}`;

    const pickupAtDate = new Date(leg.pickupAt);
    const ymd = ymdInPhoenix(pickupAtDate);

    // Blackout check
    const isBlackout = await db.blackoutDate.findUnique({ where: { ymd } });
    if (isBlackout) {
      return {
        error: `${legLabel}: That date (${ymd}) is unavailable. Please choose another day.`,
      };
    }

    // 36-hour minimum
    const minBookingTime = new Date(Date.now() + 36 * 60 * 60 * 1000);
    if (pickupAtDate < minBookingTime) {
      return {
        error: `${legLabel}: Bookings must be made at least 36 hours in advance.`,
      };
    }

    // Fetch service with fees
    const service = await db.serviceType.findUnique({
      where: { id: leg.serviceTypeId },
      include: {
        fees: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, label: true, amountCents: true },
        },
      },
    });

    if (!service || !service.active) {
      return { error: `${legLabel}: Service not available.` };
    }

    const vehicle = leg.vehicleId
      ? await db.vehicle.findUnique({ where: { id: leg.vehicleId } })
      : null;

    if (leg.vehicleId && (!vehicle || !vehicle.active)) {
      return { error: `${legLabel}: Vehicle not available.` };
    }

    const distanceMiles = numOrNull(leg.distanceMiles);
    const durationMinutes = numOrNull(leg.durationMinutes);
    const hoursRequested = numOrNull(leg.hoursRequested);

    const validStops = (leg.stops ?? []).filter(
      (s) => s.address && s.lat != null && s.lng != null,
    );
    const stopCount = validStops.length;

    if (
      service.pricingStrategy === ServicePricingStrategy.POINT_TO_POINT &&
      (!distanceMiles || distanceMiles <= 0)
    ) {
      return {
        error: `${legLabel}: Missing route distance. Please re-check the route.`,
      };
    }

    const feesForQuote = service.fees.map((f: any) => ({
      label: f.label,
      amountCents: f.amountCents,
    }));

    const quote = calcQuoteCents({
      pricingStrategy: service.pricingStrategy,
      distanceMiles,
      durationMinutes,
      hoursRequested,
      stopCount,
      fees: feesForQuote,
      vehicleMinHours: vehicle?.minHours ?? 0,
      serviceMinHours: service.minHours ?? 0,
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

    const flightScheduledAt = leg.flightScheduledAt
      ? new Date(leg.flightScheduledAt)
      : null;

    const stopSurchargeCents = stopCount * EXTRA_STOP_FEE_CENTS;

    legData.push({
      leg,
      service,
      vehicle,
      quote,
      validStops,
      pickupAtDate,
      flightScheduledAt,
      stopSurchargeCents,
    });
  }

  // ─── Calculate group total ───
  const groupTotalCents = legData.reduce(
    (sum, d) => sum + d.quote.totalCents,
    0,
  );

  const claimToken = userId ? null : randomUUID();

  // ─── Create everything in a transaction ───
  const result = await db.$transaction(async (tx) => {
    // 1. Create TripGroup
    const tripGroup = await tx.tripGroup.create({
      data: {
        label: input.label?.trim() || null,
        userId: userId ?? undefined,
        guestName: userId ? undefined : guestName,
        guestEmail: userId ? undefined : guestEmail,
        guestPhone: userId ? undefined : guestPhone,
        totalCents: groupTotalCents,
        currency: "usd",
        legCount: legData.length,
        paymentStatus: "NONE",
      },
    });

    // 2. Create each booking linked to the group
    const bookingIds: string[] = [];

    for (let i = 0; i < legData.length; i++) {
      const d = legData[i];
      const stopCount = d.validStops.length;

      const booking = await tx.booking.create({
        data: {
          userId: userId ?? undefined,
          tripGroupId: tripGroup.id,

          eventType: d.leg.eventType?.trim() || null,

          guestName: userId ? undefined : guestName,
          guestEmail: userId ? undefined : guestEmail,
          guestPhone: userId ? undefined : guestPhone,
          // Only the first leg gets the claim token
          guestClaimToken: i === 0 ? (claimToken ?? undefined) : undefined,

          serviceTypeId: d.service.id,
          vehicleId: d.vehicle?.id ?? null,

          status: BookingStatus.PENDING_REVIEW,

          pickupAt: d.pickupAtDate,
          passengers: d.leg.passengers,
          luggage: d.leg.luggage,

          pickupAddress: d.leg.pickupAddress,
          pickupPlaceId: d.leg.pickupPlaceId ?? null,
          pickupLat: d.leg.pickupLat ?? null,
          pickupLng: d.leg.pickupLng ?? null,

          dropoffAddress: d.leg.dropoffAddress,
          dropoffPlaceId: d.leg.dropoffPlaceId ?? null,
          dropoffLat: d.leg.dropoffLat ?? null,
          dropoffLng: d.leg.dropoffLng ?? null,

          distanceMiles: numOrNull(d.leg.distanceMiles),
          durationMinutes: numOrNull(d.leg.durationMinutes),

          hoursRequested:
            d.quote.requestedHours ?? numOrNull(d.leg.hoursRequested) ?? null,
          hoursBilled: d.quote.billedHours ?? null,

          specialRequests: d.leg.specialRequests ?? null,

          flightAirline: d.leg.flightAirline?.trim() || null,
          flightNumber: d.leg.flightNumber?.trim().toUpperCase() || null,
          flightScheduledAt: d.flightScheduledAt,
          flightTerminal: d.leg.flightTerminal?.trim() || null,
          flightGate: d.leg.flightGate?.trim().toUpperCase() || null,

          stopCount,
          stopSurchargeCents: d.stopSurchargeCents,

          subtotalCents: d.quote.breakdown.subtotalCents,
          totalCents: d.quote.totalCents,

          stops: {
            create: d.validStops.map((stop, idx) => ({
              stopOrder: idx + 1,
              address: stop.address,
              placeId: stop.placeId ?? null,
              lat: stop.lat ?? null,
              lng: stop.lng ?? null,
              waitTimeMinutes: 5,
            })),
          },

          fees:
            d.service.fees.length > 0
              ? {
                  create: d.service.fees.map((fee: any) => ({
                    label: fee.label,
                    amountCents: fee.amountCents,
                    serviceFeeId: fee.id,
                  })),
                }
              : undefined,
        },
        select: { id: true },
      });

      bookingIds.push(booking.id);

      // Create status event for each leg
      await tx.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          status: BookingStatus.PENDING_REVIEW,
          eventType: "STATUS_CHANGE",
          metadata: {
            action: `Multi-day trip created (Ride ${i + 1} of ${legData.length})`,
            tripGroupId: tripGroup.id,
            legNumber: i + 1,
            totalLegs: legData.length,
          },
          createdById: userId ?? undefined,
        },
      });
    }

    return { tripGroup, bookingIds };
  });

  // ─── Save phone to user profile if needed ───
  if (userId && contactPhone) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });
      if (!user?.phone) {
        await db.user.update({
          where: { id: userId },
          data: { phone: contactPhone },
        });
      }
    } catch (e) {
      console.error("Failed to save phone to user profile:", e);
    }
  }

  // ─── Send admin notifications for each leg ───
  for (const bookingId of result.bookingIds) {
    try {
      await sendAdminNotificationsForBookingEvent({
        event: "BOOKING_REQUESTED",
        bookingId,
      });
    } catch (e) {
      console.error("Failed to send admin notification for leg:", e);
    }
  }

  // ─── Send single confirmation email to customer (for the first leg) ───
  const customerEmail = userId
    ? (
        await db.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })
      )?.email
    : guestEmail;

  const customerName = userId
    ? (
        await db.user.findUnique({
          where: { id: userId },
          select: { name: true },
        })
      )?.name
    : guestName;

  if (customerEmail) {
    try {
      const APP_URL = process.env.APP_URL || "http://localhost:3000";
      const trackingUrl = claimToken
        ? `${APP_URL}/book/track?t=${encodeURIComponent(claimToken)}`
        : null;

      const firstLeg = legData[0];
      await sendBookingRequestedEmail({
        to: customerEmail,
        name: customerName,
        pickupAtISO: firstLeg.pickupAtDate.toISOString(),
        pickupAddress: firstLeg.leg.pickupAddress,
        dropoffAddress: firstLeg.leg.dropoffAddress,
        serviceName: firstLeg.service.name,
        vehicleName: firstLeg.vehicle?.name ?? "Standard",
        passengers: firstLeg.leg.passengers,
        luggage: firstLeg.leg.luggage,
        bookingId: result.bookingIds[0],
        trackingUrl,
      });
    } catch (e) {
      console.error("Failed to send booking confirmation email:", e);
    }
  }

  return {
    success: true as const,
    tripGroupId: result.tripGroup.id,
    bookingIds: result.bookingIds,
    claimToken: claimToken ?? null,
    firstBookingId: result.bookingIds[0],
  };
}
