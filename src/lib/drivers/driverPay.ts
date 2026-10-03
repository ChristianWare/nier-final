// src/lib/drivers/driverPay.ts
//
// Driver pay rules:
// - Each driver can have a default pay percentage. When a ride is completed
//   and no pay was entered, pay = the ride's full price (fees and taxes
//   included) × that percentage.
// - Tips go to the driver in full. A tip paid for a whole trip is split across
//   the trip's rides by price.
// - Pay entered on a ride is never overwritten.
// - Drivers marked "not paid per ride" (owners, salaried drivers) never get
//   pay filled in.

import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";

/** Rides that earn driver pay. */
export const PAYABLE_STATUSES: BookingStatus[] = [
  "COMPLETED",
  "PARTIALLY_REFUNDED",
];

/** Rides that don't take part in a trip's tip split. */
const CALLED_OFF: BookingStatus[] = [
  "CANCELLED",
  "DECLINED",
  "REFUNDED",
  "NO_SHOW",
  "DRAFT",
];

/** No pay recorded (the app treats 0 the same way). */
export function isPayMissing(cents: number | null | undefined): boolean {
  return cents == null || cents === 0;
}

export function defaultDriverPayCents(
  rideTotalCents: number,
  payPercent: number,
): number {
  return Math.max(0, Math.round((rideTotalCents * payPercent) / 100));
}

/** Split `total` cents across `weights`; the parts always add up to total. */
export function allocateCents(total: number, weights: number[]): number[] {
  const w = weights.map((x) => Math.max(0, x || 0));
  const sum = w.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return w.map(() => 0);
  const raw = w.map((x) => (total * x) / sum);
  const parts = raw.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - parts[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const o of order) {
    if (left <= 0) break;
    parts[o.i] += 1;
    left -= 1;
  }
  return parts;
}

export type PayRide = {
  id: string;
  status: BookingStatus;
  totalCents: number;
  tripGroupId: string | null;
  /** Tip recorded on this ride's own payment record. */
  tipCents: number;
  assignment: {
    id: string;
    driverId: string;
    driverPaymentCents: number | null;
    driverTipCents: number | null;
  } | null;
  /** The assigned driver's pay settings (null = no profile yet). */
  profile: { payPercent: number | null; paidPerRide: boolean } | null;
};

export type PayPlanRow = {
  bookingId: string;
  assignmentId: string;
  driverId: string;
  totalCents: number;
  payPercent: number | null;
  currentPayCents: number | null;
  /** Pay to fill in, or null to leave pay as it is. */
  newPayCents: number | null;
  pay: "fill" | "kept" | "no_rate" | "not_paid_per_ride";
  currentTipCents: number | null;
  /** The tip that belongs to this ride's driver. */
  tipCents: number;
};

/** Tips that belong to each ride, by ride id. */
function tipsByRide(rides: PayRide[]): Map<string, number> {
  const out = new Map<string, number>();
  const trips = new Map<string, PayRide[]>();
  for (const r of rides) {
    if (!r.tripGroupId) {
      out.set(r.id, Math.max(0, r.tipCents || 0));
      continue;
    }
    const list = trips.get(r.tripGroupId) ?? [];
    list.push(r);
    trips.set(r.tripGroupId, list);
  }
  for (const list of trips.values()) {
    const tripTips = list.reduce((s, r) => s + Math.max(0, r.tipCents || 0), 0);
    const sharing = list.filter((r) => !CALLED_OFF.includes(r.status));
    const parts = allocateCents(
      tripTips,
      sharing.map((r) => r.totalCents),
    );
    sharing.forEach((r, i) => out.set(r.id, parts[i]));
    for (const r of list) if (!out.has(r.id)) out.set(r.id, 0);
  }
  return out;
}

/**
 * What each completed ride's driver should be paid. `rides` must include
 * every ride of any trip involved (tips are split across the whole trip).
 * Only rides listed in `targetIds` (or all, when omitted) are planned.
 */
export function planDriverPay(
  rides: PayRide[],
  targetIds?: string[],
): PayPlanRow[] {
  const tips = tipsByRide(rides);
  const targets = targetIds ? new Set(targetIds) : null;
  const rows: PayPlanRow[] = [];
  for (const r of rides) {
    if (targets && !targets.has(r.id)) continue;
    if (!r.assignment || !PAYABLE_STATUSES.includes(r.status)) continue;
    const paidPerRide = r.profile?.paidPerRide ?? true;
    const payPercent = r.profile?.payPercent ?? null;
    const current = r.assignment.driverPaymentCents;

    let pay: PayPlanRow["pay"];
    let newPayCents: number | null = null;
    if (!paidPerRide) pay = "not_paid_per_ride";
    else if (!isPayMissing(current)) pay = "kept";
    else if (payPercent == null) pay = "no_rate";
    else {
      pay = "fill";
      newPayCents = defaultDriverPayCents(r.totalCents, payPercent);
    }

    rows.push({
      bookingId: r.id,
      assignmentId: r.assignment.id,
      driverId: r.assignment.driverId,
      totalCents: r.totalCents,
      payPercent,
      currentPayCents: current,
      newPayCents,
      pay,
      currentTipCents: r.assignment.driverTipCents,
      tipCents: tips.get(r.id) ?? 0,
    });
  }
  return rows;
}

const RIDE_SELECT = {
  id: true,
  status: true,
  totalCents: true,
  tripGroupId: true,
  payment: { select: { tipCents: true } },
  assignment: {
    select: {
      id: true,
      driverId: true,
      driverPaymentCents: true,
      driverTipCents: true,
      driver: {
        select: {
          driverProfile: { select: { payPercent: true, paidPerRide: true } },
        },
      },
    },
  },
} as const;

type RideRow = {
  id: string;
  status: BookingStatus;
  totalCents: number;
  tripGroupId: string | null;
  payment: { tipCents: number } | null;
  assignment: {
    id: string;
    driverId: string;
    driverPaymentCents: number | null;
    driverTipCents: number | null;
    driver: {
      driverProfile: { payPercent: number | null; paidPerRide: boolean } | null;
    } | null;
  } | null;
};

function toPayRide(r: RideRow): PayRide {
  return {
    id: r.id,
    status: r.status,
    totalCents: r.totalCents,
    tripGroupId: r.tripGroupId,
    tipCents: r.payment?.tipCents ?? 0,
    assignment: r.assignment
      ? {
          id: r.assignment.id,
          driverId: r.assignment.driverId,
          driverPaymentCents: r.assignment.driverPaymentCents,
          driverTipCents: r.assignment.driverTipCents,
        }
      : null,
    profile: r.assignment?.driver?.driverProfile ?? null,
  };
}

/** The given rides plus every ride of their trips. */
async function loadRidesWithTrips(bookingIds: string[]): Promise<PayRide[]> {
  if (bookingIds.length === 0) return [];
  const first = (await db.booking.findMany({
    where: { id: { in: bookingIds } },
    select: RIDE_SELECT,
  })) as RideRow[];
  const tripIds = [
    ...new Set(first.map((r) => r.tripGroupId).filter(Boolean)),
  ] as string[];
  const siblings = tripIds.length
    ? ((await db.booking.findMany({
        where: { tripGroupId: { in: tripIds }, id: { notIn: bookingIds } },
        select: RIDE_SELECT,
      })) as RideRow[])
    : [];
  return [...first, ...siblings].map(toPayRide);
}

/** Plan for the given rides (and their trips' completed rides). */
export async function loadPayPlan(bookingIds: string[]): Promise<PayPlanRow[]> {
  return planDriverPay(await loadRidesWithTrips(bookingIds));
}

/**
 * Fills in missing driver pay and brings tips up to date for the given rides
 * and the other completed rides of their trips. Safe to call any time: pay
 * that is already recorded is never changed.
 */
export async function syncDriverPay(
  bookingIds: string[],
): Promise<{ payFilled: number; tipsUpdated: number }> {
  const plan = await loadPayPlan(bookingIds);
  let payFilled = 0;
  let tipsUpdated = 0;
  for (const row of plan) {
    if (row.newPayCents != null) {
      // Only if pay is still missing at this moment.
      const res = await db.assignment.updateMany({
        where: {
          id: row.assignmentId,
          OR: [{ driverPaymentCents: null }, { driverPaymentCents: 0 }],
        },
        data: { driverPaymentCents: row.newPayCents },
      });
      payFilled += res.count;
    }
    if (
      row.tipCents !== (row.currentTipCents ?? 0) ||
      row.currentTipCents == null
    ) {
      await db.assignment.update({
        where: { id: row.assignmentId },
        data: { driverTipCents: row.tipCents },
      });
      tipsUpdated += 1;
    }
  }
  return { payFilled, tipsUpdated };
}

/** Best-effort sync after a status change or payment; never throws. */
export async function syncDriverPaySafely(bookingIds: string[]): Promise<void> {
  try {
    await syncDriverPay(bookingIds);
  } catch (e) {
    console.error("Failed to update driver pay:", e);
  }
}
