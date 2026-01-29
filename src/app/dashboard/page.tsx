// src/app/dashboard/page.tsx
import styles from "./DashboardPage.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardPageIntro from "@/components/Dashboard/DashboardPageIntro/DashboardPageIntro";
import UserAlerts, {
  UserAlertItem,
} from "@/components/Dashboard/UserAlerts/UserAlerts";
import UserUpcomingTrips, {
  UserUpcomingTripItem,
} from "@/components/Dashboard/UserUpcomingTrips/UserUpcomingTrips";
import UserPendingTrips, {
  UserPendingTripItem,
} from "@/components/Dashboard/UserPendingTrips/UserPendingTrips";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";

// Statuses for "approved" upcoming trips
const UPCOMING_CONFIRMED_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
];

// Statuses for "pending" trips
const PENDING_STATUSES: BookingStatus[] = ["PENDING_REVIEW", "PENDING_PAYMENT"];

function formatPickupDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

export default async function DashboardHomePage() {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard");

  const email = session.user?.email ?? null;
  const sessionUserId = (session.user as { id?: string }).id ?? null;

  let userId = sessionUserId;

  if (!userId && email) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) redirect("/login?next=/dashboard");

  const now = new Date();

  const [
    // KPI counts
    pendingReviewCount,
    pendingPaymentCount,
    upcomingConfirmedCount,

    // Upcoming confirmed trips (for table)
    upcomingConfirmedTrips,

    // Pending trips (for table)
    pendingTrips,

    // Declined bookings (for alerts)
    declinedBookings,

    // Payment due bookings (for alerts)
    paymentDueBookings,
  ] = await Promise.all([
    // KPI: Pending review count
    db.booking.count({ where: { userId, status: "PENDING_REVIEW" } }),

    // KPI: Pending payment count
    db.booking.count({ where: { userId, status: "PENDING_PAYMENT" } }),

    // KPI: Upcoming confirmed count
    db.booking.count({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_CONFIRMED_STATUSES },
      },
    }),

    // Upcoming confirmed trips (limit 10)
    db.booking.findMany({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_CONFIRMED_STATUSES },
      },
      orderBy: { pickupAt: "asc" },
      take: 10,
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        assignment: {
          include: {
            driver: { select: { name: true } },
            vehicleUnit: { select: { name: true } },
          },
        },
      },
    }),

    // Pending trips (review + payment)
    db.booking.findMany({
      where: {
        userId,
        status: { in: PENDING_STATUSES },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        payment: { select: { checkoutUrl: true } },
      },
    }),

    // Declined bookings (last 30 days, for alerts)
    db.booking.findMany({
      where: {
        userId,
        status: "DECLINED",
        updatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        declineReason: true,
        updatedAt: true,
      },
    }),

    // Payment due bookings (for alerts - pickup within 7 days)
    db.booking.findMany({
      where: {
        userId,
        status: "PENDING_PAYMENT",
        pickupAt: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { pickupAt: "asc" },
      take: 5,
      include: {
        payment: { select: { checkoutUrl: true } },
      },
    }),
  ]);

  // Transform upcoming confirmed trips
  const upcomingTripsData: UserUpcomingTripItem[] = upcomingConfirmedTrips.map(
    (b) => ({
      id: b.id,
      status: b.status,
      pickupAtIso: b.pickupAt.toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      serviceName: b.serviceType?.name ?? "—",
      vehicleName: b.vehicle?.name ?? null,
      driverName: b.assignment?.driver?.name ?? null,
      totalCents: b.totalCents,
      currency: b.currency,
    }),
  );

  // Transform pending trips
  const pendingTripsData: UserPendingTripItem[] = pendingTrips.map((b) => ({
    id: b.id,
    status: b.status,
    pickupAtIso: b.pickupAt.toISOString(),
    pickupAddress: b.pickupAddress,
    dropoffAddress: b.dropoffAddress,
    serviceName: b.serviceType?.name ?? "—",
    vehicleName: b.vehicle?.name ?? null,
    totalCents: b.totalCents,
    currency: b.currency,
    createdAtIso: b.createdAt.toISOString(),
    paymentUrl: b.payment?.checkoutUrl ?? null,
  }));

  // Build user alerts
  const alerts: UserAlertItem[] = [];

  // Alert: Declined bookings
  for (const b of declinedBookings) {
    const daysAgo = Math.round(
      (now.getTime() - new Date(b.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const timeAgo =
      daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;

    alerts.push({
      id: `declined-${b.id}`,
      severity: "danger",
      title: "Booking Declined",
      message:
        "Unfortunately, we were unable to accommodate your booking request.",
      href: `/dashboard/trips/${b.id}`,
      ctaLabel: "View Details",
      declineReason: b.declineReason,
      bookingId: b.id,
      pickupDate: formatPickupDate(b.pickupAt),
      route: `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`,
      timestamp: timeAgo,
    });
  }

  // Alert: Payment due (urgent - within 7 days)
  for (const b of paymentDueBookings) {
    const daysUntil = Math.round(
      (new Date(b.pickupAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const urgency =
      daysUntil <= 1
        ? "danger"
        : daysUntil <= 3
          ? "warning"
          : ("info" as const);
    const urgencyLabel =
      daysUntil === 0
        ? "Today!"
        : daysUntil === 1
          ? "Tomorrow"
          : `In ${daysUntil} days`;

    alerts.push({
      id: `payment-${b.id}`,
      severity: urgency,
      title: "Payment Required",
      message: `Your booking requires payment to be confirmed. Pickup is ${urgencyLabel.toLowerCase()}.`,
      href: `/dashboard/trips/${b.id}`,
      ctaLabel: "View Booking",
      amountDue: formatMoney(b.totalCents, b.currency),
      dueDate: formatPickupDate(b.pickupAt),
      paymentUrl: b.payment?.checkoutUrl ?? null,
      bookingId: b.id,
      route: `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`,
      timestamp: urgencyLabel,
    });
  }

  // Sort alerts: danger first, then warning, then info
  alerts.sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const displayName =
    (session.user?.name ?? session.user?.email ?? "").trim() || "there";

  return (
    <section className={styles.container}>
      <DashboardPageIntro
        name={displayName}
        pendingReview={pendingReviewCount}
        pendingPayment={pendingPaymentCount}
        confirmed={upcomingConfirmedCount}
      />

      {/* User Alerts */}
      <UserAlerts alerts={alerts} />

      {/* Pending Trips (awaiting approval or payment) */}
      <UserPendingTrips
        items={pendingTripsData}
        timeZone={PHX_TZ}
        bookingHrefBase='/dashboard/trips'
      />

      {/* Upcoming Confirmed Trips */}
      <UserUpcomingTrips
        items={upcomingTripsData}
        timeZone={PHX_TZ}
        bookingHrefBase='/dashboard/trips'
      />
    </section>
  );
}
