/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import styles from "./SchedulePage.module.css";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import DriverRideCalendar from "@/components/Driver/DriverRideCalendar/DriverRideCalendar";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function ymdInPhoenix(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TIMEZONE,
  }).format(date);
}

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

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

export default async function SchedulePage() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/schedule");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverId = await resolveSessionUserId(session);
  if (!driverId) redirect("/");

  const now = new Date();
  const todayStart = startOfDayPhoenix(now);
  const todayEnd = endOfDayPhoenix(now);
  const monthStart = startOfMonthPhoenix(now);
  const monthEnd = endOfMonthPhoenix(now);

  // Get 3 months of calendar data for smooth navigation
  const calendarStart = new Date(monthStart);
  calendarStart.setMonth(calendarStart.getMonth() - 1);
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setMonth(calendarEnd.getMonth() + 2);

  // Fetch calendar trips
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
    const ymd = ymdInPhoenix(trip.pickupAt);
    countsByYmd[ymd] = (countsByYmd[ymd] ?? 0) + 1;
  }

  // Fetch upcoming trips (next 7 days)
  const next7Days = new Date(todayStart);
  next7Days.setDate(next7Days.getDate() + 7);

  const upcomingTrips = await db.booking.findMany({
    where: {
      pickupAt: { gte: todayStart, lte: next7Days },
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.REFUNDED,
          BookingStatus.NO_SHOW,
          BookingStatus.COMPLETED,
        ],
      },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    take: 10,
    include: {
      user: { select: { name: true } },
      serviceType: { select: { name: true } },
      assignment: { select: { driverPaymentCents: true } },
    },
  });

  // Stats
  const todayTripsCount = await db.booking.count({
    where: {
      pickupAt: { gte: todayStart, lte: todayEnd },
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.REFUNDED,
          BookingStatus.NO_SHOW,
        ],
      },
      assignment: { driverId },
    },
  });

  const thisWeekTripsCount = await db.booking.count({
    where: {
      pickupAt: { gte: todayStart, lte: next7Days },
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.REFUNDED,
          BookingStatus.NO_SHOW,
        ],
      },
      assignment: { driverId },
    },
  });

  const thisMonthTripsCount = await db.booking.count({
    where: {
      pickupAt: { gte: monthStart, lte: monthEnd },
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.REFUNDED,
          BookingStatus.NO_SHOW,
        ],
      },
      assignment: { driverId },
    },
  });

  // Calendar props
  const baseMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0),
  );

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className='heading h2'>My Schedule</h1>
          <p className='subheading'>View and manage your upcoming trips</p>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{todayTripsCount}</span>
            <span className={styles.statLabel}>Today</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{thisWeekTripsCount}</span>
            <span className={styles.statLabel}>This Week</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{thisMonthTripsCount}</span>
            <span className={styles.statLabel}>This Month</span>
          </div>
        </div>
      </header>

      <DriverRideCalendar
        initialMonth={monthKey(baseMonth)}
        countsByYmd={countsByYmd}
        todayYmd={ymdInPhoenix(now)}
      />

      <div className={styles.upcomingSection}>
        <div className={styles.sectionHeader}>
          <h2 className='cardTitle h5'>Upcoming Trips</h2>
          <span className='miniNote'>Next 7 days</span>
        </div>

        {upcomingTrips.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No upcoming trips</p>
            <p className={styles.emptyCopy}>
              You don&apos;t have any trips scheduled for the next 7 days.
            </p>
          </div>
        ) : (
          <div className={styles.tripsList}>
            {upcomingTrips.map((trip) => {
              const customerName =
                trip.user?.name?.trim() || trip.guestName?.trim() || "Customer";
              const driverPay = trip.assignment?.driverPaymentCents ?? 0;
              const tripYmd = ymdInPhoenix(trip.pickupAt);
              const isToday = tripYmd === ymdInPhoenix(now);

              return (
                <Link
                  key={trip.id}
                  href={`/driver-dashboard/trips/${trip.id}`}
                  className={styles.tripRow}
                >
                  <div className={styles.tripDateTime}>
                    <span className={styles.tripDate}>
                      {isToday ? "Today" : formatDate(trip.pickupAt)}
                    </span>
                    <span className={styles.tripTime}>
                      {formatTime(trip.pickupAt)}
                    </span>
                  </div>

                  <div className={styles.tripInfo}>
                    <span className={styles.tripCustomer}>{customerName}</span>
                    <span className={styles.tripService}>
                      {trip.serviceType?.name ?? "Trip"}
                    </span>
                  </div>

                  <div className={styles.tripRoute}>
                    <span className={styles.tripAddress}>
                      {trip.pickupAddress.split(",")[0]}
                    </span>
                    <span className={styles.tripArrow}>→</span>
                    <span className={styles.tripAddress}>
                      {trip.dropoffAddress.split(",")[0]}
                    </span>
                  </div>

                  {driverPay > 0 && (
                    <div className={styles.tripPay}>
                      {formatMoney(driverPay)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
