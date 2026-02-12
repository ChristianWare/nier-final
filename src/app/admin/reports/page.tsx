/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./AdminReportsPage.module.css";
import { db } from "@/lib/db";
import base from "../AdminStyles.module.css";
import ReportsControls from "./Reportscontrols";
import RevenueChart from "./Revenuechart";
import StatusPieChart from "./StatusPieChart";
import LeadTimePieChart from "./LeadTimePieChart";
import PeakTimesPieChart from "./PeakTimesPieChart";
import CountUp from "@/components/shared/CountUp/CountUp";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ViewMode = "daily" | "monthly" | "ytd" | "all" | "range";
type SP = Record<string, string | string[] | undefined>;

function spGet(sp: SP, key: string) {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return typeof v === "string" ? v : null;
}

function cleanView(v: string | null | undefined): ViewMode {
  if (v === "month") return "daily";
  if (
    v === "daily" ||
    v === "monthly" ||
    v === "ytd" ||
    v === "all" ||
    v === "range"
  )
    return v;
  return "daily";
}

function parseYMD(s: string | null) {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function startOfDayFromYMD(
  ymd: { y: number; m: number; d: number },
  timeZone: string,
) {
  const isoDate = `${ymd.y}-${String(ymd.m).padStart(2, "0")}-${String(ymd.d).padStart(2, "0")}`;
  return new Date(tz.localToUtcIso(isoDate, "00:00", timeZone));
}

function resolveMonthYear({
  view,
  sp,
  now,
  timeZone,
}: {
  view: ViewMode;
  sp: SP;
  now: Date;
  timeZone: string;
}) {
  const currentKey = tz.monthKey(now, timeZone);
  const currentYear = currentKey.slice(0, 4);
  const currentMonth = currentKey.slice(5, 7);

  const rawMonth = spGet(sp, "month");
  const rawYear = spGet(sp, "year");

  const legacyKey =
    rawMonth && tz.monthStartFromKey(rawMonth, timeZone) ? rawMonth : null;

  if (view !== "daily")
    return { year: currentYear, month: currentMonth, key: currentKey };

  if (legacyKey) {
    return {
      year: legacyKey.slice(0, 4),
      month: legacyKey.slice(5, 7),
      key: legacyKey,
    };
  }

  const y = rawYear && /^\d{4}$/.test(rawYear) ? rawYear : currentYear;
  const m =
    rawMonth && /^(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentMonth;

  return { year: y, month: m, key: `${y}-${m}` };
}

function quarterKeyFromMonthKey(monthKey: string) {
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5, 7));
  const q = Math.floor((m - 1) / 3) + 1;
  return `${y}-Q${q}`;
}

function quarterStartFromQuarterKey(key: string, timeZone: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const q = Number(match[2]);
  const startMonth = (q - 1) * 3 + 1;
  const isoDate = `${y}-${String(startMonth).padStart(2, "0")}-01`;
  return new Date(tz.localToUtcIso(isoDate, "00:00", timeZone));
}

function quarterTick(key: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(key.trim());
  if (!match) return key;
  const yy = match[1].slice(2);
  return `Q${match[2]} ${yy}`;
}

function quarterLabel(key: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(key.trim());
  if (!match) return key;
  return `Q${match[2]} ${match[1]}`;
}

function yearTick(y: string) {
  return y.slice(2);
}

function kpisFromChartData(
  rows: {
    capturedCents: number;
    refundedCents: number;
    netCents: number;
    count: number;
    refundedCount?: number;
  }[],
) {
  let capturedSum = 0;
  let refundedSum = 0;
  let netSum = 0;
  let payCount = 0;
  let refundCount = 0;

  for (const r of rows) {
    capturedSum += Number(r.capturedCents || 0);
    refundedSum += Number(r.refundedCents || 0);
    netSum += Number(r.netCents || 0);
    payCount += Number(r.count || 0);
    refundCount += Number(r.refundedCount || 0);
  }

  const avgCents = payCount > 0 ? Math.round(capturedSum / payCount) : 0;

  return {
    capturedSumCents: capturedSum,
    refundedSumCents: refundedSum,
    netSumCents: netSum,
    payCount,
    refundCount,
    avgCents,
  };
}

function chartHeadingFromData(view: ViewMode, data: { key: string }[]) {
  if (view === "daily") return "Daily revenue";
  const k = data?.[0]?.key ?? "";
  if (/^\d{4}-Q[1-4]$/.test(k)) return "Quarterly revenue";
  if (/^\d{4}$/.test(k)) return "Yearly revenue";
  return "Monthly revenue";
}

function parseValue(str: string): {
  value: number;
  prefix: string;
  suffix: string;
} {
  const cleaned = str.replace(/,/g, "").trim();
  const match = cleaned.match(/^([^\d.-]*)([+-]?\d+(?:\.\d+)?)([^\d]*)$/);

  if (match) {
    const prefix = match[1] || "";
    const value = parseFloat(match[2]) || 0;
    const suffix = match[3] || "";
    return { value, prefix, suffix };
  }

  const numValue = parseFloat(cleaned);
  if (!isNaN(numValue)) {
    return { value: numValue, prefix: "", suffix: "" };
  }

  return { value: 0, prefix: "", suffix: str };
}

// ============================================
// REVENUE DATA AGGREGATION
// ============================================

async function chartAggDaily(fromUtc: Date, toUtc: Date, timeZone: string) {
  const capturedRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', "paidAt" AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
      COALESCE(SUM("amountTotalCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "paidAt" >= ${fromUtc} AND "paidAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const refundRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', "updatedAt" AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
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

  const points: {
    key: string;
    tick: string;
    label: string;
    capturedCents: number;
    refundedCents: number;
    netCents: number;
    count: number;
    refundedCount: number;
  }[] = [];

  for (
    let d = new Date(fromUtc.getTime());
    d.getTime() < toUtc.getTime();
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const ymd = tz.formatIsoDate(d, timeZone);
    const c = cap.get(ymd) ?? { sumCents: 0, count: 0 };
    const r = ref.get(ymd) ?? { sumCents: 0, count: 0 };
    const n = c.sumCents - r.sumCents;

    points.push({
      key: ymd,
      tick: tz.formatDayTick(d, timeZone),
      label: tz.formatDateMedium(d, timeZone),
      capturedCents: c.sumCents,
      refundedCents: r.sumCents,
      netCents: n,
      count: c.count,
      refundedCount: r.count,
    });
  }

  return points;
}

async function chartAggMonthly(fromUtc: Date, toUtc: Date, timeZone: string) {
  const capturedRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', "paidAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COALESCE(SUM("amountTotalCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "paidAt" >= ${fromUtc} AND "paidAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const refundRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', "updatedAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
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
      const c = cap.get(k) ?? { sumCents: 0, count: 0 };
      const r = ref.get(k) ?? { sumCents: 0, count: 0 };
      const n = c.sumCents - r.sumCents;

      return {
        key: k,
        tick: tz.formatMonthTick(ms, timeZone),
        label: tz.formatMonthLabel(ms, timeZone),
        capturedCents: c.sumCents,
        refundedCents: r.sumCents,
        netCents: n,
        count: c.count,
        refundedCount: r.count,
      };
    });
  }

  // Quarter aggregation for longer periods
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
    const qCap = new Map<string, { sumCents: number; count: number }>();
    const qRef = new Map<string, { sumCents: number; count: number }>();

    for (const mk of months) {
      const qk = quarterKeyFromMonthKey(mk);
      const c = cap.get(mk) ?? { sumCents: 0, count: 0 };
      const r = ref.get(mk) ?? { sumCents: 0, count: 0 };

      const pc = qCap.get(qk) ?? { sumCents: 0, count: 0 };
      qCap.set(qk, {
        sumCents: pc.sumCents + c.sumCents,
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
      const c = qCap.get(qk) ?? { sumCents: 0, count: 0 };
      const r = qRef.get(qk) ?? { sumCents: 0, count: 0 };
      const n = c.sumCents - r.sumCents;

      return {
        key: qk,
        tick: quarterTick(qk),
        label: quarterLabel(qk),
        capturedCents: c.sumCents,
        refundedCents: r.sumCents,
        netCents: n,
        count: c.count,
        refundedCount: r.count,
      };
    });
  }

  // Year aggregation for very long periods
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

  const yCap = new Map<string, { sumCents: number; count: number }>();
  const yRef = new Map<string, { sumCents: number; count: number }>();

  for (const mk of months) {
    const y = mk.slice(0, 4);
    const c = cap.get(mk) ?? { sumCents: 0, count: 0 };
    const r = ref.get(mk) ?? { sumCents: 0, count: 0 };

    const pc = yCap.get(y) ?? { sumCents: 0, count: 0 };
    yCap.set(y, {
      sumCents: pc.sumCents + c.sumCents,
      count: pc.count + c.count,
    });

    const pr = yRef.get(y) ?? { sumCents: 0, count: 0 };
    yRef.set(y, {
      sumCents: pr.sumCents + r.sumCents,
      count: pr.count + r.count,
    });
  }

  return years.map((y) => {
    const c = yCap.get(y) ?? { sumCents: 0, count: 0 };
    const r = yRef.get(y) ?? { sumCents: 0, count: 0 };
    const n = c.sumCents - r.sumCents;

    return {
      key: y,
      tick: yearTick(y),
      label: y,
      capturedCents: c.sumCents,
      refundedCents: r.sumCents,
      netCents: n,
      count: c.count,
      refundedCount: r.count,
    };
  });
}

// ============================================
// OPERATIONAL METRICS DATA AGGREGATION
// ============================================

async function getBookingsByStatus(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT status, COUNT(*) as count
    FROM "Booking"
    WHERE "createdAt" >= ${fromUtc} AND "createdAt" < ${toUtc}
    GROUP BY status
    ORDER BY count DESC
  `;

  return rows.map((r) => ({
    name: formatStatusLabel(r.status),
    value: Number(r.count),
    status: r.status,
  }));
}

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_REVIEW: "Pending Review",
    PENDING_PAYMENT: "Pending Payment",
    CONFIRMED: "Confirmed",
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partial Refund",
    NO_SHOW: "No Show",
  };
  return labels[status] || status;
}

async function getLeadTimeDistribution(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<{ bucket: string; count: bigint }[]>`
    SELECT 
      CASE 
        WHEN EXTRACT(EPOCH FROM ("pickupAt" - "createdAt")) / 86400 < 1 THEN 'Same Day'
        WHEN EXTRACT(EPOCH FROM ("pickupAt" - "createdAt")) / 86400 < 2 THEN '1 Day'
        WHEN EXTRACT(EPOCH FROM ("pickupAt" - "createdAt")) / 86400 < 3 THEN '2 Days'
        WHEN EXTRACT(EPOCH FROM ("pickupAt" - "createdAt")) / 86400 < 7 THEN '3-6 Days'
        WHEN EXTRACT(EPOCH FROM ("pickupAt" - "createdAt")) / 86400 < 14 THEN '1-2 Weeks'
        WHEN EXTRACT(EPOCH FROM ("pickupAt" - "createdAt")) / 86400 < 30 THEN '2-4 Weeks'
        ELSE '1+ Month'
      END as bucket,
      COUNT(*) as count
    FROM "Booking"
    WHERE "createdAt" >= ${fromUtc} AND "createdAt" < ${toUtc}
      AND "pickupAt" IS NOT NULL
    GROUP BY bucket
  `;

  const order = [
    "Same Day",
    "1 Day",
    "2 Days",
    "3-6 Days",
    "1-2 Weeks",
    "2-4 Weeks",
    "1+ Month",
  ];

  const dataMap = new Map(rows.map((r) => [r.bucket, Number(r.count)]));

  return order.map((bucket) => ({
    name: bucket,
    value: dataMap.get(bucket) || 0,
  }));
}

async function getPeakBookingTimes(
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
) {
  // Day of week distribution
  const dayRows = await db.$queryRaw<{ dow: number; count: bigint }[]>`
    SELECT 
      EXTRACT(DOW FROM "pickupAt" AT TIME ZONE ${timeZone}) as dow,
      COUNT(*) as count
    FROM "Booking"
    WHERE "createdAt" >= ${fromUtc} AND "createdAt" < ${toUtc}
      AND "pickupAt" IS NOT NULL
    GROUP BY dow
    ORDER BY dow
  `;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMap = new Map(dayRows.map((r) => [Number(r.dow), Number(r.count)]));

  const dayData = dayNames.map((name, i) => ({
    name,
    value: dayMap.get(i) || 0,
  }));

  // Time of day distribution
  const hourRows = await db.$queryRaw<{ hour_bucket: string; count: bigint }[]>`
    SELECT 
      CASE 
        WHEN EXTRACT(HOUR FROM "pickupAt" AT TIME ZONE ${timeZone}) < 6 THEN 'Night (12-6am)'
        WHEN EXTRACT(HOUR FROM "pickupAt" AT TIME ZONE ${timeZone}) < 12 THEN 'Morning (6am-12pm)'
        WHEN EXTRACT(HOUR FROM "pickupAt" AT TIME ZONE ${timeZone}) < 18 THEN 'Afternoon (12-6pm)'
        ELSE 'Evening (6pm-12am)'
      END as hour_bucket,
      COUNT(*) as count
    FROM "Booking"
    WHERE "createdAt" >= ${fromUtc} AND "createdAt" < ${toUtc}
      AND "pickupAt" IS NOT NULL
    GROUP BY hour_bucket
  `;

  const hourOrder = [
    "Morning (6am-12pm)",
    "Afternoon (12-6pm)",
    "Evening (6pm-12am)",
    "Night (12-6am)",
  ];
  const hourMap = new Map(
    hourRows.map((r) => [r.hour_bucket, Number(r.count)]),
  );

  const hourData = hourOrder.map((name) => ({
    name,
    value: hourMap.get(name) || 0,
  }));

  return { dayData, hourData };
}

async function getRevenueByServiceType(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<
    { name: string; totalCents: bigint; count: bigint }[]
  >`
    SELECT 
      st.name,
      COALESCE(SUM(p."amountTotalCents"), 0) as "totalCents",
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

async function getRevenueByVehicle(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<
    { name: string; totalCents: bigint; count: bigint }[]
  >`
    SELECT 
      COALESCE(v.name, 'Unassigned') as name,
      COALESCE(SUM(p."amountTotalCents"), 0) as "totalCents",
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

// ============================================
// DRIVER PERFORMANCE DATA AGGREGATION
// ============================================

interface DriverPerformanceRow {
  driverId: string;
  driverName: string | null;
  driverEmail: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  noShowTrips: number;
  totalEarnings: number;
  completionRate: number;
}

async function getDriverPerformance(
  fromUtc: Date,
  toUtc: Date,
): Promise<DriverPerformanceRow[]> {
  const rows = await db.$queryRaw<
    {
      driverId: string;
      driverName: string | null;
      driverEmail: string;
      totalTrips: bigint;
      completedTrips: bigint;
      cancelledTrips: bigint;
      noShowTrips: bigint;
      totalEarnings: bigint;
    }[]
  >`
    SELECT 
      a."driverId",
      u.name as "driverName",
      u.email as "driverEmail",
      COUNT(a.id) as "totalTrips",
      COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END) as "completedTrips",
      COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END) as "cancelledTrips",
      COUNT(CASE WHEN b.status = 'NO_SHOW' THEN 1 END) as "noShowTrips",
      COALESCE(SUM(a."driverPaymentCents"), 0) as "totalEarnings"
    FROM "Assignment" a
    JOIN "User" u ON a."driverId" = u.id
    JOIN "Booking" b ON a."bookingId" = b.id
    WHERE a."assignedAt" >= ${fromUtc} AND a."assignedAt" < ${toUtc}
    GROUP BY a."driverId", u.name, u.email
    ORDER BY "totalTrips" DESC
  `;

  return rows.map((r) => {
    const totalTrips = Number(r.totalTrips);
    const completedTrips = Number(r.completedTrips);
    return {
      driverId: r.driverId,
      driverName: r.driverName,
      driverEmail: r.driverEmail,
      totalTrips,
      completedTrips,
      cancelledTrips: Number(r.cancelledTrips),
      noShowTrips: Number(r.noShowTrips),
      totalEarnings: Number(r.totalEarnings),
      completionRate:
        totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
    };
  });
}

async function getDriverTripsDistribution(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<
    {
      driverName: string | null;
      driverEmail: string;
      tripCount: bigint;
    }[]
  >`
    SELECT 
      u.name as "driverName",
      u.email as "driverEmail",
      COUNT(a.id) as "tripCount"
    FROM "Assignment" a
    JOIN "User" u ON a."driverId" = u.id
    WHERE a."assignedAt" >= ${fromUtc} AND a."assignedAt" < ${toUtc}
    GROUP BY u.name, u.email
    ORDER BY "tripCount" DESC
    LIMIT 10
  `;

  return rows.map((r) => ({
    name: r.driverName || r.driverEmail.split("@")[0],
    value: Number(r.tripCount),
  }));
}

async function getDriverEarningsDistribution(fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<
    {
      driverName: string | null;
      driverEmail: string;
      totalEarnings: bigint;
    }[]
  >`
    SELECT 
      u.name as "driverName",
      u.email as "driverEmail",
      COALESCE(SUM(a."driverPaymentCents"), 0) as "totalEarnings"
    FROM "Assignment" a
    JOIN "User" u ON a."driverId" = u.id
    WHERE a."assignedAt" >= ${fromUtc} AND a."assignedAt" < ${toUtc}
    GROUP BY u.name, u.email
    ORDER BY "totalEarnings" DESC
    LIMIT 10
  `;

  return rows.map((r) => ({
    name: r.driverName || r.driverEmail.split("@")[0],
    value: Number(r.totalEarnings),
  }));
}

// ============================================
// MAIN COMPONENT
// ============================================

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = (await Promise.resolve(searchParams ?? {})) as SP;
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();
  const view = cleanView(spGet(sp, "view"));
  const currentMonthStart = tz.startOfMonth(now, companyTz);
  const rangeFromParam = spGet(sp, "from");
  const rangeToParam = spGet(sp, "to");
  const defaultTo = tz.formatIsoDate(now, companyTz);
  const defaultFrom = tz.formatIsoDate(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    companyTz,
  );
  const resolvedMY = resolveMonthYear({ view, sp, now, timeZone: companyTz });

  const [earliestPaid] = await Promise.all([
    db.payment.findFirst({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    }),
  ]);

  let fromUtc = currentMonthStart;
  let toUtc = tz.addMonths(currentMonthStart, 1, companyTz);
  let rangeLabel = tz.formatMonthLabel(currentMonthStart, companyTz);

  if (view === "daily") {
    const ms =
      tz.monthStartFromKey(resolvedMY.key, companyTz) ?? currentMonthStart;
    fromUtc = ms;
    toUtc = tz.addMonths(ms, 1, companyTz);
    rangeLabel = tz.formatMonthLabel(ms, companyTz);
  }

  if (view === "monthly") {
    const oldest = tz.addMonths(currentMonthStart, -11, companyTz);
    const nextAfterCurrent = tz.addMonths(currentMonthStart, 1, companyTz);
    fromUtc = oldest;
    toUtc = nextAfterCurrent;
    rangeLabel = "Last 12 months";
  }

  if (view === "ytd") {
    fromUtc = tz.startOfYear(now, companyTz);
    toUtc = tz.addMonths(currentMonthStart, 1, companyTz);
    rangeLabel = "Year to date";
  }

  if (view === "range") {
    const f = parseYMD(rangeFromParam ?? defaultFrom);
    const t = parseYMD(rangeToParam ?? defaultTo);
    const fUtc = f
      ? startOfDayFromYMD(f, companyTz)
      : startOfDayFromYMD(parseYMD(defaultFrom)!, companyTz);
    const tUtc0 = t
      ? startOfDayFromYMD(t, companyTz)
      : startOfDayFromYMD(parseYMD(defaultTo)!, companyTz);
    const tUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    fromUtc = fUtc;
    toUtc = tUtc;
    rangeLabel = `${tz.formatDateMedium(fromUtc, companyTz)} - ${tz.formatDateMedium(new Date(toUtc.getTime() - 1), companyTz)}`;
  }

  if (view === "all") {
    fromUtc = earliestPaid?.paidAt
      ? tz.startOfDay(earliestPaid.paidAt, companyTz)
      : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    toUtc = new Date(
      tz.startOfDay(now, companyTz).getTime() + 24 * 60 * 60 * 1000,
    );
    rangeLabel = "All time";
  }

  const earliestYear = earliestPaid?.paidAt
    ? tz.toLocalParts(earliestPaid.paidAt, companyTz).y
    : tz.toLocalParts(now, companyTz).y;
  const latestYear = tz.toLocalParts(now, companyTz).y;

  const years = Array.from({
    length: Math.max(1, latestYear - earliestYear + 1),
  }).map((_, i) => String(latestYear - i));

  const monthOptions = [
    { v: "01", label: "Jan" },
    { v: "02", label: "Feb" },
    { v: "03", label: "Mar" },
    { v: "04", label: "Apr" },
    { v: "05", label: "May" },
    { v: "06", label: "Jun" },
    { v: "07", label: "Jul" },
    { v: "08", label: "Aug" },
    { v: "09", label: "Sep" },
    { v: "10", label: "Oct" },
    { v: "11", label: "Nov" },
    { v: "12", label: "Dec" },
  ];

  const currency = "USD";

  // Fetch all data in parallel
  const [
    revenueChartData,
    bookingsByStatus,
    leadTimeData,
    peakTimesData,
    revenueByService,
    revenueByVehicle,
    driverPerformance,
    driverTripsDistribution,
    driverEarningsDistribution,
  ] = await Promise.all([
    view === "daily"
      ? chartAggDaily(fromUtc, toUtc, companyTz)
      : chartAggMonthly(fromUtc, toUtc, companyTz),
    getBookingsByStatus(fromUtc, toUtc),
    getLeadTimeDistribution(fromUtc, toUtc),
    getPeakBookingTimes(fromUtc, toUtc, companyTz),
    getRevenueByServiceType(fromUtc, toUtc),
    getRevenueByVehicle(fromUtc, toUtc),
    getDriverPerformance(fromUtc, toUtc),
    getDriverTripsDistribution(fromUtc, toUtc),
    getDriverEarningsDistribution(fromUtc, toUtc),
  ]);

  const kpi = kpisFromChartData(revenueChartData);
  const netTone: "good" | "warn" = kpi.netSumCents >= 0 ? "good" : "warn";
  const revenueChartTitle = chartHeadingFromData(view, revenueChartData);

  // Calculate operational KPIs
  const totalBookings = bookingsByStatus.reduce((sum, s) => sum + s.value, 0);
  const completedBookings =
    bookingsByStatus.find((s) => s.status === "COMPLETED")?.value || 0;
  const cancelledBookings =
    bookingsByStatus.find((s) => s.status === "CANCELLED")?.value || 0;
  const noShowBookings =
    bookingsByStatus.find((s) => s.status === "NO_SHOW")?.value || 0;

  const completionRate =
    totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0;
  const cancellationRate =
    totalBookings > 0
      ? Math.round((cancelledBookings / totalBookings) * 100)
      : 0;
  const noShowRate =
    totalBookings > 0 ? Math.round((noShowBookings / totalBookings) * 100) : 0;

  return (
    <section className={`${base.content} ${styles.container}`}>
      <header className={styles.header}>
        <h1 className='heading h2'>Reports</h1>
        <p className='subheading'>
          Comprehensive business analytics for Nier Transportation
        </p>

        <ReportsControls
          years={years}
          monthOptions={monthOptions}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
          initialView={view}
          initialYear={resolvedMY.year}
          initialMonth={resolvedMY.month}
          initialFrom={rangeFromParam ?? defaultFrom}
          initialTo={rangeToParam ?? defaultTo}
          rangeLabel={rangeLabel}
        />
      </header>

      {/* ============================================ */}
      {/* REVENUE & FINANCIAL SECTION */}
      {/* ============================================ */}
      <section className={styles.section}>
        <div className='header'>
          <h2 className={`cardTitle h4`}>Revenue &amp; Financial</h2>
          <span className={styles.sectionBadge}>{rangeLabel}</span>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard
            label='Captured'
            value={tz.formatMoneyShort(kpi.capturedSumCents, currency)}
            sub={`${kpi.payCount} payment${kpi.payCount === 1 ? "" : "s"}`}
          />
          <KpiCard
            label='Avg Order Value'
            value={tz.formatMoneyShort(kpi.avgCents, currency)}
            sub='Per transaction'
          />
          <KpiCard
            label='Refunded'
            value={tz.formatMoneyShort(kpi.refundedSumCents, currency)}
            sub={`${kpi.refundCount} refund${kpi.refundCount === 1 ? "" : "s"}`}
            tone='warn'
          />
          <KpiCard
            label='Net Revenue'
            value={tz.formatMoneyShort(kpi.netSumCents, currency)}
            sub='After refunds'
            tone={netTone}
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCardLarge}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>{revenueChartTitle}</h3>
              <span className={styles.sectionBadge}>{rangeLabel}</span>
            </div>
            <div className={styles.chartBody}>
              <RevenueChart data={revenueChartData} currency={currency} />
            </div>
          </div>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Revenue by Service Type</h3>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={revenueByService}
                dataKey='value'
                isCurrency={true}
                currency={currency}
                colors={["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"]}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Revenue by Vehicle</h3>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={revenueByVehicle}
                dataKey='value'
                isCurrency={true}
                currency={currency}
                colors={["#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1"]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* OPERATIONAL METRICS SECTION */}
      {/* ============================================ */}
      <section className={styles.section}>
        <div className='header'>
          <h2 className={`cardTitle h4`}>Operational Metrics</h2>
          <span className={styles.sectionBadge}>{rangeLabel}</span>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard
            label='Total Bookings'
            value={String(totalBookings)}
            sub='In selected period'
          />
          <KpiCard
            label='Completion Rate'
            value={`${completionRate}%`}
            sub={`${completedBookings} completed`}
            tone={completionRate >= 80 ? "good" : "warn"}
          />
          <KpiCard
            label='Cancellation Rate'
            value={`${cancellationRate}%`}
            sub={`${cancelledBookings} cancelled`}
            tone={cancellationRate <= 10 ? "good" : "warn"}
          />
          <KpiCard
            label='No-Show Rate'
            value={`${noShowRate}%`}
            sub={`${noShowBookings} no-shows`}
            tone={noShowRate <= 5 ? "good" : "warn"}
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Bookings by Status</h3>
              <span className='miniNote'>Distribution</span>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={bookingsByStatus}
                dataKey='value'
                colors={[
                  "#10b981",
                  "#3b82f6",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                  "#6b7280",
                  "#ec4899",
                  "#06b6d4",
                ]}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Lead Time Distribution</h3>
              <span className='miniNote'>
                How far in advance customers book
              </span>
            </div>
            <div className={styles.chartBodyPie}>
              <LeadTimePieChart data={leadTimeData} />
            </div>
          </div>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Peak Days</h3>
              <span className='miniNote'>Busiest days of the week</span>
            </div>
            <div className={styles.chartBodyPie}>
              <PeakTimesPieChart data={peakTimesData.dayData} />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Peak Hours</h3>
              <span className='miniNote'>Busiest times of day</span>
            </div>
            <div className={styles.chartBodyPie}>
              <PeakTimesPieChart
                data={peakTimesData.hourData}
                colors={["#fbbf24", "#f97316", "#8b5cf6", "#1e3a5f"]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* DRIVER PERFORMANCE SECTION */}
      {/* ============================================ */}
      <section className={styles.section}>
        <div className='header'>
          <h2 className={`cardTitle h4`}>Driver Performance</h2>
          <span className={styles.sectionBadge}>{rangeLabel}</span>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard
            label='Active Drivers'
            value={String(driverPerformance.length)}
            sub='With assignments'
          />
          <KpiCard
            label='Total Trips Assigned'
            value={String(
              driverPerformance.reduce((sum, d) => sum + d.totalTrips, 0),
            )}
            sub='In selected period'
          />
          <KpiCard
            label='Avg Trips per Driver'
            value={String(
              driverPerformance.length > 0
                ? Math.round(
                    driverPerformance.reduce(
                      (sum, d) => sum + d.totalTrips,
                      0,
                    ) / driverPerformance.length,
                  )
                : 0,
            )}
            sub='Workload distribution'
          />
          <KpiCard
            label='Total Driver Earnings'
            value={tz.formatMoneyShort(
              driverPerformance.reduce((sum, d) => sum + d.totalEarnings, 0),
              currency,
            )}
            sub='Driver payments'
            tone='good'
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Trips by Driver</h3>
              <span className='miniNote'>Top 10 drivers by trip count</span>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={driverTripsDistribution}
                dataKey='value'
                colors={[
                  "#3b82f6",
                  "#10b981",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                  "#06b6d4",
                  "#ec4899",
                  "#84cc16",
                  "#f97316",
                  "#6366f1",
                ]}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Earnings by Driver</h3>
              <span className='miniNote'>Top 10 drivers by earnings</span>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={driverEarningsDistribution}
                dataKey='value'
                isCurrency={true}
                currency={currency}
                colors={[
                  "#10b981",
                  "#3b82f6",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                  "#06b6d4",
                  "#ec4899",
                  "#84cc16",
                  "#f97316",
                  "#6366f1",
                ]}
              />
            </div>
          </div>
        </div>

        {/* Driver Performance Table */}
        <div className={styles.chartCardLarge}>
          <div className={styles.chartHeader}>
            <h3 className={`cardTitle h6`}>Driver Leaderboard</h3>
            <span className='miniNote'>Performance breakdown by driver</span>
          </div>
          <div className={styles.tableWrap}>
            {driverPerformance.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyTitle}>
                  No driver assignments found
                </div>
                <span className='miniNote'>
                  Try a different filter or expand the date range.
                </span>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th className={styles.right}>Trips</th>
                    <th className={styles.right}>Completed</th>
                    <th className={styles.right}>Cancelled</th>
                    <th className={styles.right}>No-Shows</th>
                    <th className={styles.right}>Completion Rate</th>
                    <th className={styles.right}>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {driverPerformance.map((driver) => (
                    <tr key={driver.driverId}>
                      <td>
                        <div className={styles.driverName}>
                          {driver.driverName ||
                            driver.driverEmail.split("@")[0]}
                        </div>
                        <span className='miniNote'>{driver.driverEmail}</span>
                      </td>
                      <td className={styles.right}>{driver.totalTrips}</td>
                      <td className={styles.right}>{driver.completedTrips}</td>
                      <td className={styles.right}>{driver.cancelledTrips}</td>
                      <td className={styles.right}>{driver.noShowTrips}</td>
                      <td className={styles.right}>
                        <span
                          className={
                            driver.completionRate >= 90
                              ? styles.rateBadgeGood
                              : driver.completionRate >= 70
                                ? styles.rateBadgeWarn
                                : styles.rateBadgeBad
                          }
                        >
                          {driver.completionRate}%
                        </span>
                      </td>
                      <td className={styles.right}>
                        {tz.formatMoneyShort(driver.totalEarnings, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

// ============================================
// KPI CARD COMPONENT
// ============================================

function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const { value: numericValue, prefix, suffix } = parseValue(value);

  return (
    <div className={`${styles.kpiCard} ${styles[`tone_${tone}`]}`}>
      <div className='emptyTitle underline'>{label}</div>
      <div className={styles.kpiValue}>
        {prefix && <span>{prefix}</span>}
        <CountUp
          from={0}
          to={numericValue}
          duration={1.5}
          separator=','
          delay={0.1}
        />
        {suffix && <span>{suffix}</span>}
      </div>
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  );
}
