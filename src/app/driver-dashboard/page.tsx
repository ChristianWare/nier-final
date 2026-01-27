/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import Link from "next/link";

import styles from "./DriverDashboardHome.module.css";
import { auth } from "../../../auth";
import { db } from "@/lib/db";

import DriverTripsSnapshot, {
  TripItem,
} from "@/components/Driver/DriverTripsSnapshot/DriverTripsSnapshot";
import DriverEarningsChart, {
  DailyEarning,
} from "@/components/Driver/DriverEarningsChart/DriverEarningsChart";

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

function startOfWeekPhoenix(d: Date): Date {
  const start = startOfDayPhoenix(d);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);
  return start;
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

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
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

// Transform booking to TripItem
function toTripItem(booking: any): TripItem {
  return {
    id: booking.id,
    status: booking.status,
    pickupAt: booking.pickupAt,
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    passengers: booking.passengers,
    luggage: booking.luggage,
    specialRequests: booking.specialRequests,
    customerName:
      booking.user?.name?.trim() || booking.guestName?.trim() || "Customer",
    serviceName: booking.serviceType?.name || "Trip",
    vehicleName:
      booking.assignment?.vehicleUnit?.name || booking.vehicle?.name || null,
    driverPaymentCents: booking.assignment?.driverPaymentCents ?? null,
    currency: booking.currency || "USD",
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
  const weekStart = startOfWeekPhoenix(now);
  const weekEnd = endOfDayPhoenix(addDays(weekStart, 6));
  const monthStart = startOfMonthPhoenix(now);
  const monthEnd = endOfMonthPhoenix(now);

  // Fetch trips for today
  const tripsToday = await db.booking.findMany({
    where: {
      pickupAt: { gte: todayStart, lte: todayEnd },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: {
          vehicleUnit: { select: { name: true } },
        },
      },
    },
  });

  // Fetch trips for this week (excluding today to avoid duplicates in the list)
  const tripsThisWeekRaw = await db.booking.findMany({
    where: {
      pickupAt: { gte: weekStart, lte: weekEnd },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: {
          vehicleUnit: { select: { name: true } },
        },
      },
    },
  });

  // Fetch all upcoming trips (not completed/cancelled)
  const allUpcomingRaw = await db.booking.findMany({
    where: {
      pickupAt: { gte: todayStart },
      status: { notIn: TERMINAL },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: {
          vehicleUnit: { select: { name: true } },
        },
      },
    },
  });

  // Fetch completed trips this month for earnings chart
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

  // Aggregate daily earnings
  const dailyEarningsMap = new Map<string, { amount: number; count: number }>();

  for (const trip of completedThisMonth) {
    const dateKey = formatDateKey(trip.pickupAt);
    const existing = dailyEarningsMap.get(dateKey) || { amount: 0, count: 0 };
    existing.amount += trip.assignment?.driverPaymentCents ?? 0;
    existing.count += 1;
    dailyEarningsMap.set(dateKey, existing);
  }

  const dailyEarnings: DailyEarning[] = Array.from(dailyEarningsMap.entries())
    .map(([date, data]) => ({
      date,
      amountCents: data.amount,
      tripCount: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalEarningsCents = dailyEarnings.reduce(
    (sum, d) => sum + d.amountCents,
    0,
  );
  const totalTrips = dailyEarnings.reduce((sum, d) => sum + d.tripCount, 0);

  // Transform to TripItem arrays
  const tripsTodayItems = tripsToday.map(toTripItem);
  const tripsThisWeekItems = tripsThisWeekRaw.map(toTripItem);
  const allUpcomingItems = allUpcomingRaw.map(toTripItem);

  // Get next trip (first upcoming non-terminal)
  const nextTrip = allUpcomingItems[0] || null;

  // Stats for header
  const activeCount = allUpcomingItems.length;
  const todayCount = tripsTodayItems.length;

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
            <span className={styles.headerKpiValue}>{todayCount}</span>
            <span className={styles.headerKpiLabel}>Today</span>
          </div>
          <div className={styles.headerKpi}>
            <span className={styles.headerKpiValue}>
              {tripsThisWeekItems.length}
            </span>
            <span className={styles.headerKpiLabel}>This Week</span>
          </div>
          <div className={`${styles.headerKpi} ${styles.headerKpiGood}`}>
            <span className={styles.headerKpiValue}>
              ${Math.round(totalEarningsCents / 100)}
            </span>
            <span className={styles.headerKpiLabel}>This Month</span>
          </div>
        </div>
      </header>

      {/* Next Trip Card */}
      {nextTrip && (
        <div className={styles.nextTripSection}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>
              <span className={styles.sectionIcon}>📍</span>
              Next Trip
            </h2>
          </div>
          <Link
            href={`/driver-dashboard/trips/${nextTrip.id}`}
            className={styles.nextTripCard}
          >
            <div className={styles.nextTripMain}>
              <div className={styles.nextTripTime}>
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: TIMEZONE,
                }).format(new Date(nextTrip.pickupAt))}
              </div>
              <div className={styles.nextTripCustomer}>
                {nextTrip.customerName} • {nextTrip.serviceName}
              </div>
              <div className={styles.nextTripRoute}>
                <span>📍 {nextTrip.pickupAddress.split(",")[0]}</span>
                <span className={styles.routeArrow}>→</span>
                <span>🏁 {nextTrip.dropoffAddress.split(",")[0]}</span>
              </div>
            </div>
            <div className={styles.nextTripAction}>View Details →</div>
          </Link>
        </div>
      )}

      {/* Trips Snapshot */}
      <DriverTripsSnapshot
        tripsToday={tripsTodayItems}
        tripsThisWeek={tripsThisWeekItems}
        tripsAllUpcoming={allUpcomingItems}
        timeZone={TIMEZONE}
      />

      {/* Earnings Chart */}
      <DriverEarningsChart
        dailyEarnings={dailyEarnings}
        monthLabel={getMonthLabel(now)}
        totalEarningsCents={totalEarningsCents}
        totalTrips={totalTrips}
        currency='USD'
      />
    </section>
  );
}
