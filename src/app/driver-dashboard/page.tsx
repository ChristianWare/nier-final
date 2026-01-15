/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import styles from "./DriverDashboardHome.module.css";
import { auth } from "../../../auth";
import { db } from "@/lib/db";

import DriverOverview from "@/components/Driver/DriverOverview/DriverOverview";
import DriverPageIntro from "@/components/Driver/DriverPageIntro/DriverPageIntro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function startOfWeekSunday(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

const TERMINAL: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
  BookingStatus.NO_SHOW,
];

export default async function DriverDashboardHome() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverId = session.user?.id;
  if (!driverId) redirect("/");

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const upcomingEnd = endOfDay(addDays(now, 7));
  const completed30Start = startOfDay(addDays(now, -30));

  const activeAssignedCount = await db.booking.count({
    where: {
      status: { notIn: TERMINAL },
      assignment: { driverId },
    },
  });

  const completed30DaysCount = await db.booking.count({
    where: {
      pickupAt: { gte: completed30Start, lte: todayEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
  });

  const activeTrips = await db.booking.findMany({
    where: {
      status: { notIn: TERMINAL },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    take: 25,
    select: {
      id: true,
      status: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      passengers: true,
      luggage: true,
      specialRequests: true,
      internalNotes: true,
      totalCents: true,
      serviceType: { select: { name: true, slug: true } },
      vehicle: { select: { name: true } },
      user: { select: { name: true, email: true } },
      assignment: {
        select: {
          vehicleUnit: { select: { name: true, plate: true } },
        },
      },
      addons: { select: { type: true, quantity: true } },
    },
  });

  const nextTrip = activeTrips[0] ?? null;

  const todayTrips = await db.booking.findMany({
    where: {
      pickupAt: { gte: todayStart, lte: todayEnd },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    take: 50,
    select: {
      id: true,
      status: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      serviceType: { select: { name: true } },
    },
  });

  const upcoming7DaysCount = await db.booking.count({
    where: {
      pickupAt: { gt: now, lte: upcomingEnd },
      status: { notIn: TERMINAL },
      assignment: { driverId },
    },
  });

  const weekStart = startOfWeekSunday(now);
  const weekTotals = await db.booking.aggregate({
    where: {
      pickupAt: { gte: weekStart, lte: todayEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
    _sum: { totalCents: true },
  });

  const statusEvents = await db.bookingStatusEvent.findMany({
    where: {
      booking: { assignment: { driverId } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      createdAt: true,
      bookingId: true,
      createdBy: { select: { name: true } },
      booking: {
        select: {
          pickupAt: true,
          pickupAddress: true,
          dropoffAddress: true,
        },
      },
    },
  });

  return (
    <section className={styles.container}>
      <DriverPageIntro
        assigned={activeAssignedCount}
        upcoming={upcoming7DaysCount}
        completed={completed30DaysCount}
      />

      <DriverOverview
        nextTrip={nextTrip}
        todayTrips={todayTrips}
        alerts={statusEvents.map((e) => ({
          id: e.id,
          createdAt: e.createdAt,
          title: `Trip updated: ${String(e.status).replaceAll("_", " ")}`,
          body: `${e.createdBy?.name ?? "Dispatch"} • ${e.booking.pickupAddress} → ${e.booking.dropoffAddress}`,
          href: `/driver-dashboard/trips/${e.bookingId}`,
        }))}
        kpis={{
          tripsToday: todayTrips.length,
          upcoming7Days: upcoming7DaysCount,
          onTimeRate30Days: "—",
          earningsWeek: weekTotals._sum.totalCents
            ? `$${(weekTotals._sum.totalCents / 100).toFixed(2)}`
            : "—",
        }}
      />
    </section>
  );
}
