import styles from "./DashboardPage.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { SITE } from "@/config/site";
import { shortPlace } from "@/lib/shortPlace";
import Button from "@/components/shared/Button/Button";
import DashboardPageIntro from "@/components/Dashboard/DashboardPageIntro/DashboardPageIntro";
import UserNextTrip from "@/components/Dashboard/UserNextTrip/UserNextTrip";
import { getUserNextTrip } from "@/components/Dashboard/UserNextTrip/getUserNextTrip";
import { rideCalendarEvent } from "@/components/Dashboard/AddToCalendar/rideEvent";
import UserAttention, {
  type UserAttentionItem,
} from "@/components/Dashboard/UserAttention/UserAttention";
import UserUpcomingList, {
  type UserUpcomingItem,
} from "@/components/Dashboard/UserUpcomingList/UserUpcomingList";
import RideAgain, {
  type RideAgainItem,
} from "@/components/Dashboard/RideAgain/RideAgain";
import {
  RIDE_AGAIN_SELECT,
  rideAgainPrefill,
} from "@/components/Dashboard/RideAgain/rideAgainPrefill";

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
  const settings = await getCompanySettings();
  const companyTz = settings.timezone;

  const [
    nextTrip,
    pendingReviewCount,
    pendingPaymentCount,
    upcomingPaidCount,
    pendingReviewTrips,
    pendingPaymentTrips,
    upcomingPaidTrips,
    recentCompleted,
    airports,
  ] = await Promise.all([
    getUserNextTrip(userId),

    db.booking.count({ where: { userId, status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { userId, status: "PENDING_PAYMENT" } }),
    db.booking.count({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_PAID_STATUSES },
      },
    }),

    // Waiting on us: requests being reviewed.
    db.booking.findMany({
      where: { userId, status: "PENDING_REVIEW" },
      orderBy: { pickupAt: "asc" },
      take: 10,
      include: { serviceType: { select: { name: true } } },
    }),

    // Waiting on the customer: approved, to be paid for.
    db.booking.findMany({
      where: { userId, status: "PENDING_PAYMENT" },
      orderBy: { pickupAt: "asc" },
      take: 10,
      include: { serviceType: { select: { name: true } } },
    }),

    // Confirmed rides to come.
    db.booking.findMany({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_PAID_STATUSES },
      },
      orderBy: { pickupAt: "asc" },
      take: 6,
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        assignment: { include: { driver: { select: { name: true } } } },
      },
    }),

    // Past rides, for Ride again.
    db.booking.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { pickupAt: "desc" },
      take: 25,
      select: {
        ...RIDE_AGAIN_SELECT,
        id: true,
        pickupAt: true,
        serviceType: { select: { name: true, airportLeg: true } },
        vehicle: { select: { name: true } },
      },
    }),

    db.airport.findMany({
      where: { active: true },
      select: { id: true, address: true },
    }),
  ]);

  // Needs your attention: payments first (they're on the customer), then
  // requests we're reviewing; soonest ride first in each.
  const attention: UserAttentionItem[] = [
    ...pendingPaymentTrips.map((b) => ({ b, kind: "payment" as const })),
    ...pendingReviewTrips.map((b) => ({ b, kind: "review" as const })),
  ].map(({ b, kind }) => ({
    id: b.id,
    kind,
    pickupAtIso: b.pickupAt.toISOString(),
    pickupAddress: b.pickupAddress,
    dropoffAddress: b.dropoffAddress,
    serviceName: b.serviceType?.name ?? "Ride",
    totalCents: b.totalCents,
    currency: b.currency,
  }));

  // Also coming up: confirmed rides after the next one.
  const upcoming: UserUpcomingItem[] = upcomingPaidTrips
    .filter((b) => b.id !== nextTrip?.id)
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      status: b.status,
      pickupAtIso: b.pickupAt.toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      serviceName: b.serviceType?.name ?? "Ride",
      vehicleName: b.vehicle?.name ?? null,
      driverName: b.assignment?.driver?.name ?? null,
    }));

  // Ride again: the three most recent different routes.
  const airportIdByAddress = new Map(airports.map((a) => [a.address, a.id]));
  const seenRoutes = new Set<string>();
  const rideAgain: RideAgainItem[] = [];
  for (const b of recentCompleted) {
    const key = `${b.pickupAddress}|${b.dropoffAddress}`;
    if (seenRoutes.has(key)) continue;
    seenRoutes.add(key);
    const prefill = rideAgainPrefill(b, airportIdByAddress);

    rideAgain.push({
      id: b.id,
      from: shortPlace(b.pickupAddress),
      to: shortPlace(b.dropoffAddress),
      summary: [b.serviceType?.name, b.vehicle?.name]
        .filter(Boolean)
        .join(" · "),
      lastLabel: `Last ride ${new Intl.DateTimeFormat("en-US", {
        timeZone: companyTz,
        month: "short",
        day: "numeric",
      }).format(b.pickupAt)}`,
      prefill,
    });
    if (rideAgain.length === 3) break;
  }

  const firstName =
    (session.user?.name ?? "").trim().split(/\s+/)[0] || "there";
  const dispatchPhoneTel = settings.dispatchPhoneRaw
    ? `+1${settings.dispatchPhoneRaw}`
    : null;

  return (
    <section className={styles.container}>
      <DashboardPageIntro
        firstName={firstName}
        pendingReview={pendingReviewCount}
        pendingPayment={pendingPaymentCount}
        confirmed={upcomingPaidCount}
      />

      <UserAttention items={attention} timeZone={companyTz} />

      {nextTrip ? (
        <UserNextTrip
          trip={nextTrip}
          timeZone={companyTz}
          dispatchPhone={settings.dispatchPhone}
          dispatchPhoneTel={dispatchPhoneTel}
          calendarEvent={rideCalendarEvent(
            {
              id: nextTrip.id,
              pickupAt: new Date(nextTrip.pickupAtIso),
              pickupAddress: nextTrip.pickupAddress,
              dropoffAddress: nextTrip.dropoffAddress,
              serviceName: nextTrip.serviceName,
              vehicleName: nextTrip.vehicleName,
              durationMinutes: nextTrip.durationMinutes,
              hoursRequested: nextTrip.hoursRequested,
              flight: nextTrip.flight,
            },
            {
              name: settings.companyName || SITE.name,
              dispatchPhone: settings.dispatchPhone,
              siteUrl: SITE.url,
            },
          )}
        />
      ) : (
        // One empty state, one button.
        <section className={styles.empty}>
          <h2 className='cardTitle h4'>Your next trip</h2>
          <div className={styles.emptyBody}>
            <p className={styles.emptyTitle}>
              {rideAgain.length > 0
                ? "No rides booked right now"
                : "You haven't booked a ride yet"}
            </p>
            <p className={styles.emptyCopy}>
              {rideAgain.length > 0
                ? "Book your next one here, or pick a past trip below to ride again."
                : "Book in a minute: pick a time, add your pickup and drop-off, and choose a car. Your rides show up here."}
            </p>
            <Button href='/book' text='Book a ride' btnType='red' arrow />
          </div>
        </section>
      )}

      <UserUpcomingList items={upcoming} timeZone={companyTz} />

      <RideAgain items={rideAgain} />
    </section>
  );
}
