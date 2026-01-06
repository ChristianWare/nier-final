/* eslint-disable @typescript-eslint/no-explicit-any */
import AdminPageIntro from "@/components/admin/AdminPageIntro/AdminPageIntro";
import AdminUrgentQueue, {
  UrgentBookingItem,
} from "@/components/admin/AdminUrgentQueue/AdminUrgentQueue";
import AdminScheduleSnapshot from "@/components/admin/AdminScheduleSnapshot/AdminScheduleSnapshot";
import AdminDriverSnapshot from "@/components/admin/AdminDriverSnapshot/AdminDriverSnapshot";
import AdminVehicleSnapshot, {
  VehicleCategoryReadiness,
} from "@/components/admin/AdminVehicleSnapshot/AdminVehicleSnapshot";
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

    // Vehicle readiness
    activeUnits,
    inactiveUnits,
    activeUnitsByCategory,
    assignedActiveUnitsToday,
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
    db.user.count({
      where: { role: "DRIVER" },
    }),
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

    // -------------------------
    // Vehicle readiness
    // -------------------------
    db.vehicleUnit.count({ where: { active: true } }),
    db.vehicleUnit.count({ where: { active: false } }),

    // Active units by category (includes null categoryId)
    db.vehicleUnit.groupBy({
      by: ["categoryId"],
      where: { active: true },
      _count: { _all: true },
    }),

    // Active units that are assigned TODAY (distinct units)
    db.vehicleUnit.findMany({
      where: {
        active: true,
        assignments: {
          some: {
            booking: {
              pickupAt: { gte: todayStart, lt: tomorrowStart },
              NOT: { status: { in: cancelledLike as any } },
            },
          },
        },
      },
      select: { id: true, categoryId: true },
      distinct: ["id"],
    }),
  ]);

  const driversAssignedToday = driversAssignedTodayDistinct.length;

  // Vehicle readiness calculations
  const assignedActiveUnitIdsToday = new Set(
    assignedActiveUnitsToday.map((u) => u.id)
  );
  const availableUnitsToday = Math.max(
    0,
    activeUnits - assignedActiveUnitIdsToday.size
  );

  // Build category readiness: active count from groupBy + assigned count from assignedActiveUnitsToday
  const assignedByCategory = new Map<string, number>();
  for (const u of assignedActiveUnitsToday) {
    const key = u.categoryId ?? "unassigned";
    assignedByCategory.set(key, (assignedByCategory.get(key) ?? 0) + 1);
  }

  const categoryIds = activeUnitsByCategory
    .map((g) => g.categoryId)
    .filter((x): x is string => typeof x === "string");

  const categoryRows = categoryIds.length
    ? await db.vehicle.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];

  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));

  const byCategory: VehicleCategoryReadiness[] = activeUnitsByCategory
    .map((g) => {
      const key = g.categoryId ?? "unassigned";
      const activeCount = g._count._all;
      const assignedCount = assignedByCategory.get(key) ?? 0;
      const name =
        g.categoryId == null
          ? "Unassigned"
          : (categoryNameById.get(g.categoryId) ?? "Unknown");

      return {
        id: key,
        name,
        activeUnits: activeCount,
        availableToday: Math.max(0, activeCount - assignedCount),
      };
    })
    .sort((a, b) => b.activeUnits - a.activeUnits)
    .slice(0, 8);

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

      <AdminVehicleSnapshot
        activeUnits={activeUnits}
        availableUnitsToday={availableUnitsToday}
        inactiveUnits={inactiveUnits}
        byCategory={byCategory}
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
