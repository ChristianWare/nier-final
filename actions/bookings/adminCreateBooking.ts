/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents, EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";
import { BookingStatus, ServicePricingStrategy } from "@prisma/client";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";

// ✅ Allowed statuses for admin-created bookings
const ADMIN_CREATE_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
] as const;

export type AdminCreateBookingStatus = (typeof ADMIN_CREATE_STATUSES)[number];

// ✅ Stop input type
type StopInput = {
  address: string;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type AdminCreateBookingInput = {
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

  // Flight info
  flightAirline?: string | null;
  flightNumber?: string | null;
  flightScheduledAt?: string | null;
  flightTerminal?: string | null;
  flightGate?: string | null;

  // Event type (hourly bookings)
  eventType?: string | null;

  // Optional incoming status
  status?: AdminCreateBookingStatus;

  customerKind: "account" | "guest" | "corporate";
  customerUserId?: string | null;

  // For "account", we override this with the user's email for safety
  customerEmail: string;

  customerName?: string | null;
  customerPhone?: string | null;

  // ─── Corporate booking fields ───
  corporateAccountId?: string | null;
  corporatePassengerId?: string | null;
  costCenter?: string | null;
  projectCode?: string | null;
  corporateNewPassengerName?: string | null;
  corporateNewPassengerEmail?: string | null;
  corporateNewPassengerPhone?: string | null;
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

function isAllowedStatus(v: any): v is AdminCreateBookingStatus {
  return ADMIN_CREATE_STATUSES.includes(v);
}

export async function adminCreateBooking(input: AdminCreateBookingInput) {
  const session = await auth();

  const role = (session?.user as any)?.role ?? null;
  const roles = ((session?.user as any)?.roles ?? []) as string[];
  const isAdmin = role === "ADMIN" || roles.includes("ADMIN");

  if (!session || !isAdmin) return { error: "Unauthorized" as const };

  // --- basic validation ---
  if (!input.serviceTypeId) return { error: "Missing service." as const };

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

  // --- blackout check ---
  const ymd = ymdInPhoenix(pickupAtDate);
  const blackout = await db.blackoutDate.findUnique({ where: { ymd } });
  if (blackout) return { error: "That date is blacked out." as const };

  // --- service / vehicle ---
  const service = await db.serviceType.findUnique({
    where: { id: input.serviceTypeId },
    include: {
      fees: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!service || !service.active)
    return { error: "Service not available" as const };

  const vehicle = input.vehicleId
    ? await db.vehicle.findUnique({ where: { id: input.vehicleId } })
    : null;

  if (input.vehicleId && (!vehicle || !vehicle.active)) {
    return { error: "Vehicle not available" as const };
  }

  // --- status (runtime guard + default) ---
  if (input.status != null && !isAllowedStatus(input.status)) {
    return { error: "Invalid status." as const };
  }
  const status: AdminCreateBookingStatus = input.status ?? "DRAFT";

  // --- point-to-point distance guard ---
  const distanceMiles = input.distanceMiles ?? null;
  const durationMinutes = input.durationMinutes ?? null;
  const hoursRequested = input.hoursRequested ?? null;

  if (
    service.pricingStrategy === ServicePricingStrategy.POINT_TO_POINT &&
    (!distanceMiles || distanceMiles <= 0)
  ) {
    return {
      error:
        "Missing route distance. Please re-check the route estimate (miles) before submitting.",
    } as const;
  }

  // --- customer resolution ---
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
    // Override with canonical email from DB (more reliable)
    email = (u.email ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email))
      return { error: "Selected user has an invalid email." as const };
  } else if (input.customerKind === "corporate") {
    // Corporate bookings don't require a userId — billing goes to the account.
    // Email is optional, captured for reference only.
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

  // ─── Corporate account handling ───
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

  // --- process stops ---
  const validStops = (input.stops ?? []).filter(
    (s) =>
      s.address?.trim() &&
      s.lat != null &&
      s.lng != null &&
      s.lat !== 0 &&
      s.lng !== 0,
  );
  const stopCount = validStops.length;

  // --- quote ---
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

  // ─── Apply corporate discount ───
  let finalSubtotalCents = quote.breakdown.subtotalCents;
  let finalTotalCents = quote.totalCents;

  if (corporateDiscountPercent && corporateDiscountPercent > 0) {
    const discountCents = Math.round(
      finalTotalCents * (corporateDiscountPercent / 100),
    );
    finalTotalCents = finalTotalCents - discountCents;
    finalSubtotalCents = finalSubtotalCents - discountCents;
  }

  // Parse flight scheduled time if provided
  const flightScheduledAt = input.flightScheduledAt
    ? new Date(input.flightScheduledAt)
    : null;

  // Calculate stop surcharge for storage
  const stopSurchargeCents = stopCount * EXTRA_STOP_FEE_CENTS;

  // --- create booking ---
  const booking = await db.booking.create({
    data: {
      userId: userId ?? undefined,

      guestName: userId ? undefined : guestName,
      guestEmail: userId ? undefined : guestEmail,
      guestPhone: userId ? undefined : guestPhone,

      serviceTypeId: service.id,
      vehicleId: vehicle?.id ?? null,

      status: status as BookingStatus,

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
      flightGate: input.flightGate?.trim().toUpperCase() || null,

      // Stop count and surcharge
      stopCount,
      stopSurchargeCents,

      // Pricing (with corporate discount applied)
      subtotalCents: finalSubtotalCents,
      totalCents: finalTotalCents,

      // Corporate fields
      corporateAccountId: resolvedCorporateAccountId,
      corporatePassengerId: resolvedCorporatePassengerId,
      costCenter: input.costCenter?.trim() || null,
      projectCode: input.projectCode?.trim() || null,

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

      // Create fee snapshots as nested records
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

  // Send notifications for CONFIRMED bookings
  if (status === "CONFIRMED") {
    try {
      await sendAdminNotificationsForBookingEvent({
        event: "BOOKING_REQUESTED",
        bookingId: booking.id,
      });
    } catch (e) {
      // Non-critical — log but don't fail the booking
      console.error("Failed to send admin notifications:", e);
    }
  }

  return {
    success: true as const,
    bookingId: booking.id,
  };
}
