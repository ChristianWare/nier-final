/* eslint-disable @typescript-eslint/no-explicit-any */
import AdminPageIntro from "@/components/admin/AdminPageIntro/AdminPageIntro";
import AdminUrgentQueue, {
  UrgentBookingItem,
} from "@/components/admin/AdminUrgentQueue/AdminUrgentQueue";
import AdminScheduleSnapshot from "@/components/admin/AdminScheduleSnapshot/AdminScheduleSnapshot";
import AdminDriverSnapshot from "@/components/admin/AdminDriverSnapshot/AdminDriverSnapshot";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_OFFSET_MS = -7 * 60 * 60 * 1000; // America/Phoenix is UTC-7 year-round

function startOfDayPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const d = phx.getUTCDate();

  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;

  return new Date(startUtcMs);
}

export default async function AdminHome() {
  const now = new Date();

  const todayStart = startOfDayPhoenix(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterStart = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  const next3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const stuckCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const cancelledLike = [
    "CANCELLED",
    "COMPLETED",
    "REFUNDED",
    "NO_SHOW",
  ] as const;

  const [
    pendingReview,
    pendingPayment,
    confirmed,

    // Urgent buckets
    unassignedSoon,
    pendingPaymentSoon,
    stuckReview,

    // Schedule snapshot
    todayTotal,
    todayConfirmed,
    todayUnassigned,
    tomorrowTotal,
    tomorrowConfirmed,
    tomorrowUnassigned,
    tripsNext3Hours,
    earliestUpcoming,

    // Driver readiness
    activeDrivers,
    driversAssignedTodayDistinct,
  ] = await Promise.all([
    db.booking.count({ where: { status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { status: "PENDING_PAYMENT" } }),
    db.booking.count({ where: { status: "CONFIRMED" } }),

    // A) Unassigned + pickup within 24h
    db.booking.findMany({
      where: {
        pickupAt: { gte: now, lt: next24h },
        assignment: { is: null },
        NOT: { status: { in: cancelledLike as any } },
      },
      orderBy: [{ pickupAt: "asc" }],
      take: 5,
      select: {
        id: true,
        pickupAt: true,
        createdAt: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        user: { select: { name: true, email: true } },
        serviceType: { select: { name: true } },
        assignment: {
          select: {
            driver: { select: { name: true, email: true } },
          },
        },
      },
    }),

    // B) Pending payment + pickup within 24h
    db.booking.findMany({
      where: {
        status: "PENDING_PAYMENT",
        pickupAt: { gte: now, lt: next24h },
      },
      orderBy: [{ pickupAt: "asc" }],
      take: 5,
      select: {
        id: true,
        pickupAt: true,
        createdAt: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        user: { select: { name: true, email: true } },
        serviceType: { select: { name: true } },
        assignment: {
          select: {
            driver: { select: { name: true, email: true } },
          },
        },
      },
    }),

    // C) Pending review older than 2 hours (and still upcoming)
    db.booking.findMany({
      where: {
        status: "PENDING_REVIEW",
        createdAt: { lt: stuckCutoff },
        pickupAt: { gte: now },
      },
      orderBy: [{ createdAt: "asc" }],
      take: 5,
      select: {
        id: true,
        pickupAt: true,
        createdAt: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        user: { select: { name: true, email: true } },
        serviceType: { select: { name: true } },
        assignment: {
          select: {
            driver: { select: { name: true, email: true } },
          },
        },
      },
    }),

    // -------------------------
    // Schedule snapshot: TODAY
    // -------------------------
    db.booking.count({
      where: {
        pickupAt: { gte: todayStart, lt: tomorrowStart },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),
    db.booking.count({
      where: {
        pickupAt: { gte: todayStart, lt: tomorrowStart },
        status: "CONFIRMED",
      },
    }),
    db.booking.count({
      where: {
        pickupAt: { gte: todayStart, lt: tomorrowStart },
        assignment: { is: null },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),

    // -------------------------
    // Schedule snapshot: TOMORROW
    // -------------------------
    db.booking.count({
      where: {
        pickupAt: { gte: tomorrowStart, lt: dayAfterStart },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),
    db.booking.count({
      where: {
        pickupAt: { gte: tomorrowStart, lt: dayAfterStart },
        status: "CONFIRMED",
      },
    }),
    db.booking.count({
      where: {
        pickupAt: { gte: tomorrowStart, lt: dayAfterStart },
        assignment: { is: null },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),

    // Trips in next 3 hours
    db.booking.count({
      where: {
        pickupAt: { gte: now, lt: next3h },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),

    // Earliest upcoming pickup time
    db.booking.findFirst({
      where: {
        pickupAt: { gte: now },
        NOT: { status: { in: cancelledLike as any } },
      },
      orderBy: [{ pickupAt: "asc" }],
      select: { pickupAt: true },
    }),

    // -------------------------
    // Driver readiness
    // -------------------------
    // "Active drivers" (for now: all users with role DRIVER)
    db.user.count({
      where: { role: "DRIVER" },
    }),

    // Distinct drivers assigned to trips TODAY
    db.assignment.findMany({
      where: {
        booking: {
          pickupAt: { gte: todayStart, lt: tomorrowStart },
          NOT: { status: { in: cancelledLike as any } },
        },
      },
      select: { driverId: true },
      distinct: ["driverId"],
    }),
  ]);

  const driversAssignedToday = driversAssignedTodayDistinct.length;

  return (
    <>
      <AdminPageIntro
        name='Barry'
        pendingReview={pendingReview}
        pendingPayment={pendingPayment}
        confirmed={confirmed}
      />

      <AdminScheduleSnapshot
        today={{
          total: todayTotal,
          confirmed: todayConfirmed,
          unassigned: todayUnassigned,
        }}
        tomorrow={{
          total: tomorrowTotal,
          confirmed: tomorrowConfirmed,
          unassigned: tomorrowUnassigned,
        }}
        earliestUpcomingPickupAt={earliestUpcoming?.pickupAt ?? null}
        tripsNext3Hours={tripsNext3Hours}
        timeZone='America/Phoenix'
      />

      <AdminDriverSnapshot
        activeDrivers={activeDrivers}
        driversAssignedToday={driversAssignedToday}
        unassignedTripsToday={todayUnassigned}
      />

      <AdminUrgentQueue
        unassignedSoon={unassignedSoon as unknown as UrgentBookingItem[]}
        pendingPaymentSoon={
          pendingPaymentSoon as unknown as UrgentBookingItem[]
        }
        stuckReview={stuckReview as unknown as UrgentBookingItem[]}
        timeZone='America/Phoenix'
      />
    </>
  );
}
