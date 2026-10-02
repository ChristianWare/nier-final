// src/lib/earnings/tripCash.ts
//
// "Record cash payment" on a multi-ride trip saves the money on the trip
// record, not on a payment record, so the earnings page (which adds up
// payment records) never saw it. This finds that money: what the trip says
// was paid beyond what its rides' payment records already hold, dated when
// the trip was marked paid. Card payments are already on the rides, so they
// are never counted twice.

import { db } from "@/lib/db";

type TripForCash = {
  id: string;
  paidAt: Date | null;
  amountPaidCents: number;
  bookings: { payment: { amountPaidCents: number } | null }[];
};

export type TripCashPayment<T extends TripForCash = TripForCash> = {
  tripId: string;
  paidAt: Date;
  cents: number;
  trip: T;
};

export function tripCashFromTrips<T extends TripForCash>(
  trips: T[],
): TripCashPayment<T>[] {
  const out: TripCashPayment<T>[] = [];
  for (const t of trips) {
    if (!t.paidAt) continue;
    const onRides = t.bookings.reduce(
      (sum, b) => sum + (b.payment?.amountPaidCents ?? 0),
      0,
    );
    const cents = (t.amountPaidCents ?? 0) - onRides;
    if (cents > 0) out.push({ tripId: t.id, paidAt: t.paidAt, cents, trip: t });
  }
  return out;
}

/** Cash recorded on trips that were marked paid between fromUtc and toUtc. */
export async function findTripCashPayments(fromUtc: Date, toUtc: Date) {
  const trips = await db.tripGroup.findMany({
    where: { paidAt: { gte: fromUtc, lt: toUtc }, amountPaidCents: { gt: 0 } },
    select: {
      id: true,
      paidAt: true,
      amountPaidCents: true,
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
  });
  return tripCashFromTrips(trips);
}
