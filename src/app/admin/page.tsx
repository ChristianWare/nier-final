/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./AdminStyles.module.css";
import AdminPageIntro from "@/components/admin/AdminPageIntro/AdminPageIntro";
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
import AdminRecentBookingRequests, {
  RecentBookingRequestItem,
} from "@/components/admin/AdminRecentBookingRequests/AdminRecentBookingRequests";
import AdminUpcomingRides, {
  UpcomingRideItem,
} from "@/components/admin/Adminupcomingrides/Adminupcomingrides";
import AdminFinanceSnapshot from "@/components/admin/AdminFinanceSnapshot/AdminFinanceSnapshot";
import AdminPaymentsSnapshot, {
  PaymentItem,
} from "@/components/admin/AdminPaymentsSnapshot/AdminPaymentsSnapshot";
import { db } from "@/lib/db";
import { getBookingWizardSetupAlerts } from "./lib/getBookingWizardSetupAlerts";
import { getAdminFinanceSnapshot } from "./lib/getAdminFinanceSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

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

function startOfWeekPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const dayOfWeek = phx.getUTCDay(); // 0 = Sunday
  const daysToSubtract = dayOfWeek; // Go back to Sunday

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const d = phx.getUTCDate() - daysToSubtract;

  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;

  return new Date(startUtcMs);
}

function startOfMonthPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();

  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;

  return new Date(startUtcMs);
}

function startOfNextMonthPhoenix(monthStartUtc: Date) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();

  const nextStartLocalMs = Date.UTC(y, m + 1, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;

  return new Date(nextStartUtcMs);
}

function formatMonthLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: PHX_TZ,
  }).format(dateUtc);
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function actorLabel(
  user: { name: string | null; email: string } | null | undefined,
) {
  if (!user) return "System";
  return user.name?.trim() || user.email;
}

function customerLabel(
  user: { name: string | null; email: string } | null | undefined,
) {
  if (!user) return "Customer";
  return user.name?.trim() || user.email;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

/**
 * Finance helpers
 */
async function safeCapturedAgg({
  from,
  to,
}: {
  from: Date;
  to: Date;
}): Promise<{ sumCents: number; count: number; avgCents: number }> {
  try {
    const agg = await (db.payment as any).aggregate({
      where: { paidAt: { gte: from, lt: to } },
      _sum: { amountCents: true },
      _avg: { amountCents: true },
      _count: { _all: true },
    });

    const sumCents = Number(agg?._sum?.amountCents ?? 0);
    const count = Number(agg?._count?._all ?? 0);
    const avgCents = Number(agg?._avg?.amountCents ?? 0);

    return { sumCents, count, avgCents };
  } catch {
    const rows = await db.payment.findMany({
      where: { paidAt: { gte: from, lt: to } },
    });

    const sumCents = (rows as any[]).reduce((sum, p) => {
      const v =
        p.amountCents ??
        p.totalCents ??
        p.totalAmountCents ??
        p.amountDueCents ??
        0;
      return sum + Number(v || 0);
    }, 0);

    const count = rows.length;
    const avgCents = count > 0 ? Math.round(sumCents / count) : 0;

    return { sumCents, count, avgCents };
  }
}

async function safeRefundAgg({
  from,
  to,
}: {
  from: Date;
  to: Date;
}): Promise<{ sumCents: number; count: number }> {
  try {
    const agg = await (db.payment as any).aggregate({
      where: {
        refundedAt: { gte: from, lt: to },
      },
      _sum: { refundedCents: true },
      _count: { _all: true },
    });

    const sumCents = Number(agg?._sum?.refundedCents ?? 0);
    const count = Number(agg?._count?._all ?? 0);

    return { sumCents, count };
  } catch {
    return { sumCents: 0, count: 0 };
  }
}

async function safePendingPaymentEstimate(): Promise<{
  sumCents: number;
}> {
  try {
    const agg = await (db.payment as any).aggregate({
      where: {
        paidAt: null,
        stripeCheckoutSessionId: { not: null },
        booking: { status: "PENDING_PAYMENT" },
      },
      _sum: { amountCents: true },
    });

    return { sumCents: Number(agg?._sum?.amountCents ?? 0) };
  } catch {
    const rows = await (db.payment as any).findMany({
      where: {
        paidAt: null,
        stripeCheckoutSessionId: { not: null },
        booking: { status: "PENDING_PAYMENT" },
      },
    });

    const sumCents = (rows as any[]).reduce((sum, p) => {
      const v =
        p.amountCents ??
        p.totalCents ??
        p.totalAmountCents ??
        p.amountDueCents ??
        0;
      return sum + Number(v || 0);
    }, 0);

    return { sumCents };
  }
}

// ✅ Transform payment data helper
function transformPayment(p: any, isLink = false): PaymentItem {
  const customerName =
    p.booking?.user?.name?.trim() || p.booking?.guestName?.trim() || "Customer";
  const customerEmail = p.booking?.user?.email || p.booking?.guestEmail || null;

  return {
    id: p.id,
    bookingId: p.booking?.id ?? "",
    paidAt: isLink ? (p.updatedAt ?? p.createdAt) : p.paidAt,
    amountCents: p.amountPaidCents ?? p.amountTotalCents ?? p.amountCents ?? 0,
    tipCents: p.tipCents ?? 0,
    currency: p.currency ?? "usd",
    status: p.paidAt ? "PAID" : "PENDING",
    customerName,
    customerEmail,
    pickupAddress: p.booking?.pickupAddress ?? "",
    dropoffAddress: p.booking?.dropoffAddress ?? "",
    serviceName: p.booking?.serviceType?.name ?? "—",
  };
}

export default async function AdminHome() {
  const now = new Date();

  const todayStart = startOfDayPhoenix(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterStart = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = startOfWeekPhoenix(now);

  const next3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const next12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const stuckCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const verifiedCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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

    unassignedWithin24hCount,
    pendingPaymentWithin12hCount,

    unassignedSoon,
    pendingPaymentSoon,
    stuckReview,

    todayTotal,
    todayConfirmed,
    todayUnassigned,
    tomorrowTotal,
    tomorrowConfirmed,
    tomorrowUnassigned,
    tripsNext3Hours,
    earliestUpcoming,

    activeDrivers,
    driversAssignedTodayDistinct,

    activeUnits,
    inactiveUnits,
    activeUnitsByCategory,
    assignedActiveUnitsToday,

    recentBookingRequestsRaw,

    upcomingRidesRaw,

    recentStatusEvents,
    recentAssignments,
    recentPaymentsReceived,
    recentPaymentLinks,

    newVerifiedUsersCount,
    latestVerifiedUser,

    // ✅ New payment queries
    paymentsReceivedTodayRaw,
    paymentsReceivedWeekRaw,
    paymentLinksTodayRaw,
    paymentLinksWeekRaw,
  ] = await Promise.all([
    db.booking.count({ where: { status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { status: "PENDING_PAYMENT" } }),
    db.booking.count({ where: { status: "CONFIRMED" } }),

    db.booking.count({
      where: {
        pickupAt: { gte: now, lt: next24h },
        assignment: { is: null },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),

    db.booking.count({
      where: {
        status: "PENDING_PAYMENT",
        pickupAt: { gte: now, lt: next12h },
      },
    }),

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
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        serviceType: { select: { name: true } },
        assignment: {
          select: { driver: { select: { name: true, email: true } } },
        },
      },
    }),

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
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        serviceType: { select: { name: true } },
        assignment: {
          select: { driver: { select: { name: true, email: true } } },
        },
      },
    }),

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
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        serviceType: { select: { name: true } },
        assignment: {
          select: { driver: { select: { name: true, email: true } } },
        },
      },
    }),

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

    db.booking.count({
      where: {
        pickupAt: { gte: now, lt: next3h },
        NOT: { status: { in: cancelledLike as any } },
      },
    }),

    db.booking.findFirst({
      where: {
        pickupAt: { gte: now },
        NOT: { status: { in: cancelledLike as any } },
      },
      orderBy: [{ pickupAt: "asc" }],
      select: { pickupAt: true },
    }),

    db.user.count({ where: { roles: { has: "DRIVER" } } }),
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

    // Recent booking requests - only PENDING_REVIEW
    db.booking.findMany({
      where: {
        status: "PENDING_REVIEW",
      },
      orderBy: [{ createdAt: "desc" }],
      take: 25,
      select: {
        id: true,
        status: true,
        createdAt: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        specialRequests: true,
        userId: true,
        user: { select: { name: true, email: true, emailVerified: true } },
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        serviceType: { select: { name: true, airportLeg: true } },
        vehicle: { select: { name: true } },
      },
    }),

    // Upcoming rides - CONFIRMED bookings with pickup in the future
    db.booking.findMany({
      where: {
        status: "CONFIRMED",
        pickupAt: { gte: now },
      },
      orderBy: [{ pickupAt: "asc" }],
      take: 10,
      select: {
        id: true,
        status: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        totalCents: true,
        currency: true,
        user: { select: { name: true, email: true } },
        guestName: true,
        guestEmail: true,
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        assignment: {
          select: {
            driver: { select: { name: true, email: true } },
          },
        },
      },
    }),

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

    db.user.count({
      where: {
        emailVerified: { not: null, gte: verifiedCutoff },
      },
    }),

    db.user.findFirst({
      where: {
        emailVerified: { not: null, gte: verifiedCutoff },
      },
      orderBy: [{ emailVerified: "desc" }],
      select: { name: true, email: true, emailVerified: true },
    }),

    // ✅ Payments received today
    db.payment.findMany({
      where: {
        paidAt: { gte: todayStart, lt: tomorrowStart },
      },
      orderBy: [{ paidAt: "desc" }],
      take: 20,
      select: {
        id: true,
        paidAt: true,
        amountPaidCents: true,
        amountTotalCents: true,
        tipCents: true,
        currency: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
            serviceType: { select: { name: true } },
          },
        },
      },
    }),

    // ✅ Payments received this week
    db.payment.findMany({
      where: {
        paidAt: { gte: weekStart, lt: tomorrowStart },
      },
      orderBy: [{ paidAt: "desc" }],
      take: 50,
      select: {
        id: true,
        paidAt: true,
        amountPaidCents: true,
        amountTotalCents: true,
        tipCents: true,
        currency: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
            serviceType: { select: { name: true } },
          },
        },
      },
    }),

    // ✅ FIXED: Payment links sent today - use updatedAt instead of createdAt
    db.payment.findMany({
      where: {
        updatedAt: { gte: todayStart, lt: tomorrowStart },
        stripeCheckoutSessionId: { not: null },
        paidAt: null,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
      select: {
        id: true,
        updatedAt: true,
        amountTotalCents: true,
        tipCents: true,
        currency: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
            serviceType: { select: { name: true } },
          },
        },
      },
    }),

    // ✅ FIXED: Payment links sent this week - use updatedAt instead of createdAt
    db.payment.findMany({
      where: {
        updatedAt: { gte: weekStart, lt: tomorrowStart },
        stripeCheckoutSessionId: { not: null },
        paidAt: null,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        updatedAt: true,
        amountTotalCents: true,
        tipCents: true,
        currency: true,
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
            serviceType: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const driversAssignedToday = driversAssignedTodayDistinct.length;

  const setupAlerts = await getBookingWizardSetupAlerts();

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

  if (newVerifiedUsersCount > 0) {
    const who =
      latestVerifiedUser?.name?.trim() ||
      latestVerifiedUser?.email ||
      "a new user";

    alerts.push({
      id: "new-verified-users",
      severity: newVerifiedUsersCount >= 10 ? "warning" : "info",
      message: `${newVerifiedUsersCount} new verified user(s) in the last 24 hours (latest: ${who})`,
      href: "/admin/users",
      ctaLabel: "View users",
    });
  }

  alerts.unshift(...setupAlerts);

  const recentBookingRequests: RecentBookingRequestItem[] =
    recentBookingRequestsRaw.map((b: any) => {
      const isAccount = Boolean(b.userId);

      return {
        id: b.id,
        status: b.status,
        createdAtIso: new Date(b.createdAt).toISOString(),
        pickupAtIso: new Date(b.pickupAt).toISOString(),
        pickupAddress: b.pickupAddress,
        dropoffAddress: b.dropoffAddress,
        serviceName: b.serviceType?.name ?? "—",
        vehicleName: b.vehicle?.name ?? null,
        airportLeg: (b.serviceType?.airportLeg ?? "NONE") as any,
        specialRequests: b.specialRequests ?? null,
        customer: isAccount
          ? {
              kind: "account",
              name: (b.user?.name ?? "").trim() || b.user?.email || "Account",
              email: b.user?.email ?? null,
              verified: Boolean(b.user?.emailVerified),
            }
          : {
              kind: "guest",
              name: (b.guestName ?? "").trim() || "Guest",
              email: b.guestEmail ?? null,
              phone: b.guestPhone ?? null,
            },
      };
    });

  // Transform upcoming rides data
  const upcomingRides: UpcomingRideItem[] = upcomingRidesRaw.map((b: any) => {
    const customerName =
      b.user?.name?.trim() || b.guestName?.trim() || "Customer";
    const customerEmail = b.user?.email || b.guestEmail || null;
    const driverName = b.assignment?.driver?.name?.trim() || null;

    return {
      id: b.id,
      status: b.status,
      pickupAtIso: new Date(b.pickupAt).toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      serviceName: b.serviceType?.name ?? "—",
      vehicleName: b.vehicle?.name ?? null,
      driverName,
      totalCents: b.totalCents ?? 0,
      currency: b.currency ?? "usd",
      customer: {
        name: customerName,
        email: customerEmail,
      },
    };
  });

  // ✅ Transform payment data
  const paymentsToday: PaymentItem[] = (paymentsReceivedTodayRaw as any[]).map(
    (p) => transformPayment(p),
  );
  const paymentsThisWeek: PaymentItem[] = (
    paymentsReceivedWeekRaw as any[]
  ).map((p) => transformPayment(p));
  const paymentLinksToday: PaymentItem[] = (paymentLinksTodayRaw as any[]).map(
    (p) => transformPayment(p, true),
  );
  const paymentLinksThisWeek: PaymentItem[] = (
    paymentLinksWeekRaw as any[]
  ).map((p) => transformPayment(p, true));

  const assignedActiveUnitIdsToday = new Set(
    (assignedActiveUnitsToday as any[]).map((u) => u.id),
  );
  const availableUnitsToday = Math.max(
    0,
    activeUnits - assignedActiveUnitIdsToday.size,
  );

  const assignedByCategory = new Map<string, number>();
  for (const u of assignedActiveUnitsToday as any[]) {
    const key = u.categoryId ?? "unassigned";
    assignedByCategory.set(key, (assignedByCategory.get(key) ?? 0) + 1);
  }

  const categoryIds = (activeUnitsByCategory as any[])
    .map((g) => g.categoryId)
    .filter((x): x is string => typeof x === "string");

  const categoryRows = categoryIds.length
    ? await db.vehicle.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];

  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));

  const byCategory: VehicleCategoryReadiness[] = (
    activeUnitsByCategory as any[]
  )
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

  const activity: AdminActivityItem[] = [];

  for (const e of recentStatusEvents as any[]) {
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

  for (const a of recentAssignments as any[]) {
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

  for (const p of recentPaymentsReceived as any[]) {
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

  for (const pl of recentPaymentLinks as any[]) {
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
    .slice(0, 5);

  /**
   * FINANCE SNAPSHOT DATA
   */
  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = startOfNextMonthPhoenix(monthStart);
  const prevMonthStart = startOfMonthPhoenix(
    new Date(monthStart.getTime() - 1),
  );

  const monthLabel = formatMonthLabelPhoenix(now);

  const [
    capturedThisMonth,
    capturedToday,
    capturedPrevMonth,
    refundsThisMonth,
    refundsPrevMonth,
    pendingEstimate,
  ] = await Promise.all([
    safeCapturedAgg({ from: monthStart, to: nextMonthStart }),
    safeCapturedAgg({ from: todayStart, to: tomorrowStart }),
    safeCapturedAgg({ from: prevMonthStart, to: monthStart }),
    safeRefundAgg({ from: monthStart, to: nextMonthStart }),
    safeRefundAgg({ from: prevMonthStart, to: monthStart }),
    safePendingPaymentEstimate(),
  ]);

  const netMonthCents = Math.max(
    0,
    capturedThisMonth.sumCents - refundsThisMonth.sumCents,
  );
  const netPrevCents = Math.max(
    0,
    capturedPrevMonth.sumCents - refundsPrevMonth.sumCents,
  );

  const monthOverMonthPct =
    netPrevCents > 0
      ? ((netMonthCents - netPrevCents) / netPrevCents) * 100
      : null;

  const snap = await getAdminFinanceSnapshot(now);

  return (
    <section className={styles.content}>
      <AdminPageIntro
        pendingReview={pendingReview}
        pendingPayment={pendingPayment}
        confirmed={confirmed}
      />
      <AdminFinanceSnapshot {...snap} currency='USD' />

      <AdminAlerts alerts={alerts} />

      {/* ✅ New Payments Snapshot - placed under alerts */}
      <AdminPaymentsSnapshot
        paymentsToday={paymentsToday}
        paymentsThisWeek={paymentsThisWeek}
        paymentLinksToday={paymentLinksToday}
        paymentLinksThisWeek={paymentLinksThisWeek}
        timeZone={PHX_TZ}
        bookingHrefBase='/admin/bookings'
      />

      <AdminRecentBookingRequests
        items={recentBookingRequests}
        timeZone={PHX_TZ}
        bookingHrefBase='/admin/bookings'
      />

      <AdminUpcomingRides
        items={upcomingRides}
        timeZone={PHX_TZ}
        bookingHrefBase='/admin/bookings'
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
        timeZone={PHX_TZ}
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

      <AdminActivityFeed items={activityTop10} timeZone={PHX_TZ} />

      <AdminUrgentQueue
        unassignedSoon={unassignedSoon as unknown as UrgentBookingItem[]}
        pendingPaymentSoon={
          pendingPaymentSoon as unknown as UrgentBookingItem[]
        }
        stuckReview={stuckReview as unknown as UrgentBookingItem[]}
        timeZone={PHX_TZ}
      />
    </section>
  );
}
