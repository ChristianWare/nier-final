/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import styles from "./DriverDashboardHome.module.css";
import { auth } from "../../../auth";
import { db } from "@/lib/db";

import DriverNextTrip, {
  NextTripData,
} from "@/components/Driver/DriverNextTrip/DriverNextTrip";
import DriverUpcomingRides, {
  UpcomingRideItem,
} from "@/components/Driver/DriverUpcomingRides/DriverUpcomingRides";
import DriverEarningsSnapshot, {
  DriverEarningsChartPoint,
} from "@/components/Driver/DriverEarningsSnapshot/DriverEarningsSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phoenix timezone helpers
const TIMEZONE = "America/Phoenix";

function startOfDayPhoenix(d: Date): Date {
  const str = d.toLocaleDateString("en-US", { timeZone: TIMEZONE });
  const [month, day, year] = str.split("/").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfDayPhoenix(d: Date): Date {
  const str = d.toLocaleDateString("en-US", { timeZone: TIMEZONE });
  const [month, day, year] = str.split("/").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function startOfMonthPhoenix(d: Date): Date {
  const str = d.toLocaleDateString("en-US", { timeZone: TIMEZONE });
  const [month, , year] = str.split("/").map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonthPhoenix(d: Date): Date {
  const str = d.toLocaleDateString("en-US", { timeZone: TIMEZONE });
  const [month, , year] = str.split("/").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatChartLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(d);
}

function formatChartTick(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(d);
}

function getMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

const TERMINAL: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
  BookingStatus.NO_SHOW,
];

async function resolveSessionUserId(session: any): Promise<string | null> {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

// Transform booking to UpcomingRideItem
function toUpcomingRideItem(booking: any): UpcomingRideItem {
  return {
    id: booking.id,
    status: booking.status,
    pickupAtIso: booking.pickupAt.toISOString(),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    serviceName: booking.serviceType?.name || "Trip",
    vehicleName:
      booking.assignment?.vehicleUnit?.name || booking.vehicle?.name || null,
    customerName:
      booking.user?.name?.trim() || booking.guestName?.trim() || "Customer",
    customerPhone: booking.user?.phone || booking.guestPhone || null,
    driverPaymentCents: booking.assignment?.driverPaymentCents ?? null,
    currency: booking.currency || "USD",
    passengers: booking.passengers,
    luggage: booking.luggage,
    specialRequests: booking.specialRequests,
  };
}

// Transform booking to NextTripData
function toNextTripData(booking: any): NextTripData {
  return {
    id: booking.id,
    status: booking.status,
    pickupAtIso: booking.pickupAt.toISOString(),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    serviceName: booking.serviceType?.name || "Trip",
    vehicleName:
      booking.assignment?.vehicleUnit?.name || booking.vehicle?.name || null,
    customerName:
      booking.user?.name?.trim() || booking.guestName?.trim() || "Customer",
    customerPhone: booking.user?.phone || booking.guestPhone || null,
    driverPaymentCents: booking.assignment?.driverPaymentCents ?? null,
    currency: booking.currency || "USD",
    passengers: booking.passengers,
    luggage: booking.luggage,
    specialRequests: booking.specialRequests,
  };
}

export default async function DriverDashboardHome() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverId = await resolveSessionUserId(session);
  if (!driverId) redirect("/");

  const driverName = session.user?.name?.split(" ")[0] || "Driver";

  const now = new Date();
  const todayStart = startOfDayPhoenix(now);
  const todayEnd = endOfDayPhoenix(now);
  const monthStart = startOfMonthPhoenix(now);
  const monthEnd = endOfMonthPhoenix(now);

  // Fetch all upcoming trips (not completed/cancelled)
  const upcomingTrips = await db.booking.findMany({
    where: {
      pickupAt: { gte: todayStart },
      status: { notIn: TERMINAL },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: {
          vehicleUnit: { select: { name: true } },
        },
      },
    },
  });

  // Fetch completed trips this month for earnings
  const completedThisMonth = await db.booking.findMany({
    where: {
      pickupAt: { gte: monthStart, lte: monthEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    select: {
      pickupAt: true,
      assignment: {
        select: { driverPaymentCents: true },
      },
    },
  });

  // Fetch completed trips today for today's earnings count
  const completedToday = await db.booking.count({
    where: {
      pickupAt: { gte: todayStart, lte: todayEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
  });

  // Get actual driver payment for today
  const todayCompletedWithPayments = await db.booking.findMany({
    where: {
      pickupAt: { gte: todayStart, lte: todayEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
    select: {
      assignment: {
        select: { driverPaymentCents: true },
      },
    },
  });

  const todayDriverPaymentsCents = todayCompletedWithPayments.reduce(
    (sum, b) => sum + (b.assignment?.driverPaymentCents ?? 0),
    0,
  );

  // Aggregate daily earnings for chart
  const dailyEarningsMap = new Map<string, { amount: number; count: number }>();

  for (const trip of completedThisMonth) {
    const dateKey = formatDateKey(trip.pickupAt);
    const existing = dailyEarningsMap.get(dateKey) || { amount: 0, count: 0 };
    existing.amount += trip.assignment?.driverPaymentCents ?? 0;
    existing.count += 1;
    dailyEarningsMap.set(dateKey, existing);
  }

  const chartData: DriverEarningsChartPoint[] = Array.from(
    dailyEarningsMap.entries(),
  )
    .map(([dateStr, data]) => {
      const d = new Date(dateStr);
      return {
        key: dateStr,
        tick: formatChartTick(d),
        label: formatChartLabel(d),
        earningsCents: data.amount,
        tripCount: data.count,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  const totalEarningsMonthCents = chartData.reduce(
    (sum, d) => sum + d.earningsCents,
    0,
  );
  const totalTripsMonth = chartData.reduce((sum, d) => sum + d.tripCount, 0);
  const avgPerTripCents =
    totalTripsMonth > 0
      ? Math.round(totalEarningsMonthCents / totalTripsMonth)
      : 0;

  // Transform to component data
  const upcomingRideItems = upcomingTrips.map(toUpcomingRideItem);
  const nextTrip = upcomingTrips[0] ? toNextTripData(upcomingTrips[0]) : null;

  // Stats for header
  const activeCount = upcomingTrips.length;

  return (
    <section className={styles.pageContainer}>
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1 className='heading h2'>Welcome back, {driverName}</h1>
          <p className='subheading'>
            {activeCount > 0
              ? `You have ${activeCount} upcoming trip${activeCount !== 1 ? "s" : ""}`
              : "No upcoming trips scheduled"}
          </p>
        </div>

        <div className={styles.headerKpis}>
          <div className={`${styles.headerKpi} ${styles.headerKpiAccent}`}>
            <span className={styles.headerKpiValue}>{activeCount}</span>
            <span className={styles.headerKpiLabel}>Upcoming</span>
          </div>
          <div className={styles.headerKpi}>
            <span className={styles.headerKpiValue}>{totalTripsMonth}</span>
            <span className={styles.headerKpiLabel}>This Month</span>
          </div>
          <div className={`${styles.headerKpi} ${styles.headerKpiGood}`}>
            <span className={styles.headerKpiValue}>
              ${Math.round(totalEarningsMonthCents / 100)}
            </span>
            <span className={styles.headerKpiLabel}>Earned</span>
          </div>
        </div>
      </header>

      {/* Next Trip */}
      <DriverNextTrip trip={nextTrip} timeZone={TIMEZONE} />

      {/* Upcoming Rides Table */}
      <DriverUpcomingRides items={upcomingRideItems} timeZone={TIMEZONE} />

      {/* Earnings Snapshot with Chart */}
      <DriverEarningsSnapshot
        monthLabel={getMonthLabel(now)}
        currency='USD'
        earningsMonthCents={totalEarningsMonthCents}
        earningsTodayCents={todayDriverPaymentsCents}
        tripCountMonth={totalTripsMonth}
        tripCountToday={completedToday}
        avgPerTripCents={avgPerTripCents}
        chartData={chartData}
      />
    </section>
  );
}
