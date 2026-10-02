// src/lib/booking/rideCollection.ts
//
// For a set of rides: what they were scheduled to bring in, how much of that
// has been paid, and what is still owed. Used by the bookings page's
// "Collected" card and the earnings page's "Rides with pickups" cards, so the
// two pages always agree.
//
// Counted by the rides themselves (their pickup dates), not by when the money
// came in: money paid in August for a September ride counts for September.

import type { BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { statusGroup } from "@/lib/booking/bookingsChart";

export type CollectionRide = {
  id: string;
  status: BookingStatus;
  totalCents: number;
  tripGroupId: string | null;
  /** Fare paid on this ride's payment record (tips are kept separately). */
  paidCents: number;
  refundedCents: number;
  deleted?: boolean;
};

export type CollectionTrip = {
  id: string;
  /** What the trip record says was paid (cash is recorded here). */
  amountPaidCents: number;
  paymentStatus: string;
  /** Every ride of the trip, including ones outside the period shown. */
  rides: CollectionRide[];
};

export type CollectionSummary = {
  /** Price of the rides, lost and draft rides excluded (tips never count). */
  scheduledCents: number;
  /** Paid toward those rides, never more than their price. */
  collectedCents: number;
  stillOwedCents: number;
  /** collected / scheduled, or null when nothing is scheduled. */
  collectedRate: number | null;
  rides: number;
};

/** Rides that are expected to be paid for: not drafts, not lost. */
function isScheduled(r: { status: BookingStatus }) {
  const g = statusGroup(r.status);
  return g !== null && g !== "lost";
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Share (0 to 1) of a trip's price that has been paid. A trip is one bill,
 *  and its payments can sit on any of its rides or on the trip record. */
function tripPaidShare(trip: CollectionTrip): number {
  const live = trip.rides.filter((r) => !r.deleted);
  const priceCents = live
    .filter(isScheduled)
    .reduce((sum, r) => sum + Math.max(0, r.totalCents || 0), 0);
  if (priceCents <= 0) return 0;
  if (trip.paymentStatus === "PAID") return 1;
  const onRides = live.reduce(
    (sum, r) => sum + Math.max(0, (r.paidCents || 0) - (r.refundedCents || 0)),
    0,
  );
  const paid = Math.max(onRides, trip.amountPaidCents || 0);
  return clamp(paid / priceCents, 0, 1);
}

export function summarizeCollection(
  rides: CollectionRide[],
  trips: Map<string, CollectionTrip>,
): CollectionSummary {
  let scheduled = 0;
  let collected = 0;
  let count = 0;
  const shares = new Map<string, number>();

  for (const r of rides) {
    if (r.deleted || !isScheduled(r)) continue;
    const price = Math.max(0, r.totalCents || 0);
    scheduled += price;
    count += 1;

    const trip = r.tripGroupId ? trips.get(r.tripGroupId) : undefined;
    if (!trip) {
      collected += clamp((r.paidCents || 0) - (r.refundedCents || 0), 0, price);
      continue;
    }
    // The trip's payments are spread across its rides by price, so a trip
    // that crosses two months counts correctly in each.
    if (!shares.has(trip.id)) shares.set(trip.id, tripPaidShare(trip));
    collected += price * shares.get(trip.id)!;
  }

  const collectedCents = Math.min(scheduled, Math.round(collected));
  return {
    scheduledCents: scheduled,
    collectedCents,
    stillOwedCents: scheduled - collectedCents,
    collectedRate: scheduled > 0 ? collectedCents / scheduled : null,
    rides: count,
  };
}

const PAYMENT_SELECT = {
  select: { amountPaidCents: true, amountRefundedCents: true },
} as const;

type RideRow = {
  id: string;
  status: BookingStatus;
  totalCents: number;
  tripGroupId: string | null;
  deletedAt?: Date | null;
  payment?: { amountPaidCents: number; amountRefundedCents: number } | null;
};

export function toCollectionRide(b: RideRow): CollectionRide {
  return {
    id: b.id,
    status: b.status,
    totalCents: b.totalCents,
    tripGroupId: b.tripGroupId,
    paidCents: b.payment?.amountPaidCents ?? 0,
    refundedCents: b.payment?.amountRefundedCents ?? 0,
    deleted: !!b.deletedAt,
  };
}

/** The trips (with all of their rides) behind a set of rides. */
export async function loadTripsForCollection(
  tripIds: (string | null)[],
): Promise<Map<string, CollectionTrip>> {
  const ids = [...new Set(tripIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return new Map();
  const groups = await db.tripGroup.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      amountPaidCents: true,
      paymentStatus: true,
      bookings: {
        select: {
          id: true,
          status: true,
          totalCents: true,
          tripGroupId: true,
          deletedAt: true,
          payment: PAYMENT_SELECT,
        },
      },
    },
  });
  return new Map(
    groups.map((g) => [
      g.id,
      {
        id: g.id,
        amountPaidCents: g.amountPaidCents,
        paymentStatus: String(g.paymentStatus),
        rides: g.bookings.map(toCollectionRide),
      },
    ]),
  );
}

/** Scheduled / collected / still owed for the rides matching `where`. */
export async function loadCollection(
  where: Prisma.BookingWhereInput,
): Promise<CollectionSummary> {
  const rides = await db.booking.findMany({
    where: { AND: [where, { status: { not: "DRAFT" as BookingStatus } }] },
    select: {
      id: true,
      status: true,
      totalCents: true,
      tripGroupId: true,
      payment: PAYMENT_SELECT,
    },
  });
  const trips = await loadTripsForCollection(rides.map((r) => r.tripGroupId));
  return summarizeCollection(rides.map(toCollectionRide), trips);
}
