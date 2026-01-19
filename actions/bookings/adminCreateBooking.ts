/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { calcQuoteCents } from "@/lib/pricing/calcQuote";
import { BookingStatus } from "@prisma/client";

type AdminCreateBookingStatus =
  | "PENDING_REVIEW"
  | "PENDING_PAYMENT"
  | "CONFIRMED";

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

  distanceMiles?: number | null;
  durationMinutes?: number | null;

  hoursRequested?: number | null;

  specialRequests?: string | null;

  status?: AdminCreateBookingStatus;

  customerKind: "account" | "guest";
  customerUserId?: string | null;
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

export async function adminCreateBooking(input: AdminCreateBookingInput) {
  const session = await auth();

  const role = (session?.user as any)?.role ?? null;
  const roles = ((session?.user as any)?.roles ?? []) as string[];
  const isAdmin = role === "ADMIN" || roles.includes("ADMIN");

  if (!session || !isAdmin) return { error: "Unauthorized" as const };

  const pickupAtDate = new Date(input.pickupAt);
  if (!Number.isFinite(pickupAtDate.getTime()))
    return { error: "Invalid pickup time." as const };

  const ymd = ymdInPhoenix(pickupAtDate);
  const blackout = await db.blackoutDate.findUnique({ where: { ymd } });
  if (blackout) return { error: "That date is blacked out." as const };

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

  const status: AdminCreateBookingStatus = input.status ?? "PENDING_REVIEW";

  const email = (input.customerEmail ?? "").trim().toLowerCase();
  if (!email || !isValidEmail(email))
    return { error: "Enter a valid customer email." as const };

  let userId: string | null = null;
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  let guestPhone: string | null = null;

  if (input.customerKind === "account") {
    const id = (input.customerUserId ?? "").trim();
    if (!id) return { error: "Please select an existing user." as const };

    const u = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!u) return { error: "Selected user not found." as const };
    userId = u.id;
  } else {
    const n = (input.customerName ?? "").trim();
    const p = (input.customerPhone ?? "").trim();

    if (!n) return { error: "Enter the guest name." as const };
    if (!p) return { error: "Enter the guest phone." as const };

    guestName = n;
    guestEmail = email;
    guestPhone = p;
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
      userId: userId ?? undefined,

      guestName: userId ? undefined : (guestName ?? undefined),
      guestEmail: userId ? undefined : (guestEmail ?? undefined),
      guestPhone: userId ? undefined : (guestPhone ?? undefined),

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

      distanceMiles: input.distanceMiles ?? null,
      durationMinutes: input.durationMinutes ?? null,

      hoursRequested: quote.requestedHours ?? input.hoursRequested ?? null,
      hoursBilled: quote.billedHours ?? null,

      specialRequests: input.specialRequests ?? null,

      subtotalCents: quote.subtotalCents,
      totalCents: quote.totalCents,
    },
    select: { id: true },
  });

  return {
    success: true as const,
    bookingId: booking.id,
  };
}
