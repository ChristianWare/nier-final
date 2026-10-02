// src/lib/earnings/tripCash.ts
//
// "Record cash payment" on a multi-ride trip saves the money on the trip
// record, not on a payment record, so the earnings page (which adds up
// payment records) needs to find it separately.
//
// Only cash that was actually recorded counts: the cash entry the action
// writes on the booking's timeline. (The trip record alone can't be trusted:
// before Sept 30 the old payment code saved each trip's total there with
// the tips mixed in.) The cash received is the trip total that entry
// recorded, minus the fares already paid by card on the trip's rides, and it
// is dated when the cash was recorded.

import { db } from "@/lib/db";

export type CashEntry = {
  tripId: string;
  createdAt: Date;
  amountCents: number;
};

type TripForCash = {
  id: string;
  bookings: { payment: { amountPaidCents: number } | null }[];
};

export type TripCashPayment<T extends TripForCash = TripForCash> = {
  tripId: string;
  paidAt: Date;
  cents: number;
  trip: T;
};

/** Cash received per trip, from its latest cash entry, when that entry falls
 *  between fromUtc and toUtc. Recording cash twice on one trip counts once. */
export function tripCashFromEntries<T extends TripForCash>(
  entries: CashEntry[],
  trips: T[],
  fromUtc: Date,
  toUtc: Date,
): TripCashPayment<T>[] {
  const latest = new Map<string, CashEntry>();
  for (const e of entries) {
    const prev = latest.get(e.tripId);
    if (!prev || e.createdAt > prev.createdAt) latest.set(e.tripId, e);
  }

  const out: TripCashPayment<T>[] = [];
  for (const trip of trips) {
    const entry = latest.get(trip.id);
    if (!entry || entry.createdAt < fromUtc || entry.createdAt >= toUtc) {
      continue;
    }
    const paidByCard = trip.bookings.reduce(
      (sum, b) => sum + (b.payment?.amountPaidCents ?? 0),
      0,
    );
    const cents = Math.max(0, entry.amountCents - paidByCard);
    if (cents > 0) {
      out.push({ tripId: trip.id, paidAt: entry.createdAt, cents, trip });
    }
  }
  return out.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
}

function cashEntriesFrom(
  events: {
    createdAt: Date;
    metadata: unknown;
    booking: { tripGroupId: string | null } | null;
  }[],
): CashEntry[] {
  const entries: CashEntry[] = [];
  for (const e of events) {
    const m = e.metadata as { method?: unknown; amountCents?: unknown } | null;
    const tripId = e.booking?.tripGroupId;
    const amountCents = Number(m?.amountCents);
    if (m?.method !== "cash" || !tripId || !Number.isFinite(amountCents)) {
      continue;
    }
    entries.push({ tripId, createdAt: e.createdAt, amountCents });
  }
  return entries;
}

const EVENT_SELECT = {
  createdAt: true,
  metadata: true,
  booking: { select: { tripGroupId: true } },
} as const;

/** Cash recorded on trips between fromUtc and toUtc. */
export async function findTripCashPayments(fromUtc: Date, toUtc: Date) {
  // Cash entries on trip rides in the period…
  const inPeriod = cashEntriesFrom(
    await db.bookingStatusEvent.findMany({
      where: {
        eventType: "PAYMENT_RECEIVED",
        createdAt: { gte: fromUtc, lt: toUtc },
        booking: { tripGroupId: { not: null } },
      },
      select: EVENT_SELECT,
    }),
  );
  const tripIds = [...new Set(inPeriod.map((e) => e.tripId))];
  if (tripIds.length === 0) return [];

  // …and every cash entry those trips ever had, so only the latest counts.
  const [allEntries, trips] = await Promise.all([
    db.bookingStatusEvent
      .findMany({
        where: {
          eventType: "PAYMENT_RECEIVED",
          booking: { tripGroupId: { in: tripIds } },
        },
        select: EVENT_SELECT,
      })
      .then(cashEntriesFrom),
    db.tripGroup.findMany({
      where: { id: { in: tripIds } },
      select: {
        id: true,
        bookings: {
          orderBy: { pickupAt: "asc" },
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            userId: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            payment: { select: { amountPaidCents: true } },
          },
        },
      },
    }),
  ]);
  return tripCashFromEntries(allEntries, trips, fromUtc, toUtc);
}
