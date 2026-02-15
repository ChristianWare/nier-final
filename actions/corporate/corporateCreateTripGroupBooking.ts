/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════════════════
// File: actions/corporate/corporateCreateTripGroupBooking.ts
// ═══════════════════════════════════════════════════════════════════
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents, EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";
import { BookingStatus, ServicePricingStrategy } from "@prisma/client";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";
import { getCompanySettings } from "../../actions/admin/companySettings";
import { formatIsoDate } from "@/lib/timezone";

// ✅ Corporate bookings go straight to CONFIRMED (same as corporateCreateBooking)
const CORPORATE_BOOKING_STATUS: BookingStatus = "CONFIRMED";

type StopInput = {
  address: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type LegInput = {
  serviceTypeId: string;
  vehicleId: string;

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

  eventType?: string | null;

  costCenter?: string | null;
  projectCode?: string | null;
};

type CorporateCreateTripGroupInput = {
  legs: LegInput[];

  // Passenger (shared across all legs)
  corporatePassengerId?: string | null;
  newPassengerName?: string | null;
  newPassengerEmail?: string | null;
  newPassengerPhone?: string | null;

  // Optional group label
  label?: string | null;
};

export async function corporateCreateTripGroupBooking(
  input: CorporateCreateTripGroupInput,
) {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? null;

  if (!session || !userId) {
    return { error: "Please log in to continue." as const };
  }

  // ─── Verify the user is a corporate contact (same as corporateCreateBooking) ───
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

  // ─── Validate legs ───
  if (!input.legs || input.legs.length < 2) {
    return { error: "A multi-day trip requires at least 2 rides." };
  }

  if (input.legs.length > 10) {
    return { error: "Maximum 10 rides per trip group." };
  }

  // ─── Passenger resolution (shared across all legs, same as corporateCreateBooking) ───
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

  // ─── Validate each leg and compute pricing ───
  const { timezone } = await getCompanySettings();

  const legData: Array<{
    leg: LegInput;
    service: any;
    vehicle: any;
    quote: any;
    validStops: StopInput[];
    pickupAtDate: Date;
    flightScheduledAt: Date | null;
    stopSurchargeCents: number;
    finalSubtotalCents: number;
    finalTotalCents: number;
    appliedDiscountCents: number;
  }> = [];

  for (let i = 0; i < input.legs.length; i++) {
    const leg = input.legs[i];
    const legLabel = `Ride ${i + 1}`;

    // Basic validation
    if (!leg.serviceTypeId)
      return { error: `${legLabel}: Please select a service.` };
    if (!leg.vehicleId)
      return { error: `${legLabel}: Please select a vehicle.` };
    if (!leg.pickupAddress?.trim())
      return { error: `${legLabel}: Missing pickup address.` };
    if (!leg.dropoffAddress?.trim())
      return { error: `${legLabel}: Missing dropoff address.` };
    if (!Number.isFinite(leg.passengers) || leg.passengers < 1)
      return { error: `${legLabel}: Passengers must be at least 1.` };
    if (!Number.isFinite(leg.luggage) || leg.luggage < 0)
      return { error: `${legLabel}: Luggage cannot be negative.` };

    const pickupAtDate = new Date(leg.pickupAt);
    if (!Number.isFinite(pickupAtDate.getTime()))
      return { error: `${legLabel}: Invalid pickup time.` };

    // 36-hour advance booking requirement
    const minPickupAt = new Date(Date.now() + 36 * 60 * 60 * 1000);
    if (pickupAtDate < minPickupAt) {
      return {
        error: `${legLabel}: Bookings must be made at least 36 hours in advance.`,
      };
    }

    // Blackout check
    const ymd = formatIsoDate(pickupAtDate, timezone);
    const isBlackout = await db.blackoutDate.findUnique({ where: { ymd } });
    if (isBlackout) {
      return {
        error: `${legLabel}: That date (${ymd}) is unavailable. Please choose another day.`,
      };
    }

    // Service with fees
    const service = await db.serviceType.findUnique({
      where: { id: leg.serviceTypeId },
      include: {
        fees: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    if (!service || !service.active) {
      return { error: `${legLabel}: Service not available.` };
    }

    const vehicle = await db.vehicle.findUnique({
      where: { id: leg.vehicleId },
    });

    if (!vehicle || !vehicle.active) {
      return { error: `${legLabel}: Vehicle not available.` };
    }

    // Distance guard for point-to-point
    const distanceMiles = leg.distanceMiles ?? null;
    const durationMinutes = leg.durationMinutes ?? null;
    const hoursRequested = leg.hoursRequested ?? null;

    if (
      service.pricingStrategy === ServicePricingStrategy.POINT_TO_POINT &&
      (!distanceMiles || distanceMiles <= 0)
    ) {
      return {
        error: `${legLabel}: Missing route distance. Please re-check the route before submitting.`,
      };
    }

    // Process stops
    const validStops = (leg.stops ?? []).filter(
      (s) =>
        s.address?.trim() &&
        s.lat != null &&
        s.lng != null &&
        s.lat !== 0 &&
        s.lng !== 0,
    );
    const stopCount = validStops.length;

    // Calculate quote
    const quote = calcQuoteCents({
      pricingStrategy: service.pricingStrategy,
      distanceMiles,
      durationMinutes,
      hoursRequested,
      stopCount,
      fees: (service.fees ?? []).map((f: any) => ({
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

    const flightScheduledAt = leg.flightScheduledAt
      ? new Date(leg.flightScheduledAt)
      : null;

    const stopSurchargeCents = stopCount * EXTRA_STOP_FEE_CENTS;

    // Apply corporate discount per leg
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

    legData.push({
      leg,
      service,
      vehicle,
      quote,
      validStops,
      pickupAtDate,
      flightScheduledAt,
      stopSurchargeCents,
      finalSubtotalCents,
      finalTotalCents,
      appliedDiscountCents,
    });
  }

  // ─── Calculate group total ───
  const groupTotalCents = legData.reduce(
    (sum, d) => sum + d.finalTotalCents,
    0,
  );

  // ─── Create everything in a transaction ───
  const result = await db.$transaction(async (tx) => {
    // 1. Create TripGroup
    const tripGroup = await tx.tripGroup.create({
      data: {
        label: input.label?.trim() || null,
        // Corporate bookings don't have a userId — billing goes to the account
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
          // No userId — corporate bookings belong to the account
          tripGroupId: tripGroup.id,

          eventType: d.leg.eventType?.trim() || null,

          serviceTypeId: d.service.id,
          vehicleId: d.vehicle.id,

          status: CORPORATE_BOOKING_STATUS,

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

          distanceMiles: d.leg.distanceMiles ?? null,
          durationMinutes: d.leg.durationMinutes ?? null,

          hoursRequested:
            d.quote.requestedHours ?? d.leg.hoursRequested ?? null,
          hoursBilled: d.quote.billedHours ?? null,

          specialRequests: d.leg.specialRequests ?? null,

          // Flight info
          flightAirline: d.leg.flightAirline?.trim() || null,
          flightNumber: d.leg.flightNumber?.trim().toUpperCase() || null,
          flightScheduledAt:
            d.flightScheduledAt &&
            Number.isFinite(d.flightScheduledAt.getTime())
              ? d.flightScheduledAt
              : null,
          flightTerminal: d.leg.flightTerminal?.trim() || null,

          // Stop count and surcharge
          stopCount,
          stopSurchargeCents: d.stopSurchargeCents,

          // Pricing (with corporate discount applied)
          subtotalCents: d.finalSubtotalCents,
          totalCents: d.finalTotalCents,
          discountCents:
            d.appliedDiscountCents > 0 ? d.appliedDiscountCents : null,

          // Corporate fields
          corporateAccountId,
          corporatePassengerId: resolvedPassengerId,
          costCenter: d.leg.costCenter?.trim() || null,
          projectCode: d.leg.projectCode?.trim() || null,

          // Create stops
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

          // Create fee snapshots
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
          status: CORPORATE_BOOKING_STATUS,
          eventType: "STATUS_CHANGE",
          metadata: {
            action: `Corporate multi-day trip created (Ride ${i + 1} of ${legData.length})`,
            tripGroupId: tripGroup.id,
            legNumber: i + 1,
            totalLegs: legData.length,
            corporateAccountId,
            corporateAccountName: corpAccount.name,
          },
        },
      });
    }

    return { tripGroup, bookingIds };
  });

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

  return {
    success: true as const,
    tripGroupId: result.tripGroup.id,
    bookingIds: result.bookingIds,
    firstBookingId: result.bookingIds[0],
  };
}
