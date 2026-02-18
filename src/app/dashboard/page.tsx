/* eslint-disable @typescript-eslint/no-unused-vars */
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
import UserPaymentDue, {
  UserPaymentDueItem,
} from "@/components/Dashboard/UserPaymentDue/UserPaymentDue";
import UserNextTrip from "@/components/Dashboard/UserNextTrip/UserNextTrip";
import { getUserNextTrip } from "@/components/Dashboard/UserNextTrip/getUserNextTrip";
import { BookingStatus } from "@prisma/client";
import { getCompanySettings } from "../../../actions/admin/companySettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Statuses for "upcoming" trips (approved AND paid)
const UPCOMING_PAID_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
];

function formatPickupDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
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
  const { timezone: companyTz } = await getCompanySettings();

  // Fetch user's next trip
  const nextTrip = await getUserNextTrip(userId);

  const [
    // KPI counts
    pendingReviewCount,
    pendingPaymentCount,
    upcomingPaidCount,

    // Pending review trips (awaiting admin approval)
    pendingReviewTrips,

    // Pending payment trips (approved, needs payment)
    pendingPaymentTrips,

    // Upcoming paid trips (confirmed)
    upcomingPaidTrips,

    // Declined bookings (for alerts)
    declinedBookings,

    // Recent status events (for alerts - last 7 days)
    recentStatusEvents,
  ] = await Promise.all([
    // KPI: Pending review count
    db.booking.count({ where: { userId, status: "PENDING_REVIEW" } }),

    // KPI: Pending payment count
    db.booking.count({ where: { userId, status: "PENDING_PAYMENT" } }),

    // KPI: Upcoming paid count
    db.booking.count({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_PAID_STATUSES },
      },
    }),

    // Pending review trips (awaiting approval)
    db.booking.findMany({
      where: {
        userId,
        status: "PENDING_REVIEW",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
      },
    }),

    // Pending payment trips (approved, needs payment)
    db.booking.findMany({
      where: {
        userId,
        status: "PENDING_PAYMENT",
      },
      orderBy: { pickupAt: "asc" },
      take: 10,
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        payment: { select: { checkoutUrl: true } },
      },
    }),

    // Upcoming paid trips (confirmed)
    db.booking.findMany({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_PAID_STATUSES },
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

    // Recent status events (last 7 days)
    db.bookingStatusEvent.findMany({
      where: {
        booking: { userId },
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        eventType: {
          in: [
            "PAYMENT_RECEIVED",
            "APPROVAL_CHANGED",
            "DRIVER_ASSIGNED",
            "REFUND_ISSUED",
            "STATUS_CHANGE",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            totalCents: true,
            currency: true,
            status: true,
          },
        },
      },
    }),
  ]);

  // Transform pending review trips
  const pendingReviewData: UserPendingTripItem[] = pendingReviewTrips.map(
    (b) => ({
      id: b.id,
      pickupAtIso: b.pickupAt.toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      serviceName: b.serviceType?.name ?? "—",
      vehicleName: b.vehicle?.name ?? null,
      totalCents: b.totalCents,
      currency: b.currency,
      createdAtIso: b.createdAt.toISOString(),
    }),
  );

  // Transform pending payment trips
  const pendingPaymentData: UserPaymentDueItem[] = pendingPaymentTrips.map(
    (b) => ({
      id: b.id,
      pickupAtIso: b.pickupAt.toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      serviceName: b.serviceType?.name ?? "—",
      vehicleName: b.vehicle?.name ?? null,
      totalCents: b.totalCents,
      currency: b.currency,
      paymentUrl: b.payment?.checkoutUrl ?? null,
    }),
  );

  // Transform upcoming paid trips
  const upcomingTripsData: UserUpcomingTripItem[] = upcomingPaidTrips.map(
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

  // Build user alerts
  const alerts: UserAlertItem[] = [];

  function formatTimeAgo(date: Date): string {
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.round(diffMs / (60 * 1000));
    const hours = Math.round(diffMs / (60 * 60 * 1000));
    const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  // Process recent status events for alerts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const event of recentStatusEvents as any[]) {
    const booking = event.booking;
    if (!booking) continue;

    const eventType = event.eventType;
    const metadata = event.metadata as Record<string, unknown> | null;
    const timeAgo = formatTimeAgo(new Date(event.createdAt));

    // Payment Received
    if (eventType === "PAYMENT_RECEIVED") {
      const amountCents =
        (metadata?.amountCents as number) ?? booking.totalCents;
      alerts.push({
        id: `payment-received-${event.id}`,
        severity: "success",
        alertType: "payment_received",
        title: "Payment Confirmed",
        message:
          "Your payment has been received and your booking is confirmed!",
        href: `/dashboard/trips/${booking.id}`,
        ctaLabel: "View Trip",
        amountPaid: formatMoney(amountCents, booking.currency),
        pickupDate: formatPickupDate(booking.pickupAt, companyTz),
        route: `${shortAddress(booking.pickupAddress)} → ${shortAddress(booking.dropoffAddress)}`,
        timestamp: timeAgo,
      });
    }

    // Booking Approved (ready for payment)
    if (eventType === "APPROVAL_CHANGED" && metadata?.approved === true) {
      if (booking.status === "PENDING_PAYMENT") {
        alerts.push({
          id: `approved-${event.id}`,
          severity: "success",
          alertType: "approved",
          title: "Booking Approved",
          message:
            "Great news! Your booking has been approved. Please complete payment to confirm.",
          href: `/dashboard/trips/${booking.id}`,
          ctaLabel: "Complete Payment",
          amountDue: formatMoney(booking.totalCents, booking.currency),
          pickupDate: formatPickupDate(booking.pickupAt, companyTz),
          route: `${shortAddress(booking.pickupAddress)} → ${shortAddress(booking.dropoffAddress)}`,
          timestamp: timeAgo,
        });
      }
    }

    // Driver Assigned
    if (eventType === "DRIVER_ASSIGNED") {
      const driverName = metadata?.driverName as string | undefined;
      const vehicleName = metadata?.vehicleUnitName as string | undefined;
      alerts.push({
        id: `driver-assigned-${event.id}`,
        severity: "success",
        alertType: "driver_assigned",
        title: "Driver Assigned",
        message: driverName
          ? `${driverName} has been assigned to your trip.`
          : "A driver has been assigned to your trip.",
        href: `/dashboard/trips/${booking.id}`,
        ctaLabel: "View Trip",
        driverName: driverName ?? null,
        vehicleName: vehicleName ?? null,
        pickupDate: formatPickupDate(booking.pickupAt, companyTz),
        route: `${shortAddress(booking.pickupAddress)} → ${shortAddress(booking.dropoffAddress)}`,
        timestamp: timeAgo,
      });
    }

    // Refund Issued
    if (eventType === "REFUND_ISSUED") {
      const refundCents = (metadata?.amountCents as number) ?? 0;
      alerts.push({
        id: `refund-${event.id}`,
        severity: "warning",
        alertType: "refunded",
        title: "Refund Processed",
        message: "A refund has been issued to your original payment method.",
        href: `/dashboard/trips/${booking.id}`,
        ctaLabel: "View Details",
        amountRefunded: formatMoney(refundCents, booking.currency),
        pickupDate: formatPickupDate(booking.pickupAt, companyTz),
        route: `${shortAddress(booking.pickupAddress)} → ${shortAddress(booking.dropoffAddress)}`,
        timestamp: timeAgo,
      });
    }

    // Booking Cancelled
    if (eventType === "STATUS_CHANGE" && booking.status === "CANCELLED") {
      alerts.push({
        id: `cancelled-${event.id}`,
        severity: "warning",
        alertType: "cancelled",
        title: "Booking Cancelled",
        message: "Your booking has been cancelled.",
        href: `/dashboard/trips/${booking.id}`,
        ctaLabel: "View Details",
        pickupDate: formatPickupDate(booking.pickupAt, companyTz),
        route: `${shortAddress(booking.pickupAddress)} → ${shortAddress(booking.dropoffAddress)}`,
        timestamp: timeAgo,
      });
    }
  }

  // Alert: Declined bookings
  for (const b of declinedBookings) {
    const timeAgo = formatTimeAgo(new Date(b.updatedAt));

    alerts.push({
      id: `declined-${b.id}`,
      severity: "danger",
      alertType: "declined",
      title: "Booking Declined",
      message:
        "Unfortunately, we were unable to accommodate your booking request.",
      href: `/dashboard/trips/${b.id}`,
      ctaLabel: "View Details",
      declineReason: b.declineReason,
      bookingId: b.id,
      pickupDate: formatPickupDate(b.pickupAt, companyTz),
      route: `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`,
      timestamp: timeAgo,
    });
  }

  // Alert: Urgent payment due (pickup within 24 hours)
  const urgentPaymentDue = pendingPaymentTrips.filter((b) => {
    const hoursUntil =
      (new Date(b.pickupAt).getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil <= 24 && hoursUntil > 0;
  });

  for (const b of urgentPaymentDue) {
    const hoursUntil = Math.round(
      (new Date(b.pickupAt).getTime() - now.getTime()) / (1000 * 60 * 60),
    );
    const urgencyLabel =
      hoursUntil <= 1 ? "Less than 1 hour" : `${hoursUntil}h`;

    alerts.push({
      id: `urgent-payment-${b.id}`,
      severity: "danger",
      alertType: "payment_due",
      title: "Urgent: Payment Required",
      message: `Your booking pickup is in ${urgencyLabel}. Please complete payment immediately to confirm your ride.`,
      href: `/dashboard/trips/${b.id}`,
      ctaLabel: "View Booking",
      amountDue: formatMoney(b.totalCents, b.currency),
      dueDate: formatPickupDate(b.pickupAt, companyTz),
      paymentUrl: b.payment?.checkoutUrl ?? null,
      bookingId: b.id,
      route: `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`,
      timestamp: `Pickup in ${urgencyLabel}`,
    });
  }

  // Sort alerts: danger first, then warning, then success, then info
  alerts.sort((a, b) => {
    const order = { danger: 0, warning: 1, success: 2, info: 3 };
    return order[a.severity] - order[b.severity];
  });

  // Deduplicate alerts
  const seenBookings = new Set<string>();
  const uniqueAlerts = alerts.filter((a) => {
    if (!a.bookingId) return true;
    const key = `${a.alertType}-${a.bookingId}`;
    if (seenBookings.has(key)) return false;
    seenBookings.add(key);
    return true;
  });

  const finalAlerts = uniqueAlerts.slice(0, 10);

  const displayName =
    (session.user?.name ?? session.user?.email ?? "").trim() || "there";

  return (
    <section className={styles.container}>
      <DashboardPageIntro
        name={displayName}
        pendingReview={pendingReviewCount}
        pendingPayment={pendingPaymentCount}
        confirmed={upcomingPaidCount}
      />

      {/* <UserAlerts alerts={finalAlerts} /> */}

      <UserNextTrip trip={nextTrip} timeZone={companyTz} />

      <UserPaymentDue
        items={pendingPaymentData}
        timeZone={companyTz}
        bookingHrefBase='/dashboard/trips'
      />

      <UserPendingTrips
        items={pendingReviewData}
        timeZone={companyTz}
        bookingHrefBase='/dashboard/trips'
      />

      <UserUpcomingTrips
        items={upcomingTripsData}
        timeZone={companyTz}
        bookingHrefBase='/dashboard/trips'
      />
    </section>
  );
}
