// src/lib/earnings/moneyIn.ts
//
// Money received, by payment date: fare + tip from payment records, plus
// cash recorded on multi-ride trips, minus refunds. Moved here from the
// earnings page so the earnings page, the reports page and exports all use
// one calculation.

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { db } from "@/lib/db";
import * as tz from "@/lib/timezone";
import { findTripCashPayments } from "@/lib/earnings/tripCash";

export type ChartPoint = {
  key: string;
  tick: string;
  label: string;
  baseCents: number;
  tipCents: number;
  capturedCents: number;
  refundedCents: number;
  netCents: number;
  count: number;
  refundedCount: number;
};

export function quarterKeyFromMonthKey(monthKey: string) {
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5, 7));
  const q = Math.floor((m - 1) / 3) + 1;
  return `${y}-Q${q}`;
}

export function quarterStartFromQuarterKey(key: string, timeZone: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const q = Number(match[2]);
  const startMonth = (q - 1) * 3 + 1;
  const isoDate = `${y}-${String(startMonth).padStart(2, "0")}-01`;
  return new Date(tz.localToUtcIso(isoDate, "00:00", timeZone));
}

export function quarterTick(key: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(key.trim());
  if (!match) return key;
  const yy = match[1].slice(2);
  return `Q${match[2]} ${yy}`;
}

export function quarterLabel(key: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(key.trim());
  if (!match) return key;
  return `Q${match[2]} ${match[1]}`;
}

export function yearTick(y: string) {
  return y.slice(2);
}

export function kpisFromChartData(rows: ChartPoint[]) {
  let capturedSum = 0;
  let refundedSum = 0;
  let netSum = 0;
  let tipSum = 0;
  let payCount = 0;
  let refundCount = 0;

  for (const r of rows) {
    capturedSum += Number(r.capturedCents || 0);
    refundedSum += Number(r.refundedCents || 0);
    netSum += Number(r.netCents || 0);
    tipSum += Number(r.tipCents || 0);
    payCount += Number(r.count || 0);
    refundCount += Number(r.refundedCount || 0);
  }

  const avgCents = payCount > 0 ? Math.round(capturedSum / payCount) : 0;

  return {
    capturedSumCents: capturedSum,
    refundedSumCents: refundedSum,
    netSumCents: netSum,
    tipSumCents: tipSum,
    baseSumCents: capturedSum - tipSum,
    payCount,
    refundCount,
    avgCents,
  };
}

export async function chartAggDaily(
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
): Promise<ChartPoint[]> {
  // Money received = fare + tip. A payment record keeps them separately
  // (amountPaidCents is the fare only), so add the tip back in here.
  const capturedRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
      COALESCE(SUM("amountPaidCents" + "tipCents"), 0) as sum,
      COALESCE(SUM("tipCents"), 0) as tips,
      COUNT(*) as count
    FROM "Payment"
    WHERE "paidAt" >= ${fromUtc} AND "paidAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  // ✅ Use amountRefundedCents for refunds — actual amount refunded
  const refundRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
      COALESCE(SUM("amountRefundedCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "status" IN ('REFUNDED', 'PARTIALLY_REFUNDED')
      AND "updatedAt" >= ${fromUtc} AND "updatedAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const cap = new Map<
    string,
    { sumCents: number; tipCents: number; count: number }
  >();
  for (const r of capturedRows) {
    cap.set(String(r.key), {
      sumCents: Number(r.sum || 0),
      tipCents: Number(r.tips || 0),
      count: Number(r.count || 0),
    });
  }

  // Cash recorded on a multi-ride trip is saved on the trip, not on a
  // payment record, so add it here.
  for (const t of await findTripCashPayments(fromUtc, toUtc)) {
    const key = tz.formatIsoDate(t.paidAt, timeZone);
    const c = cap.get(key) ?? { sumCents: 0, tipCents: 0, count: 0 };
    cap.set(key, { ...c, sumCents: c.sumCents + t.cents, count: c.count + 1 });
  }

  const ref = new Map<string, { sumCents: number; count: number }>();
  for (const r of refundRows) {
    ref.set(String(r.key), {
      sumCents: Number(r.sum || 0),
      count: Number(r.count || 0),
    });
  }

  const points: ChartPoint[] = [];
  for (
    let d = new Date(fromUtc.getTime());
    d.getTime() < toUtc.getTime();
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const ymd = tz.formatIsoDate(d, timeZone);
    const c = cap.get(ymd) ?? { sumCents: 0, tipCents: 0, count: 0 };
    const r = ref.get(ymd) ?? { sumCents: 0, count: 0 };
    const baseCents = c.sumCents - c.tipCents;
    points.push({
      key: ymd,
      tick: tz.formatDayTick(d, timeZone),
      label: tz.formatDateMedium(d, timeZone),
      baseCents,
      tipCents: c.tipCents,
      capturedCents: c.sumCents,
      refundedCents: r.sumCents,
      netCents: c.sumCents - r.sumCents,
      count: c.count,
      refundedCount: r.count,
    });
  }
  return points;
}

export async function chartAggMonthly(
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
): Promise<ChartPoint[]> {
  // Money received = fare + tip. A payment record keeps them separately
  // (amountPaidCents is the fare only), so add the tip back in here.
  const capturedRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COALESCE(SUM("amountPaidCents" + "tipCents"), 0) as sum,
      COALESCE(SUM("tipCents"), 0) as tips,
      COUNT(*) as count
    FROM "Payment"
    WHERE "paidAt" >= ${fromUtc} AND "paidAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  // ✅ Use amountRefundedCents for refunds — actual amount refunded
  const refundRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', "updatedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COALESCE(SUM("amountRefundedCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "status" IN ('REFUNDED', 'PARTIALLY_REFUNDED')
      AND "updatedAt" >= ${fromUtc} AND "updatedAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const cap = new Map<
    string,
    { sumCents: number; tipCents: number; count: number }
  >();
  for (const r of capturedRows) {
    cap.set(String(r.key), {
      sumCents: Number(r.sum || 0),
      tipCents: Number(r.tips || 0),
      count: Number(r.count || 0),
    });
  }

  // Cash recorded on a multi-ride trip is saved on the trip, not on a
  // payment record, so add it here.
  for (const t of await findTripCashPayments(fromUtc, toUtc)) {
    const key = tz.monthKey(t.paidAt, timeZone);
    const c = cap.get(key) ?? { sumCents: 0, tipCents: 0, count: 0 };
    cap.set(key, { ...c, sumCents: c.sumCents + t.cents, count: c.count + 1 });
  }

  const ref = new Map<string, { sumCents: number; count: number }>();
  for (const r of refundRows) {
    ref.set(String(r.key), {
      sumCents: Number(r.sum || 0),
      count: Number(r.count || 0),
    });
  }

  const months: string[] = [];
  for (
    let ms = tz.startOfMonth(fromUtc, timeZone);
    ms.getTime() < toUtc.getTime();
    ms = tz.addMonths(ms, 1, timeZone)
  ) {
    months.push(tz.monthKey(ms, timeZone));
  }

  if (months.length <= 36) {
    return months.map((k) => {
      const ms =
        tz.monthStartFromKey(k, timeZone) ?? tz.startOfMonth(fromUtc, timeZone);
      const c = cap.get(k) ?? { sumCents: 0, tipCents: 0, count: 0 };
      const r = ref.get(k) ?? { sumCents: 0, count: 0 };
      const baseCents = c.sumCents - c.tipCents;
      return {
        key: k,
        tick: tz.formatMonthTick(ms, timeZone),
        label: tz.formatMonthLabel(ms, timeZone),
        baseCents,
        tipCents: c.tipCents,
        capturedCents: c.sumCents,
        refundedCents: r.sumCents,
        netCents: c.sumCents - r.sumCents,
        count: c.count,
        refundedCount: r.count,
      };
    });
  }

  // Quarter rollup
  const qKeys: string[] = [];
  const seenQ = new Set<string>();
  for (const mk of months) {
    const qk = quarterKeyFromMonthKey(mk);
    if (!seenQ.has(qk)) {
      seenQ.add(qk);
      qKeys.push(qk);
    }
  }
  qKeys.sort((a, b) => (a < b ? -1 : 1));

  if (qKeys.length <= 36) {
    const qCap = new Map<
      string,
      { sumCents: number; tipCents: number; count: number }
    >();
    const qRef = new Map<string, { sumCents: number; count: number }>();

    for (const mk of months) {
      const qk = quarterKeyFromMonthKey(mk);
      const c = cap.get(mk) ?? { sumCents: 0, tipCents: 0, count: 0 };
      const r = ref.get(mk) ?? { sumCents: 0, count: 0 };

      const pc = qCap.get(qk) ?? { sumCents: 0, tipCents: 0, count: 0 };
      qCap.set(qk, {
        sumCents: pc.sumCents + c.sumCents,
        tipCents: pc.tipCents + c.tipCents,
        count: pc.count + c.count,
      });

      const pr = qRef.get(qk) ?? { sumCents: 0, count: 0 };
      qRef.set(qk, {
        sumCents: pr.sumCents + r.sumCents,
        count: pr.count + r.count,
      });
    }

    return qKeys.map((qk) => {
      const qs =
        quarterStartFromQuarterKey(qk, timeZone) ??
        tz.startOfMonth(fromUtc, timeZone);
      const c = qCap.get(qk) ?? { sumCents: 0, tipCents: 0, count: 0 };
      const r = qRef.get(qk) ?? { sumCents: 0, count: 0 };
      const baseCents = c.sumCents - c.tipCents;
      return {
        key: qk,
        tick: quarterTick(qk),
        label: quarterLabel(qk),
        baseCents,
        tipCents: c.tipCents,
        capturedCents: c.sumCents,
        refundedCents: r.sumCents,
        netCents: c.sumCents - r.sumCents,
        count: c.count,
        refundedCount: r.count,
      };
    });
  }

  // Year rollup
  const years: string[] = [];
  const seenY = new Set<string>();
  for (const mk of months) {
    const y = mk.slice(0, 4);
    if (!seenY.has(y)) {
      seenY.add(y);
      years.push(y);
    }
  }
  years.sort((a, b) => (a < b ? -1 : 1));

  const yCap = new Map<
    string,
    { sumCents: number; tipCents: number; count: number }
  >();
  const yRef = new Map<string, { sumCents: number; count: number }>();

  for (const mk of months) {
    const y = mk.slice(0, 4);
    const c = cap.get(mk) ?? { sumCents: 0, tipCents: 0, count: 0 };
    const r = ref.get(mk) ?? { sumCents: 0, count: 0 };

    const pc = yCap.get(y) ?? { sumCents: 0, tipCents: 0, count: 0 };
    yCap.set(y, {
      sumCents: pc.sumCents + c.sumCents,
      tipCents: pc.tipCents + c.tipCents,
      count: pc.count + c.count,
    });

    const pr = yRef.get(y) ?? { sumCents: 0, count: 0 };
    yRef.set(y, {
      sumCents: pr.sumCents + r.sumCents,
      count: pr.count + r.count,
    });
  }

  return years.map((y) => {
    const c = yCap.get(y) ?? { sumCents: 0, tipCents: 0, count: 0 };
    const r = yRef.get(y) ?? { sumCents: 0, count: 0 };
    const baseCents = c.sumCents - c.tipCents;
    return {
      key: y,
      tick: yearTick(y),
      label: y,
      baseCents,
      tipCents: c.tipCents,
      capturedCents: c.sumCents,
      refundedCents: r.sumCents,
      netCents: c.sumCents - r.sumCents,
      count: c.count,
      refundedCount: r.count,
    };
  });
}

/** Money received (fare + tip) by service type, by payment date. */
export async function getRevenueByServiceType(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<
    { name: string; totalCents: bigint; count: bigint }[]
  >`
    SELECT
      st.name,
      COALESCE(SUM(p."amountPaidCents" + p."tipCents"), 0) as "totalCents",
      COUNT(p.id) as count
    FROM "Payment" p
    JOIN "Booking" b ON p."bookingId" = b.id
    JOIN "ServiceType" st ON b."serviceTypeId" = st.id
    WHERE p."paidAt" >= ${fromUtc} AND p."paidAt" < ${toUtc}
    GROUP BY st.name
    ORDER BY "totalCents" DESC
  `;

  return rows.map((r) => ({
    name: r.name,
    value: Number(r.totalCents),
    count: Number(r.count),
  }));
}

/** Money received (fare + tip) by vehicle, by payment date. */
export async function getRevenueByVehicle(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<
    { name: string; totalCents: bigint; count: bigint }[]
  >`
    SELECT
      COALESCE(v.name, 'Unassigned') as name,
      COALESCE(SUM(p."amountPaidCents" + p."tipCents"), 0) as "totalCents",
      COUNT(p.id) as count
    FROM "Payment" p
    JOIN "Booking" b ON p."bookingId" = b.id
    LEFT JOIN "Vehicle" v ON b."vehicleId" = v.id
    WHERE p."paidAt" >= ${fromUtc} AND p."paidAt" < ${toUtc}
    GROUP BY v.name
    ORDER BY "totalCents" DESC
  `;

  return rows.map((r) => ({
    name: r.name,
    value: Number(r.totalCents),
    count: Number(r.count),
  }));
}
