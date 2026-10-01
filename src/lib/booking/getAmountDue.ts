// src/lib/booking/getAmountDue.ts
import { db } from "@/lib/db";

/**
 * What a customer still owes on a booking.
 *
 * This is the ONE place that answers "how much is left to pay?". Anything that
 * shows an amount on a charge button and anything that actually charges a card
 * should call this, so the two can never disagree.
 *
 * - Single ride: the ride's total minus what has been collected on it.
 * - Multi-ride trip (TripGroup): the customer pays the trip as one bill, so it
 *   is the total of every ride in the trip minus what has been collected
 *   toward the trip. It does not matter which ride's page you are on.
 */
export type AmountDue = {
  bookingId: string;
  /** Set when the booking is one ride of a multi-ride trip. */
  tripGroupId: string | null;
  isGroup: boolean;
  /** Rides the total covers (1 for a single booking). */
  rideCount: number;
  /** As stored on the booking, e.g. "usd". */
  currency: string;
  /** Full price: this ride, or every ride in the trip added together. */
  totalCents: number;
  /** Collected so far toward that total. */
  paidCents: number;
  /** Still owed. Never negative. */
  balanceCents: number;
};

function toCents(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export async function getAmountDue(
  bookingId: string,
): Promise<AmountDue | null> {
  if (!bookingId) return null;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      totalCents: true,
      currency: true,
      tripGroupId: true,
      payment: { select: { amountPaidCents: true } },
    },
  });
  if (!booking) return null;

  const currency = (booking.currency || "usd").toLowerCase();

  // ── Single ride ───────────────────────────────────────────────────────────
  if (!booking.tripGroupId) {
    const totalCents = toCents(booking.totalCents);
    const paidCents = toCents(booking.payment?.amountPaidCents);
    return {
      bookingId: booking.id,
      tripGroupId: null,
      isGroup: false,
      rideCount: 1,
      currency,
      totalCents,
      paidCents,
      balanceCents: Math.max(0, totalCents - paidCents),
    };
  }

  // ── Multi-ride trip ───────────────────────────────────────────────────────
  const group = await db.tripGroup.findUnique({
    where: { id: booking.tripGroupId },
    select: {
      paymentStatus: true,
      amountPaidCents: true,
      bookings: {
        select: {
          totalCents: true,
          deletedAt: true,
          payment: { select: { amountPaidCents: true } },
        },
      },
    },
  });

  const rides = group?.bookings ?? [];
  // A ride sitting in the Trash is not billed...
  const billable = rides.filter((r) => !r.deletedAt);
  const totalCents = billable.reduce(
    (sum, r) => sum + toCents(r.totalCents),
    0,
  );
  // ...but money already collected on it still counts as collected.
  const paidOnRidesCents = rides.reduce(
    (sum, r) => sum + toCents(r.payment?.amountPaidCents),
    0,
  );
  const paidOnTripCents = toCents(group?.amountPaidCents);

  // "Collected so far" is kept in two places: on the trip record and on each
  // ride's payment record. They should agree. Where they don't (older
  // payments: a deposit paid with a tip used to be recorded short on the
  // ride, and cash is only recorded on the trip), take the LARGER of the two,
  // so this never reports more owed than either one does: when in doubt,
  // charge less.
  let paidCents = Math.max(paidOnRidesCents, paidOnTripCents);

  // Cash is recorded on the trip itself (paymentStatus = PAID), not on the
  // individual rides, so a trip marked PAID owes nothing.
  if (group?.paymentStatus === "PAID") {
    paidCents = Math.max(paidCents, totalCents);
  }

  return {
    bookingId: booking.id,
    tripGroupId: booking.tripGroupId,
    isGroup: true,
    rideCount: billable.length,
    currency,
    totalCents,
    paidCents,
    balanceCents: Math.max(0, totalCents - paidCents),
  };
}
