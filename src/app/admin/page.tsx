/* eslint-disable @typescript-eslint/no-explicit-any */
import AdminPageIntro from "@/components/admin/AdminPageIntro/AdminPageIntro";
import AdminQuickActions from "@/components/admin/AdminQuickActions/AdminQuickActions";
import AdminAlerts, {
  AlertItem,
} from "@/components/admin/AdminAlerts/AdminAlerts";
import AdminUrgentQueue, {
  UrgentBookingItem,
} from "@/components/admin/AdminUrgentQueue/AdminUrgentQueue";
import AdminScheduleSnapshot from "@/components/admin/AdminScheduleSnapshot/AdminScheduleSnapshot";
import AdminDriverSnapshot from "@/components/admin/AdminDriverSnapshot/AdminDriverSnapshot";
import AdminVehicleSnapshot, {
  VehicleCategoryReadiness,
} from "@/components/admin/AdminVehicleSnapshot/AdminVehicleSnapshot";
import AdminActivityFeed, {
  AdminActivityItem,
} from "@/components/admin/AdminActivityFeed/AdminActivityFeed";
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

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function actorLabel(
  user: { name: string | null; email: string } | null | undefined
) {
  if (!user) return "System";
  return user.name?.trim() || user.email;
}

function customerLabel(
  user: { name: string | null; email: string } | null | undefined
) {
  if (!user) return "Customer";
  return user.name?.trim() || user.email;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default async function AdminHome() {
  const now = new Date();

  const todayStart = startOfDayPhoenix(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterStart = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  const next3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const next12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
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

    // Alerts counts
    unassignedWithin24hCount,
    pendingPaymentWithin12hCount,

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

    // Activity feed sources
    recentStatusEvents,
    recentAssignments,
    recentPaymentsReceived,
    recentPaymentLinks,
  ] = await Promise.all([
    db.booking.count({ where: { status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { status: "PENDING_PAYMENT" } }),
    db.booking.count({ where: { status: "CONFIRMED" } }),

    // Alerts: unassigned within 24h
    db.booking.count({
      where: {
        pickupAt: { gte: now, lt: next24h },
        assignment: { is: null },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),

    // Alerts: pending payment within 12h
    db.booking.count({
      where: {
        status: "PENDING_PAYMENT",
        pickupAt: { gte: now, lt: next12h },
      },
    }),

    // A) Unassigned + pickup within 24h (top items)
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

    // B) Pending payment + pickup within 24h (top items)
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

    // C) Pending review older than 2 hours (and still upcoming) (top items)
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
    db.user.count({ where: { role: "DRIVER" } }),
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
    db.vehicleUnit.groupBy({
      by: ["categoryId"],
      where: { active: true },
      _count: { _all: true },
    }),
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

    // -------------------------
    // Recent activity sources
    // -------------------------
    db.bookingStatusEvent.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 10,
      select: {
        status: true,
        createdAt: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
          },
        },
        createdBy: { select: { name: true, email: true } },
      },
    }),

    db.assignment.findMany({
      orderBy: [{ assignedAt: "desc" }],
      take: 10,
      select: {
        assignedAt: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
          },
        },
        driver: { select: { name: true, email: true } },
        vehicleUnit: { select: { name: true } },
        assignedBy: { select: { name: true, email: true } },
      },
    }),

    db.payment.findMany({
      where: { paidAt: { not: null } },
      orderBy: [{ paidAt: "desc" }],
      take: 10,
      select: {
        paidAt: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),

    db.payment.findMany({
      where: { stripeCheckoutSessionId: { not: null } },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
      select: {
        updatedAt: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  const driversAssignedToday = driversAssignedTodayDistinct.length;

  // Alerts build
  const alerts: AlertItem[] = [];

  if (unassignedWithin24hCount > 0) {
    alerts.push({
      id: "unassigned-24h",
      severity: unassignedWithin24hCount >= 3 ? "danger" : "warning",
      message: `${unassignedWithin24hCount} booking(s) are unassigned within 24 hours`,
      href: "/admin/bookings",
      ctaLabel: "Review",
    });
  }

  if (pendingPaymentWithin12hCount > 0) {
    alerts.push({
      id: "pending-payment-12h",
      severity: pendingPaymentWithin12hCount >= 2 ? "danger" : "warning",
      message: `${pendingPaymentWithin12hCount} booking(s) pending payment within 12 hours`,
      href: "/admin/bookings",
      ctaLabel: "Open",
    });
  }

  if (activeDrivers === 0) {
    alerts.push({
      id: "no-drivers",
      severity: "danger",
      message: "0 active drivers — add drivers before dispatching",
      href: "/admin/drivers",
      ctaLabel: "Add driver",
    });
  }

  // Vehicle readiness calculations
  const assignedActiveUnitIdsToday = new Set(
    assignedActiveUnitsToday.map((u) => u.id)
  );
  const availableUnitsToday = Math.max(
    0,
    activeUnits - assignedActiveUnitIdsToday.size
  );

  // By-category readiness
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

  // Activity feed merge
  const activity: AdminActivityItem[] = [];

  for (const e of recentStatusEvents) {
    const cust = customerLabel(e.booking?.user);
    const by = actorLabel(e.createdBy);
    const route = `${shortAddress(e.booking.pickupAddress)} → ${shortAddress(e.booking.dropoffAddress)}`;

    let title = `Booking status updated: ${statusLabel(e.status)}`;
    if (e.status === "PENDING_PAYMENT")
      title = "Booking approved (pending payment)";
    if (e.status === "CONFIRMED") title = "Booking confirmed";
    if (e.status === "CANCELLED") title = "Booking cancelled";

    activity.push({
      kind: "STATUS",
      at: e.createdAt,
      title,
      subtitle: `${cust} • ${route} • by ${by}`,
      bookingId: e.booking.id,
    });
  }

  for (const a of recentAssignments) {
    const cust = customerLabel(a.booking?.user);
    const by = actorLabel(a.assignedBy);
    const driver = actorLabel(a.driver);
    const unitName = a.vehicleUnit?.name
      ? ` • Unit: ${a.vehicleUnit.name}`
      : "";
    const route = `${shortAddress(a.booking.pickupAddress)} → ${shortAddress(a.booking.dropoffAddress)}`;

    activity.push({
      kind: "ASSIGNMENT",
      at: a.assignedAt,
      title: "Driver assigned",
      subtitle: `${cust} • ${route} • Driver: ${driver}${unitName} • by ${by}`,
      bookingId: a.booking.id,
    });
  }

  for (const p of recentPaymentsReceived) {
    const cust = customerLabel(p.booking?.user);
    const route = `${shortAddress(p.booking.pickupAddress)} → ${shortAddress(p.booking.dropoffAddress)}`;

    activity.push({
      kind: "PAYMENT_RECEIVED",
      at: p.paidAt ?? new Date(),
      title: "Payment received",
      subtitle: `${cust} • ${route}`,
      bookingId: p.booking.id,
    });
  }

  for (const pl of recentPaymentLinks) {
    const cust = customerLabel(pl.booking?.user);
    const route = `${shortAddress(pl.booking.pickupAddress)} → ${shortAddress(pl.booking.dropoffAddress)}`;

    activity.push({
      kind: "PAYMENT_LINK_SENT",
      at: pl.updatedAt,
      title: "Payment link sent",
      subtitle: `${cust} • ${route}`,
      bookingId: pl.booking.id,
    });
  }

  const activityTop10 = activity
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  return (
    <>
      <AdminPageIntro
        name='Barry'
        pendingReview={pendingReview}
        pendingPayment={pendingPayment}
        confirmed={confirmed}
      />

      <AdminQuickActions />

      <AdminAlerts alerts={alerts} />

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

      <AdminActivityFeed items={activityTop10} timeZone='America/Phoenix' />

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
