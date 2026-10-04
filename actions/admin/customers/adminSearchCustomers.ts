// actions/admin/customers/adminSearchCustomers.ts
"use server";

import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdminUserId } from "@/lib/sessionUser";

export type CustomerPlace = {
  address: string;
  placeId: string;
  location: { lat: number; lng: number };
};

export type CustomerMatch = {
  key: string;
  /** Set when the person has an account. */
  userId: string | null;
  emailVerified: boolean;
  name: string | null;
  email: string | null;
  phone: string | null;
  bookings: number;
  lastAt: string | null;
  lastStatus: BookingStatus | null;
  /** Their most recent trip, for "Use their last trip". */
  lastTrip: { pickup: CustomerPlace; dropoff: CustomerPlace } | null;
};

const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

type TripRow = {
  createdAt: Date;
  status: BookingStatus;
  pickupAddress: string;
  pickupPlaceId: string | null;
  pickupLat: unknown;
  pickupLng: unknown;
  dropoffAddress: string;
  dropoffPlaceId: string | null;
  dropoffLat: unknown;
  dropoffLng: unknown;
};

function tripOf(b: TripRow | undefined): CustomerMatch["lastTrip"] {
  if (
    !b ||
    b.pickupLat == null ||
    b.pickupLng == null ||
    b.dropoffLat == null ||
    b.dropoffLng == null
  ) {
    return null;
  }
  return {
    pickup: {
      address: b.pickupAddress,
      placeId: b.pickupPlaceId ?? b.pickupAddress,
      location: { lat: Number(b.pickupLat), lng: Number(b.pickupLng) },
    },
    dropoff: {
      address: b.dropoffAddress,
      placeId: b.dropoffPlaceId ?? b.dropoffAddress,
      location: { lat: Number(b.dropoffLat), lng: Number(b.dropoffLng) },
    },
  };
}

const TRIP_SELECT = {
  createdAt: true,
  status: true,
  pickupAddress: true,
  pickupPlaceId: true,
  pickupLat: true,
  pickupLng: true,
  dropoffAddress: true,
  dropoffPlaceId: true,
  dropoffLat: true,
  dropoffLng: true,
} as const;

/**
 * Everyone the system knows who matches what the admin typed: accounts, and
 * guests from every past booking (including declined quotes, cancellations
 * and no-shows). Each person appears once, with their booking history.
 * Admins only.
 */
export async function adminSearchCustomers(input: {
  query: string;
  /** Only people without an account. */
  guestsOnly?: boolean;
}): Promise<{ results: CustomerMatch[] }> {
  if (!(await getAdminUserId())) return { results: [] };
  const q = String(input?.query ?? "")
    .trim()
    .slice(0, 80);
  if (q.length < 2) return { results: [] };
  const qDigits = digits(q);
  const phoneTerm = qDigits.length >= 4 ? qDigits.slice(-4) : null;
  const text = { contains: q, mode: "insensitive" as const };

  const [users, guestRows] = await Promise.all([
    input.guestsOnly
      ? Promise.resolve([])
      : db.user.findMany({
          where: {
            OR: [
              { name: text },
              { email: text },
              ...(phoneTerm ? [{ phone: { contains: phoneTerm } }] : []),
            ],
          },
          take: 12,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            emailVerified: true,
          },
        }),
    db.booking.findMany({
      where: {
        userId: null,
        OR: [
          { guestName: text },
          { guestEmail: text },
          ...(phoneTerm ? [{ guestPhone: { contains: phoneTerm } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        ...TRIP_SELECT,
      },
    }),
  ]);

  const phoneOk = (p?: string | null) =>
    !phoneTerm ||
    !qDigits ||
    digits(p).includes(qDigits) ||
    !/^\D*\d[\d\s().+-]*$/.test(q);
  const people = new Map<string, CustomerMatch & { trips: TripRow[] }>();

  // Accounts, with their bookings.
  const matchedUsers = users.filter(
    (u) =>
      phoneOk(u.phone) ||
      (u.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()),
  );
  const userBookings = matchedUsers.length
    ? await db.booking.findMany({
        where: { userId: { in: matchedUsers.map((u) => u.id) } },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: { userId: true, ...TRIP_SELECT },
      })
    : [];
  for (const u of matchedUsers) {
    const trips = userBookings.filter((b) => b.userId === u.id);
    people.set(u.email.toLowerCase(), {
      key: `user:${u.id}`,
      userId: u.id,
      emailVerified: !!u.emailVerified,
      name: u.name?.trim() || null,
      email: u.email,
      phone: u.phone ?? null,
      bookings: trips.length,
      lastAt: trips[0]?.createdAt.toISOString() ?? null,
      lastStatus: trips[0]?.status ?? null,
      lastTrip: null,
      trips,
    });
  }

  // Guests from past bookings, one entry per email (or phone, or name).
  for (const b of guestRows) {
    if (
      phoneTerm &&
      b.guestPhone &&
      !b.guestName?.toLowerCase().includes(q.toLowerCase()) &&
      !b.guestEmail?.toLowerCase().includes(q.toLowerCase()) &&
      !phoneOk(b.guestPhone)
    ) {
      continue;
    }
    const email = b.guestEmail?.trim().toLowerCase() || null;
    const key =
      email ||
      (digits(b.guestPhone)
        ? `phone:${digits(b.guestPhone).slice(-10)}`
        : `name:${(b.guestName ?? "").trim().toLowerCase()}`);
    const existing = people.get(key);
    if (existing) {
      if (!existing.userId) existing.trips.push(b);
      continue;
    }
    people.set(key, {
      key: `guest:${key}`,
      userId: null,
      emailVerified: false,
      name: b.guestName?.trim() || null,
      email: b.guestEmail?.trim() || null,
      phone: b.guestPhone?.trim() || null,
      bookings: 0,
      lastAt: b.createdAt.toISOString(),
      lastStatus: b.status,
      lastTrip: null,
      trips: [b],
    });
  }

  // Exact counts for guests with an email (the search only looks at recent rows).
  const guestEmails = [...people.values()]
    .filter((p) => !p.userId && p.email)
    .map((p) => p.email!.toLowerCase());
  const counts = guestEmails.length
    ? await db.booking.groupBy({
        by: ["guestEmail"],
        where: {
          userId: null,
          guestEmail: { in: guestEmails, mode: "insensitive" },
        },
        _count: { _all: true },
      })
    : [];
  const countByEmail = new Map(
    counts.map((c) => [(c.guestEmail ?? "").toLowerCase(), c._count._all]),
  );

  const results = [...people.values()]
    .filter((p) => !(input.guestsOnly && p.userId))
    .map(({ trips, ...p }) => ({
      ...p,
      bookings: p.userId
        ? trips.length
        : Math.max(
            trips.length,
            countByEmail.get((p.email ?? "").toLowerCase()) ?? 0,
          ),
      lastTrip: tripOf(trips[0]),
    }))
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""))
    .slice(0, 8);
  return { results };
}
