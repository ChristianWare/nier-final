/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";

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

function startOfMonthPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();

  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;

  return new Date(startUtcMs);
}

function addMonthsPhoenixStart(monthStartUtc: Date, months: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();

  const nextLocalMs = Date.UTC(y, m + months, 1, 0, 0, 0);
  const nextUtcMs = nextLocalMs - PHX_OFFSET_MS;

  return new Date(nextUtcMs);
}

function monthLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "long",
    year: "numeric",
  }).format(dateUtc);
}

function monthTickPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    year: "2-digit",
  }).format(dateUtc);
}

function monthShortLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    year: "numeric",
  }).format(dateUtc);
}

function monthKeyFromDatePhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export type AdminFinanceSnapshotChartPoint = {
  key: string;
  tick: string;
  label: string;
  capturedCents: number;
  refundedCents: number;
  netCents: number;
  count: number;
};

export type AdminFinanceSnapshotData = {
  monthLabel: string;
  currency: string;

  capturedMonthCents: number;
  capturedTodayCents: number;

  paidCountMonth: number;
  avgOrderValueMonthCents: number;

  refundsMonthCents: number;
  refundCountMonth: number;

  pendingPaymentCount: number;
  pendingPaymentAmountCents: number;

  monthOverMonthPct: number | null;

  chartData: AdminFinanceSnapshotChartPoint[];
};

async function getLast12MonthsChart(
  now: Date,
): Promise<AdminFinanceSnapshotChartPoint[]> {
  const currentMonthStart = startOfMonthPhoenix(now);
  const nextAfterCurrent = addMonthsPhoenixStart(currentMonthStart, 1);
  const oldestMonthStart = addMonthsPhoenixStart(currentMonthStart, -11);

  const capturedRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', "paidAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM') as key,
      COALESCE(SUM("amountTotalCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "status" = 'PAID'
      AND "paidAt" >= ${oldestMonthStart} AND "paidAt" < ${nextAfterCurrent}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const refundRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', "updatedAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM') as key,
      COALESCE(SUM("amountTotalCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "status" IN ('REFUNDED', 'PARTIALLY_REFUNDED')
      AND "updatedAt" >= ${oldestMonthStart} AND "updatedAt" < ${nextAfterCurrent}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const cap = new Map<string, { sumCents: number; count: number }>();
  for (const r of capturedRows) {
    const k = String(r.key);
    cap.set(k, { sumCents: Number(r.sum || 0), count: Number(r.count || 0) });
  }

  const ref = new Map<string, { sumCents: number; count: number }>();
  for (const r of refundRows) {
    const k = String(r.key);
    ref.set(k, { sumCents: Number(r.sum || 0), count: Number(r.count || 0) });
  }

  const points: AdminFinanceSnapshotChartPoint[] = [];

  for (let i = 0; i < 12; i++) {
    const ms = addMonthsPhoenixStart(oldestMonthStart, i);
    const key = monthKeyFromDatePhoenix(ms);

    const c = cap.get(key) ?? { sumCents: 0, count: 0 };
    const r = ref.get(key) ?? { sumCents: 0, count: 0 };
    const net = Math.max(0, c.sumCents - r.sumCents);

    points.push({
      key,
      tick: monthTickPhoenix(ms),
      label: monthShortLabelPhoenix(ms),
      capturedCents: c.sumCents,
      refundedCents: r.sumCents,
      netCents: net,
      count: c.count,
    });
  }

  return points;
}

export async function getAdminFinanceSnapshot(
  now: Date,
): Promise<AdminFinanceSnapshotData> {
  const todayStart = startOfDayPhoenix(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = addMonthsPhoenixStart(monthStart, 1);
  const prevMonthStart = addMonthsPhoenixStart(monthStart, -1);

  const [
    paidMonthAgg,
    paidTodayAgg,
    paidPrevMonthAgg,
    refundsMonthAgg,
    pendingBookingAgg,
    chartData,
  ] = await Promise.all([
    db.payment.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    db.payment.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    db.payment.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: prevMonthStart, lt: monthStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    db.payment.aggregate({
      where: {
        status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] as any },
        updatedAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    db.booking.aggregate({
      where: {
        status: "PENDING_PAYMENT",
        pickupAt: { gte: now },
      },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),

    getLast12MonthsChart(now),
  ]);

  const capturedMonthCents = Number(paidMonthAgg._sum.amountTotalCents ?? 0);
  const paidCountMonth = Number(paidMonthAgg._count._all ?? 0);

  const capturedTodayCents = Number(paidTodayAgg._sum.amountTotalCents ?? 0);

  const refundsMonthCents = Number(refundsMonthAgg._sum.amountTotalCents ?? 0);
  const refundCountMonth = Number(refundsMonthAgg._count._all ?? 0);

  const pendingPaymentCount = Number(pendingBookingAgg._count._all ?? 0);
  const pendingPaymentAmountCents = Number(
    pendingBookingAgg._sum.totalCents ?? 0,
  );

  const avgOrderValueMonthCents =
    paidCountMonth > 0 ? Math.round(capturedMonthCents / paidCountMonth) : 0;

  const prevMonthCents = Number(paidPrevMonthAgg._sum.amountTotalCents ?? 0);
  const monthOverMonthPct =
    prevMonthCents > 0
      ? ((capturedMonthCents - prevMonthCents) / prevMonthCents) * 100
      : null;

  return {
    monthLabel: monthLabelPhoenix(now),
    currency: "USD",

    capturedMonthCents,
    capturedTodayCents,

    paidCountMonth,
    avgOrderValueMonthCents,

    refundsMonthCents,
    refundCountMonth,

    pendingPaymentCount,
    pendingPaymentAmountCents,

    monthOverMonthPct,

    chartData,
  };
}
