/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════════════════
// File: actions/bookings/adminCreateTripGroupBooking.ts
// ═══════════════════════════════════════════════════════════════════
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents, EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";
import { BookingStatus, ServicePricingStrategy } from "@prisma/client";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";
import { getCompanySettings } from "../../actions/admin/companySettings";
import { formatIsoDate } from "@/lib/timezone";

// ✅ Allowed statuses for admin-created bookings (same as adminCreateBooking)
const ADMIN_CREATE_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
] as const;

type AdminCreateBookingStatus = (typeof ADMIN_CREATE_STATUSES)[number];

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

type AdminCreateTripGroupInput = {
  legs: LegInput[];

  status?: AdminCreateBookingStatus;

  customerKind: "account" | "guest" | "corporate";
  customerUserId?: string | null;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;

  // Corporate fields
  corporateAccountId?: string | null;
  corporatePassengerId?: string | null;
  costCenter?: string | null;
  projectCode?: string | null;
  corporateNewPassengerName?: string | null;
  corporateNewPassengerEmail?: string | null;
  corporateNewPassengerPhone?: string | null;

  // Optional group label
  label?: string | null;
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isAllowedStatus(v: any): v is AdminCreateBookingStatus {
  return ADMIN_CREATE_STATUSES.includes(v);
}

export async function adminCreateTripGroupBooking(
  input: AdminCreateTripGroupInput,
) {
  const session = await auth();

  const role = (session?.user as any)?.role ?? null;
  const roles = ((session?.user as any)?.roles ?? []) as string[];
  const isAdmin = role === "ADMIN" || roles.includes("ADMIN");

  if (!session || !isAdmin) return { error: "Unauthorized" as const };

  // ─── Validate legs ───
  if (!input.legs || input.legs.length < 2) {
    return { error: "A multi-day trip requires at least 2 rides." };
  }

  if (input.legs.length > 10) {
    return { error: "Maximum 10 rides per trip group." };
  }

  // ─── Status (runtime guard + default) ───
  if (input.status != null && !isAllowedStatus(input.status)) {
    return { error: "Invalid status." as const };
  }
  const status: AdminCreateBookingStatus = input.status ?? "PENDING_REVIEW";

  // ─── Customer resolution (same logic as adminCreateBooking) ───
  let userId: string | null = null;
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  let guestPhone: string | null = null;

  let email = (input.customerEmail ?? "").trim().toLowerCase();

  if (input.customerKind === "account") {
    const id = (input.customerUserId ?? "").trim();
    if (!id) return { error: "Please select an existing user." as const };

    const u = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    if (!u) return { error: "Selected user not found." as const };

    userId = u.id;
    email = (u.email ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email))
      return { error: "Selected user has an invalid email." as const };
  } else if (input.customerKind === "corporate") {
    email = email || "";
  } else {
    // Guest
    email = (input.customerEmail ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email))
      return { error: "Enter a valid customer email." as const };

    const n = (input.customerName ?? "").trim();
    const p = (input.customerPhone ?? "").trim();

    if (!n) return { error: "Enter the guest name." as const };
    if (!p) return { error: "Enter the guest phone." as const };

    guestName = n;
    guestEmail = email;
    guestPhone = p;
  }

  // ─── Corporate account handling (same as adminCreateBooking) ───
  let resolvedCorporateAccountId: string | null = null;
  let resolvedCorporatePassengerId: string | null = null;
  let corporateDiscountPercent: number | null = null;

  if (input.customerKind === "corporate") {
    if (!input.corporateAccountId) {
      return { error: "Please select a corporate account." as const };
    }

    const corpAccount = await db.corporateAccount.findUnique({
      where: { id: input.corporateAccountId },
      select: {
        id: true,
        status: true,
        discountPercent: true,
      },
    });

    if (!corpAccount || corpAccount.status !== "ACTIVE") {
      return { error: "Corporate account not found or inactive." as const };
    }

    resolvedCorporateAccountId = corpAccount.id;
    corporateDiscountPercent = corpAccount.discountPercent
      ? Number(corpAccount.discountPercent)
      : null;

    // Existing passenger from roster
    if (input.corporatePassengerId) {
      const passenger = await db.corporatePassenger.findUnique({
        where: { id: input.corporatePassengerId },
        select: { id: true, corporateAccountId: true },
      });

      if (!passenger || passenger.corporateAccountId !== corpAccount.id) {
        return { error: "Passenger not found on this account." as const };
      }

      resolvedCorporatePassengerId = passenger.id;
    }
    // New passenger — add to roster on the fly
    else if (input.corporateNewPassengerName?.trim()) {
      const newPassenger = await db.corporatePassenger.create({
        data: {
          corporateAccountId: corpAccount.id,
          name: input.corporateNewPassengerName.trim(),
          email: input.corporateNewPassengerEmail?.trim() || null,
          phone: input.corporateNewPassengerPhone?.trim() || null,
        },
      });
      resolvedCorporatePassengerId = newPassenger.id;
    } else {
      return { error: "Please select or add a passenger." as const };
    }
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
    if (!leg.serviceTypeId) return { error: `${legLabel}: Missing service.` };
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

    // Blackout check
    const ymd = formatIsoDate(pickupAtDate, timezone);
    const isBlackout = await db.blackoutDate.findUnique({ where: { ymd } });
    if (isBlackout) {
      return {
        error: `${legLabel}: That date (${ymd}) is blacked out. Please choose another day.`,
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

    const vehicle = leg.vehicleId
      ? await db.vehicle.findUnique({ where: { id: leg.vehicleId } })
      : null;

    if (leg.vehicleId && (!vehicle || !vehicle.active)) {
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
        error: `${legLabel}: Missing route distance. Please re-check the route estimate (miles) before submitting.`,
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

    // Quote
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
  const adminUserId = (session.user as any).id as string;

  const result = await db.$transaction(async (tx) => {
    // 1. Create TripGroup
    const tripGroup = await tx.tripGroup.create({
      data: {
        label: input.label?.trim() || null,
        userId: userId ?? undefined,
        guestName: userId ? undefined : (guestName ?? undefined),
        guestEmail: userId ? undefined : (guestEmail ?? undefined),
        guestPhone: userId ? undefined : (guestPhone ?? undefined),
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

          guestName: userId ? undefined : (guestName ?? undefined),
          guestEmail: userId ? undefined : (guestEmail ?? undefined),
          guestPhone: userId ? undefined : (guestPhone ?? undefined),

          serviceTypeId: d.service.id,
          vehicleId: d.vehicle?.id ?? null,

          status: status as BookingStatus,

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
          flightGate: d.leg.flightGate?.trim().toUpperCase() || null,

          // Stop count and surcharge
          stopCount,
          stopSurchargeCents: d.stopSurchargeCents,

          // Pricing (with corporate discount applied if applicable)
          subtotalCents: d.finalSubtotalCents,
          totalCents: d.finalTotalCents,
          discountCents:
            d.appliedDiscountCents > 0 ? d.appliedDiscountCents : null,

          // Corporate fields
          corporateAccountId: resolvedCorporateAccountId,
          corporatePassengerId: resolvedCorporatePassengerId,
          costCenter: input.costCenter?.trim() || null,
          projectCode: input.projectCode?.trim() || null,

          // Create stops as nested records
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

          // Create fee snapshots as nested records
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
          status: status as BookingStatus,
          eventType: "STATUS_CHANGE",
          metadata: {
            action: `Admin multi-day trip created (Ride ${i + 1} of ${legData.length})`,
            tripGroupId: tripGroup.id,
            legNumber: i + 1,
            totalLegs: legData.length,
            createdByAdmin: adminUserId,
          },
          createdById: adminUserId,
        },
      });
    }

    return { tripGroup, bookingIds };
  });

  // ─── Send admin notifications for CONFIRMED bookings ───
  if (status === "CONFIRMED") {
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
  }

  return {
    success: true as const,
    tripGroupId: result.tripGroup.id,
    bookingIds: result.bookingIds,
    firstBookingId: result.bookingIds[0],
  };
}
