/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";

import styles from "./DriverDashboardHome.module.css";
import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../actions/admin/companySettings";

import DriverNextTrip, {
  NextTripData,
} from "@/components/Driver/DriverNextTrip/DriverNextTrip";
import DriverUpcomingRides, {
  UpcomingRideItem,
} from "@/components/Driver/DriverUpcomingRides/DriverUpcomingRides";
import DriverEarningsSnapshot, {
  DriverEarningsChartPoint,
} from "@/components/Driver/DriverEarningsSnapshot/DriverEarningsSnapshot";
import DriverRideCalendar from "@/components/Driver/DriverRideCalendar/DriverRideCalendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDay(d: Date, timeZone: string): Date {
  const str = d.toLocaleDateString("en-US", { timeZone });
  const [month, day, year] = str.split("/").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfDay(d: Date, timeZone: string): Date {
  const str = d.toLocaleDateString("en-US", { timeZone });
  const [month, day, year] = str.split("/").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function startOfWeek(d: Date, timeZone: string): Date {
  const str = d.toLocaleDateString("en-US", { timeZone });
  const [month, day, year] = str.split("/").map(Number);
  const local = new Date(year, month - 1, day);
  const dow = local.getDay(); // 0 = Sunday
  local.setDate(local.getDate() - dow);
  return new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    0,
    0,
    0,
    0,
  );
}

function endOfWeek(d: Date, timeZone: string): Date {
  const str = d.toLocaleDateString("en-US", { timeZone });
  const [month, day, year] = str.split("/").map(Number);
  const local = new Date(year, month - 1, day);
  const dow = local.getDay(); // 0 = Sunday
  local.setDate(local.getDate() + (6 - dow)); // Saturday
  return new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    23,
    59,
    59,
    999,
  );
}

function startOfMonth(d: Date, timeZone: string): Date {
  const str = d.toLocaleDateString("en-US", { timeZone });
  const [month, , year] = str.split("/").map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date, timeZone: string): Date {
  const str = d.toLocaleDateString("en-US", { timeZone });
  const [month, , year] = str.split("/").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function formatDateKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatChartLabel(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(d);
}

function formatChartTick(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(d);
}

function getMonthLabel(d: Date, timeZone: string): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone,
  });
}

function monthKey(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

function ymdInTimezone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
  const { timezone: companyTz } = await getCompanySettings();

  const todayStart = startOfDay(now, companyTz);
  const todayEnd = endOfDay(now, companyTz);
  const weekStart = startOfWeek(now, companyTz);
  const weekEnd = endOfWeek(now, companyTz);
  const mStart = startOfMonth(now, companyTz);
  const mEnd = endOfMonth(now, companyTz);

  // Month boundaries for calendar (get 3 months of data for smooth navigation)
  const calendarStart = new Date(mStart);
  calendarStart.setMonth(calendarStart.getMonth() - 1);
  const calendarEnd = new Date(mEnd);
  calendarEnd.setMonth(calendarEnd.getMonth() + 2);

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

  // Fetch completed trips this month for earnings (include tips)
  const completedThisMonth = await db.booking.findMany({
    where: {
      pickupAt: { gte: mStart, lte: mEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    select: {
      pickupAt: true,
      assignment: {
        select: { driverPaymentCents: true, driverTipCents: true },
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

  // Get actual driver payment for today (base + tips)
  const todayCompletedWithPayments = await db.booking.findMany({
    where: {
      pickupAt: { gte: todayStart, lte: todayEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
    select: {
      assignment: {
        select: { driverPaymentCents: true, driverTipCents: true },
      },
    },
  });

  const todayDriverPaymentsCents = todayCompletedWithPayments.reduce(
    (sum, b) =>
      sum +
      (b.assignment?.driverPaymentCents ?? 0) +
      (b.assignment?.driverTipCents ?? 0),
    0,
  );

  // ── Weekly stats ──────────────────────────────────────────────────
  const weeklyTripsCount = await db.booking.count({
    where: {
      pickupAt: { gte: weekStart, lte: weekEnd },
      status: { notIn: TERMINAL },
      assignment: { driverId },
    },
  });

  // Weekly completed trips with driver payments (include tips)
  const weeklyCompletedWithPayments = await db.booking.findMany({
    where: {
      pickupAt: { gte: weekStart, lte: weekEnd },
      status: BookingStatus.COMPLETED,
      assignment: { driverId },
    },
    select: {
      assignment: {
        select: { driverPaymentCents: true, driverTipCents: true },
      },
    },
  });

  const weeklyEarningsCents = weeklyCompletedWithPayments.reduce(
    (sum, b) =>
      sum +
      (b.assignment?.driverPaymentCents ?? 0) +
      (b.assignment?.driverTipCents ?? 0),
    0,
  );

  const weeklyTipsCents = weeklyCompletedWithPayments.reduce(
    (sum, b) => sum + (b.assignment?.driverTipCents ?? 0),
    0,
  );

  const weeklyBaseCents = weeklyEarningsCents - weeklyTipsCents;

  const weeklyCompletedCount = weeklyCompletedWithPayments.length;

  // Fetch all trips for calendar (assigned to this driver)
  const calendarTrips = await db.booking.findMany({
    where: {
      pickupAt: { gte: calendarStart, lte: calendarEnd },
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.REFUNDED,
          BookingStatus.NO_SHOW,
        ],
      },
      assignment: { driverId },
    },
    select: { pickupAt: true },
  });

  // Build countsByYmd for calendar
  const countsByYmd: Record<string, number> = {};
  for (const trip of calendarTrips) {
    const ymd = ymdInTimezone(trip.pickupAt, companyTz);
    countsByYmd[ymd] = (countsByYmd[ymd] ?? 0) + 1;
  }

  // Aggregate daily earnings for chart (base + tips)
  const dailyEarningsMap = new Map<
    string,
    { base: number; tips: number; count: number }
  >();

  for (const trip of completedThisMonth) {
    const dateKey = formatDateKey(trip.pickupAt, companyTz);
    const existing = dailyEarningsMap.get(dateKey) || {
      base: 0,
      tips: 0,
      count: 0,
    };
    existing.base += trip.assignment?.driverPaymentCents ?? 0;
    existing.tips += trip.assignment?.driverTipCents ?? 0;
    existing.count += 1;
    dailyEarningsMap.set(dateKey, existing);
  }

  const chartData: DriverEarningsChartPoint[] = Array.from(
    dailyEarningsMap.entries(),
  )
    .map(([dateStr, data]) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      return {
        key: dateStr,
        tick: formatChartTick(d, companyTz),
        label: formatChartLabel(d, companyTz),
        earningsCents: data.base + data.tips,
        tripCount: data.count,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  const totalEarningsMonthCents = chartData.reduce(
    (sum, d) => sum + d.earningsCents,
    0,
  );

  const totalTipsMonthCents = completedThisMonth.reduce(
    (sum, b) => sum + (b.assignment?.driverTipCents ?? 0),
    0,
  );

  const monthlyBaseCents = totalEarningsMonthCents - totalTipsMonthCents;

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

  // Calendar props
  const baseMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0),
  );

  return (
    <section className={styles.pageContainer}>
      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div className='header'>
          <h1 className='heading h2'>Welcome back, {driverName} (Driver)</h1>
        </div>

        <div className={styles.headerKpiRows}>
          {/* Weekly Stats */}
          <span className={styles.headerKpiRowLabel}>This Week</span>
          <div className={styles.headerKpis}>
            <div className={`${styles.headerKpi} ${styles.headerKpiAccent}`}>
              <span className={styles.headerKpiValue}>{weeklyTripsCount}</span>
              <span className={styles.headerKpiLabel}>Upcoming</span>
            </div>
            <div className={styles.headerKpi}>
              <span className={styles.headerKpiValue}>
                {weeklyCompletedCount}
              </span>
              <span className={styles.headerKpiLabel}>Completed</span>
            </div>
            <div className={styles.headerKpi}>
              <span className={styles.headerKpiValue}>
                ${Math.round(weeklyBaseCents / 100)}
              </span>
              <span className={styles.headerKpiLabel}>Base Pay</span>
            </div>
            <div className={`${styles.headerKpi} ${styles.headerKpiGood}`}>
              <span className={styles.headerKpiValue}>
                ${Math.round(weeklyTipsCents / 100)}
              </span>
              <span className={styles.headerKpiLabel}>Tips</span>
            </div>
            <div className={`${styles.headerKpi} ${styles.headerKpiGood}`}>
              <span className={styles.headerKpiValue}>
                ${Math.round(weeklyEarningsCents / 100)}
              </span>
              <span className={styles.headerKpiLabel}>Total Earned</span>
            </div>
          </div>

          {/* Monthly Stats */}
          <span
            className={`${styles.headerKpiRowLabel} ${styles.headerKpiRowLabelMonthly}`}
          >
            This Month
          </span>
          <div className={styles.headerKpis}>
            <div className={`${styles.headerKpi} ${styles.headerKpiAccent}`}>
              <span className={styles.headerKpiValue}>{activeCount}</span>
              <span className={styles.headerKpiLabel}>Upcoming</span>
            </div>
            <div className={styles.headerKpi}>
              <span className={styles.headerKpiValue}>{totalTripsMonth}</span>
              <span className={styles.headerKpiLabel}>Completed</span>
            </div>
            <div className={styles.headerKpi}>
              <span className={styles.headerKpiValue}>
                ${Math.round(monthlyBaseCents / 100)}
              </span>
              <span className={styles.headerKpiLabel}>Base Pay</span>
            </div>
            <div className={`${styles.headerKpi} ${styles.headerKpiGood}`}>
              <span className={styles.headerKpiValue}>
                ${Math.round(totalTipsMonthCents / 100)}
              </span>
              <span className={styles.headerKpiLabel}>Tips</span>
            </div>
            <div className={`${styles.headerKpi} ${styles.headerKpiGood}`}>
              <span className={styles.headerKpiValue}>
                ${Math.round(totalEarningsMonthCents / 100)}
              </span>
              <span className={styles.headerKpiLabel}>Total Earned</span>
            </div>
          </div>
        </div>
      </header>

      {/* Next Trip */}
      <DriverNextTrip trip={nextTrip} timeZone={companyTz} />

      {/* Calendar */}
      <DriverRideCalendar
        initialMonth={monthKey(baseMonth, companyTz)}
        countsByYmd={countsByYmd}
        todayYmd={ymdInTimezone(now, companyTz)}
        timeZone={companyTz}
      />

      {/* Upcoming Rides Table */}
      <DriverUpcomingRides items={upcomingRideItems} timeZone={companyTz} />

      {/* Earnings Snapshot with Chart */}
      <DriverEarningsSnapshot
        monthLabel={getMonthLabel(now, companyTz)}
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
