/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import styles from "./SchedulePage.module.css";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import DriverRideCalendar from "@/components/Driver/DriverRideCalendar/DriverRideCalendar";
import Link from "next/link";

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

function endOfMonth(d: Date, timeZone: string): Date {
  const str = d.toLocaleDateString("en-US", { timeZone });
  const [month, , year] = str.split("/").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
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

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
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
  const { timezone: companyTz } = await getCompanySettings();

  const todayStart = startOfDay(now, companyTz);
  const todayEnd = endOfDay(now, companyTz);
  const mStart = tz.startOfMonth(now, companyTz);
  const mEnd = endOfMonth(now, companyTz);

  // Get 3 months of calendar data for smooth navigation
  const calendarStart = new Date(mStart);
  calendarStart.setMonth(calendarStart.getMonth() - 1);
  const calendarEnd = new Date(mEnd);
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
    const ymd = ymdInTimezone(trip.pickupAt, companyTz);
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
      pickupAt: { gte: mStart, lte: mEnd },
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
        initialMonth={monthKey(baseMonth, companyTz)}
        countsByYmd={countsByYmd}
        todayYmd={ymdInTimezone(now, companyTz)}
        timeZone={companyTz}
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
              const tripYmd = ymdInTimezone(trip.pickupAt, companyTz);
              const isToday = tripYmd === ymdInTimezone(now, companyTz);

              return (
                <Link
                  key={trip.id}
                  href={`/driver-dashboard/trips/${trip.id}`}
                  className={styles.tripRow}
                >
                  <div className={styles.tripDateTime}>
                    <span className={styles.tripDate}>
                      {isToday ? "Today" : formatDate(trip.pickupAt, companyTz)}
                    </span>
                    <span className={styles.tripTime}>
                      {formatTime(trip.pickupAt, companyTz)}
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
