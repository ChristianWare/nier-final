// src/lib/reports/rideStats.ts
//
// Ride counts for the reports page (and the drivers page): status mix, lead
// time, peak days and hours, and per-driver numbers. Rides are loaded through
// Prisma, so trashed and draft bookings never count, and every date is read
// in the company's time zone.

import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import * as tz from "@/lib/timezone";
import { isPayMissing } from "@/lib/drivers/driverPay";

export type ReportRide = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  createdAt: Date;
  totalCents: number;
  driver: { id: string; name: string; email: string } | null;
  driverPayCents: number | null;
  driverTipCents: number | null;
  /** The driver's pay settings (defaults when there's no profile yet). */
  driverPaidPerRide: boolean;
  driverPayPercent: number | null;
  serviceName: string | null;
  vehicleName: string | null;
  /** This ride's own payment record, and its trip's (for the payment tag). */
  ridePaymentStatus?: PaymentStatus | null;
  trip?: { paymentStatus: PaymentStatus; amountPaidCents: number } | null;
};

/** Rides (not drafts) whose pickup date, or booked date, is in the window.
 *  window null = all time. */
export async function loadReportRides({
  dateField,
  window,
  driverId,
}: {
  dateField: "pickupAt" | "createdAt";
  /** lt omitted = open-ended (e.g. every pickup from now on). */
  window: { gte: Date; lt?: Date } | null;
  /** Only this driver's rides. */
  driverId?: string;
}): Promise<ReportRide[]> {
  const rows = await db.booking.findMany({
    where: {
      status: { not: "DRAFT" as BookingStatus },
      ...(window ? { [dateField]: window } : {}),
      ...(driverId ? { assignment: { driverId } } : {}),
    },
    select: {
      id: true,
      status: true,
      pickupAt: true,
      createdAt: true,
      totalCents: true,
      assignment: {
        select: {
          driverPaymentCents: true,
          driverTipCents: true,
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              driverProfile: {
                select: { payPercent: true, paidPerRide: true },
              },
            },
          },
        },
      },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      payment: { select: { status: true } },
      tripGroup: { select: { paymentStatus: true, amountPaidCents: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    pickupAt: r.pickupAt,
    createdAt: r.createdAt,
    totalCents: r.totalCents,
    driver: r.assignment?.driver
      ? {
          id: r.assignment.driver.id,
          name: r.assignment.driver.name?.trim() || "",
          email: r.assignment.driver.email,
        }
      : null,
    driverPayCents: r.assignment?.driverPaymentCents ?? null,
    driverTipCents: r.assignment?.driverTipCents ?? null,
    driverPaidPerRide: r.assignment?.driver?.driverProfile?.paidPerRide ?? true,
    driverPayPercent: r.assignment?.driver?.driverProfile?.payPercent ?? null,
    serviceName: r.serviceType?.name ?? null,
    vehicleName: r.vehicle?.name ?? null,
    ridePaymentStatus: r.payment?.status ?? null,
    trip: r.tripGroup ?? null,
  }));
}

const LOST: BookingStatus[] = ["CANCELLED", "DECLINED", "REFUNDED"];
const DONE: BookingStatus[] = ["COMPLETED", "PARTIALLY_REFUNDED"];

/** A ride before today that is neither completed nor called off: nobody
 *  closed it out. (Today's rides aren't judged yet.) */
export function isNotClosedOut(r: ReportRide, todayStart: Date) {
  return (
    r.pickupAt < todayStart &&
    !DONE.includes(r.status) &&
    !LOST.includes(r.status) &&
    r.status !== "NO_SHOW"
  );
}

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

export function operationalStats(rides: ReportRide[], todayStart: Date) {
  const byStatus = new Map<BookingStatus, number>();
  for (const r of rides)
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);

  const completed = rides.filter((r) => DONE.includes(r.status)).length;
  const cancelled = rides.filter((r) => r.status === "CANCELLED").length;
  const noShows = rides.filter((r) => r.status === "NO_SHOW").length;
  const open = rides.filter((r) => isNotClosedOut(r, todayStart)).length;

  return {
    total: rides.length,
    byStatus: [...byStatus.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    completed,
    cancelled,
    noShows,
    notClosedOut: open,
    /** Of rides before today that went ahead or should have. */
    completionRate: pct(completed, completed + noShows + open),
    cancellationRate: pct(cancelled, rides.length),
    noShowRate: pct(noShows, completed + noShows),
  };
}

const LEAD_TIME_BUCKETS = [
  "Same Day",
  "1 Day",
  "2 Days",
  "3-6 Days",
  "1-2 Weeks",
  "2-4 Weeks",
  "1+ Month",
] as const;

/** How far ahead rides were booked (same buckets as before). */
export function leadTimeBuckets(rides: ReportRide[]) {
  const counts = new Map<string, number>();
  for (const r of rides) {
    const days = (r.pickupAt.getTime() - r.createdAt.getTime()) / 86_400_000;
    const bucket =
      days < 1
        ? "Same Day"
        : days < 2
          ? "1 Day"
          : days < 3
            ? "2 Days"
            : days < 7
              ? "3-6 Days"
              : days < 14
                ? "1-2 Weeks"
                : days < 30
                  ? "2-4 Weeks"
                  : "1+ Month";
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return LEAD_TIME_BUCKETS.map((name) => ({
    name,
    value: counts.get(name) ?? 0,
  }));
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_BUCKETS = [
  "Morning (6am-12pm)",
  "Afternoon (12-6pm)",
  "Evening (6pm-12am)",
  "Night (12-6am)",
] as const;

function localHour(d: Date, timeZone: string) {
  return (
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(d),
    ) % 24
  );
}

/** Pickup weekday and time of day, in the company's time zone. */
export function peakTimes(rides: ReportRide[], timeZone: string) {
  const days = new Map<number, number>();
  const hours = new Map<string, number>();
  for (const r of rides) {
    const { y, m, d } = tz.toLocalParts(r.pickupAt, timeZone);
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
    days.set(dow, (days.get(dow) ?? 0) + 1);
    const h = localHour(r.pickupAt, timeZone);
    const bucket =
      h < 6
        ? "Night (12-6am)"
        : h < 12
          ? "Morning (6am-12pm)"
          : h < 18
            ? "Afternoon (12-6pm)"
            : "Evening (6pm-12am)";
    hours.set(bucket, (hours.get(bucket) ?? 0) + 1);
  }
  return {
    dayData: DAY_NAMES.map((name, i) => ({ name, value: days.get(i) ?? 0 })),
    hourData: HOUR_BUCKETS.map((name) => ({
      name,
      value: hours.get(name) ?? 0,
    })),
  };
}

export type DriverStatsRow = {
  driverId: string;
  driverName: string;
  driverEmail: string;
  trips: number;
  completed: number;
  upcoming: number;
  notClosedOut: number;
  cancelled: number;
  noShows: number;
  /** completed ÷ rides before today that should have happened (customer
   *  cancellations and no-shows don't count against the driver). */
  completionRate: number | null;
  /** Driver pay + tips recorded on the rides. */
  payCents: number;
  basePayCents: number;
  tipCents: number;
  /** Completed rides with no driver pay recorded (never counted for
   *  drivers who aren't paid per ride). */
  payMissing: number;
  payPercent: number | null;
  paidPerRide: boolean;
};

export function driverStats(rides: ReportRide[], now: Date, todayStart: Date) {
  const rows = new Map<string, DriverStatsRow>();
  for (const r of rides) {
    if (!r.driver) continue;
    const row = rows.get(r.driver.id) ?? {
      driverId: r.driver.id,
      driverName: r.driver.name || r.driver.email.split("@")[0],
      driverEmail: r.driver.email,
      trips: 0,
      completed: 0,
      upcoming: 0,
      notClosedOut: 0,
      cancelled: 0,
      noShows: 0,
      completionRate: null,
      payCents: 0,
      basePayCents: 0,
      tipCents: 0,
      payMissing: 0,
      payPercent: r.driverPayPercent,
      paidPerRide: r.driverPaidPerRide,
    };
    row.trips += 1;
    if (DONE.includes(r.status)) row.completed += 1;
    if (r.status === "CANCELLED") row.cancelled += 1;
    if (r.status === "NO_SHOW") row.noShows += 1;
    if (isNotClosedOut(r, todayStart)) row.notClosedOut += 1;
    if (r.pickupAt >= now && !LOST.includes(r.status)) row.upcoming += 1;
    row.basePayCents += r.driverPayCents ?? 0;
    row.tipCents += r.driverTipCents ?? 0;
    row.payCents += (r.driverPayCents ?? 0) + (r.driverTipCents ?? 0);
    if (
      DONE.includes(r.status) &&
      r.driverPaidPerRide &&
      isPayMissing(r.driverPayCents)
    ) {
      row.payMissing += 1;
    }
    rows.set(r.driver.id, row);
  }
  const list = [...rows.values()].map((row) => ({
    ...row,
    completionRate: pct(row.completed, row.completed + row.notClosedOut),
  }));
  list.sort(
    (a, b) => b.trips - a.trips || a.driverName.localeCompare(b.driverName),
  );
  return list;
}
