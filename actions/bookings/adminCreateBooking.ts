/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents } from "@/lib/pricing/calcQuote";
import { BookingStatus } from "@prisma/client";

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

  // ✅ Extra stops
  stops?: StopInput[];

  distanceMiles?: number | null;
  durationMinutes?: number | null;

  hoursRequested?: number | null;

  specialRequests?: string | null;

  // ✅ optional incoming status
  status?: AdminCreateBookingStatus;

  customerKind: "account" | "guest";
  customerUserId?: string | null;

  // note: for "account", we'll override this with the user's email for safety
  customerEmail: string;

  customerName?: string | null;
  customerPhone?: string | null;
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
  });
  if (!service || !service.active)
    return { error: "Service not available" as const };

  const vehicle = input.vehicleId
    ? await db.vehicle.findUnique({ where: { id: input.vehicleId } })
    : null;

  if (input.vehicleId && (!vehicle || !vehicle.active)) {
    return { error: "Vehicle not available" as const };
  }

  // ✅ status (runtime guard + default)
  if (input.status != null && !isAllowedStatus(input.status)) {
    return { error: "Invalid status." as const };
  }
  const status: AdminCreateBookingStatus = input.status ?? "DRAFT";

  // --- customer ---
  let userId: string | null = null;
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  let guestPhone: string | null = null;

  // we will finalize `email` depending on customerKind
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

    // ✅ override with canonical email from DB (more reliable)
    email = (u.email ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email))
      return { error: "Selected user has an invalid email." as const };
  } else {
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

  // ✅ Process stops - filter to only valid ones
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
    distanceMiles: input.distanceMiles ?? null,
    durationMinutes: input.durationMinutes ?? null,
    hoursRequested: input.hoursRequested ?? null,
    stopCount, // ✅ Pass stop count for pricing
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
      userId: userId ?? undefined,

      guestName: userId ? undefined : (guestName ?? undefined),
      guestEmail: userId ? undefined : (guestEmail ?? undefined),
      guestPhone: userId ? undefined : (guestPhone ?? undefined),

      serviceTypeId: service.id,
      vehicleId: vehicle?.id ?? null,

      // ✅ allowed subset cast to Prisma enum
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

      // ✅ Create stops as nested records
      stops: {
        create: validStops.map((stop, index) => ({
          stopOrder: index + 1,
          address: stop.address.trim(),
          placeId: stop.placeId ?? null,
          lat: stop.lat ?? null,
          lng: stop.lng ?? null,
          waitTimeMinutes: 5,
        })),
      },

      // ✅ Store stop count and surcharge
      stopCount,
      stopSurchargeCents: quote.breakdown.stopSurchargeCents,

      distanceMiles: input.distanceMiles ?? null,
      durationMinutes: input.durationMinutes ?? null,

      hoursRequested: quote.requestedHours ?? input.hoursRequested ?? null,
      hoursBilled: quote.billedHours ?? null,

      specialRequests: input.specialRequests ?? null,

      // ✅ FIX: Access subtotalCents from the breakdown object
      subtotalCents: quote.breakdown.subtotalCents,
      totalCents: quote.totalCents,
    },
    select: { id: true },
  });

  return {
    success: true as const,
    bookingId: booking.id,
  };
}
