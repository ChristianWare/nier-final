/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export type AdminFinanceSnapshotChartPoint = {
  key: string; // YYYY-MM-DD (Phoenix)
  tick: string; // MM/DD
  label: string; // "Jan 21, 2026"
  capturedCents: number;
  refundedCents: number;
  netCents: number;
  count: number; // payments count
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

/**
 * ✅ Daily chart points for Month-to-Date (Phoenix time).
 * Produces one point per day from month start → today (inclusive), filling gaps with zeros.
 * Matches the working pattern from AdminEarningsPage.
 */
async function getMonthToDateDailyChart(
  now: Date,
  timeZone: string,
): Promise<AdminFinanceSnapshotChartPoint[]> {
  const monthStart = tz.startOfMonth(now, timeZone);
  const todayStart = tz.startOfDay(now, timeZone);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const fromUtc = monthStart;
  const toUtc = tomorrowStart;

  // ✅ Exactly matches working AdminEarningsPage chartAggDaily
  const capturedRows = (await db.$queryRaw<any[]>`
  SELECT
    to_char(date_trunc('day', "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
    COALESCE(SUM("amountTotalCents"), 0) as sum,
    COUNT(*) as count
  FROM "Payment"
  WHERE "paidAt" >= ${fromUtc} AND "paidAt" < ${toUtc}
  GROUP BY 1
  ORDER BY 1 ASC
`) as any[];

  // ✅ Exactly matches working AdminEarningsPage chartAggDaily
  const refundRows = (await db.$queryRaw<any[]>`
  SELECT
    to_char(date_trunc('day', "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
    COALESCE(SUM("amountTotalCents"), 0) as sum,
    COUNT(*) as count
  FROM "Payment"
  WHERE "status" IN ('REFUNDED', 'PARTIALLY_REFUNDED')
    AND "updatedAt" >= ${fromUtc} AND "updatedAt" < ${toUtc}
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

  for (
    let d = new Date(fromUtc.getTime());
    d.getTime() < toUtc.getTime();
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const key = tz.formatIsoDate(d, timeZone);

    const c = cap.get(key) ?? { sumCents: 0, count: 0 };
    const r = ref.get(key) ?? { sumCents: 0, count: 0 };
    const net = c.sumCents - r.sumCents;

    points.push({
      key,
      tick: tz.formatDayTick(d, timeZone),
      label: tz.formatDateMedium(d, timeZone),
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
  const { timezone: companyTz } = await getCompanySettings();
  const todayStart = tz.startOfDay(now, companyTz);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const monthStart = tz.startOfMonth(now, companyTz);
  const nextMonthStart = tz.addMonths(monthStart, 1, companyTz);
  const prevMonthStart = tz.addMonths(monthStart, -1, companyTz);

  const [
    paidMonthAgg,
    paidTodayAgg,
    paidPrevMonthAgg,
    refundsMonthAgg,
    pendingBookingAgg,
    chartData,
  ] = await Promise.all([
    // ✅ Captured this month - filter by paidAt in range
    db.payment.aggregate({
      where: {
        paidAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    // ✅ Captured today - filter by paidAt in range
    db.payment.aggregate({
      where: {
        paidAt: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    // ✅ Captured previous month - filter by paidAt in range
    db.payment.aggregate({
      where: {
        paidAt: { gte: prevMonthStart, lt: monthStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    // ✅ Refunds this month
    db.payment.aggregate({
      where: {
        status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] as any },
        updatedAt: { gte: monthStart, lt: nextMonthStart },
      },
      _sum: { amountTotalCents: true },
      _count: { _all: true },
    }),

    // Pending payment bookings
    db.booking.aggregate({
      where: {
        status: "PENDING_PAYMENT",
        pickupAt: { gte: now },
      },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),

    // ✅ Daily (month-to-date) chart
    getMonthToDateDailyChart(now, companyTz),
  ]);

  const capturedMonthCents = Number(paidMonthAgg._sum?.amountTotalCents ?? 0);
  const paidCountMonth = Number((paidMonthAgg._count as any)?._all ?? 0);

  const capturedTodayCents = Number(paidTodayAgg._sum?.amountTotalCents ?? 0);

  const refundsMonthCents = Number(refundsMonthAgg._sum?.amountTotalCents ?? 0);
  const refundCountMonth = Number((refundsMonthAgg._count as any)?._all ?? 0);

  const pendingPaymentCount = Number(
    (pendingBookingAgg._count as any)?._all ?? 0,
  );
  const pendingPaymentAmountCents = Number(
    pendingBookingAgg._sum?.totalCents ?? 0,
  );

  const avgOrderValueMonthCents =
    paidCountMonth > 0 ? Math.round(capturedMonthCents / paidCountMonth) : 0;

  const prevMonthCents = Number(paidPrevMonthAgg._sum?.amountTotalCents ?? 0);
  const monthOverMonthPct =
    prevMonthCents > 0
      ? ((capturedMonthCents - prevMonthCents) / prevMonthCents) * 100
      : null;

  return {
    monthLabel: tz.formatMonthLabel(now, companyTz),
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
