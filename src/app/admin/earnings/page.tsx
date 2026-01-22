/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import CountUp from "@/components/shared/CountUp/CountUp";
import { db } from "@/lib/db";
import base from "../AdminStyles.module.css";
import styles from "./AdminEarningsPage.module.css";
import EarningsControls from "./EarningsControls";
import EarningsChart from "./EarningsChart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

type ViewMode = "daily" | "monthly" | "ytd" | "all" | "range";
type SP = Record<string, string | string[] | undefined>;

function spGet(sp: SP, key: string) {
  const v = sp[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return typeof v === "string" ? v : null;
}

function cleanView(v: string | null | undefined): ViewMode {
  // legacy support
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

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateShortPhx(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTimePhx(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDatePhx(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMonthLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: PHX_TZ,
  }).format(dateUtc);
}

function formatMonthTickPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: PHX_TZ,
  }).format(dateUtc);
}

function formatDayLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateUtc);
}

function formatDayTickPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
  }).format(dateUtc);
}

function shortId(id: string | null | undefined, n = 7) {
  if (!id) return "—";
  if (id.length <= n) return id;
  return `${id.slice(0, n)}…`;
}

function toPhoenixParts(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  return { y: phx.getUTCFullYear(), m: phx.getUTCMonth(), d: phx.getUTCDate() };
}

function startOfDayPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfMonthPhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfYearPhoenix(dateUtc: Date) {
  const { y } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, 0, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;
  return new Date(nextStartUtcMs);
}

function monthKeyFromDatePhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const mm = String(m + 1).padStart(2, "0");
  return `${y}-${mm}`;
}

function monthStartFromKeyPhoenix(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12)
    return null;
  const startLocalMs = Date.UTC(y, m - 1, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
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

function startOfDayFromYMDPhoenix(ymd: { y: number; m: number; d: number }) {
  const startLocalMs = Date.UTC(ymd.y, ymd.m - 1, ymd.d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function ymdForInputPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildHref(
  basePath: string,
  params: Record<string, string | undefined | null>,
) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v.trim().length > 0) usp.set(k, v);
  }
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function resolveMonthYear({
  view,
  sp,
  now,
}: {
  view: ViewMode;
  sp: SP;
  now: Date;
}) {
  const currentKey = monthKeyFromDatePhoenix(now);
  const currentYear = currentKey.slice(0, 4);
  const currentMonth = currentKey.slice(5, 7);

  const rawMonth = spGet(sp, "month");
  const rawYear = spGet(sp, "year");

  const legacyKey =
    rawMonth && monthStartFromKeyPhoenix(rawMonth) ? rawMonth : null;

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

function quarterStartFromQuarterKeyPhoenix(key: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const q = Number(match[2]);
  const startMonth = (q - 1) * 3 + 1;
  const startLocalMs = Date.UTC(y, startMonth - 1, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
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

/**
 * ✅ KPI totals derived from the SAME dataset as the chart.
 * This guarantees KPIs always match the active tab + chart period.
 */
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
  if (view === "daily") return "Daily earnings";
  const k = data?.[0]?.key ?? "";
  if (/^\d{4}-Q[1-4]$/.test(k)) return "Quarterly earnings";
  if (/^\d{4}$/.test(k)) return "Yearly earnings";
  return "Monthly earnings";
}

/**
 * Parse a formatted value (e.g., "$1,234" or "5") into numeric value and prefix/suffix
 */
function parseValue(str: string): {
  value: number;
  prefix: string;
  suffix: string;
} {
  // Remove commas and spaces for parsing
  const cleaned = str.replace(/,/g, "").trim();

  // Try to match: optional prefix (like $) + number + optional suffix (like k, %, +)
  const match = cleaned.match(/^([^\d.-]*)([+-]?\d+(?:\.\d+)?)([^\d]*)$/);

  if (match) {
    const prefix = match[1] || "";
    const value = parseFloat(match[2]) || 0;
    const suffix = match[3] || "";
    return { value, prefix, suffix };
  }

  // Fallback: try to parse as a plain number
  const numValue = parseFloat(cleaned);
  if (!isNaN(numValue)) {
    return { value: numValue, prefix: "", suffix: "" };
  }

  // If all else fails, return the original string as suffix with 0 value
  return { value: 0, prefix: "", suffix: str };
}

// I'm truncating the rest of the helper functions (chartAggDaily, chartAggMonthly)
// since they're unchanged. The key changes are in the KpiCard component at the bottom.

async function chartAggDaily(fromUtc: Date, toUtc: Date) {
  const capturedRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', "paidAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM-DD') as key,
      COALESCE(SUM("amountTotalCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "paidAt" >= ${fromUtc} AND "paidAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const refundRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', "updatedAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM-DD') as key,
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
    const ymd = ymdForInputPhoenix(d);
    const c = cap.get(ymd) ?? { sumCents: 0, count: 0 };
    const r = ref.get(ymd) ?? { sumCents: 0, count: 0 };
    const n = c.sumCents - r.sumCents;

    points.push({
      key: ymd,
      tick: formatDayTickPhoenix(d),
      label: formatDayLabelPhoenix(d),
      capturedCents: c.sumCents,
      refundedCents: r.sumCents,
      netCents: n,
      count: c.count,
      refundedCount: r.count,
    });
  }

  return points;
}

async function chartAggMonthly(fromUtc: Date, toUtc: Date) {
  const capturedRows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', "paidAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM') as key,
      COALESCE(SUM("amountTotalCents"), 0) as sum,
      COUNT(*) as count
    FROM "Payment"
    WHERE "paidAt" >= ${fromUtc} AND "paidAt" < ${toUtc}
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
    let ms = startOfMonthPhoenix(fromUtc);
    ms.getTime() < toUtc.getTime();
    ms = addMonthsPhoenix(ms, 1)
  ) {
    months.push(monthKeyFromDatePhoenix(ms));
  }

  if (months.length <= 36) {
    return months.map((k) => {
      const ms = monthStartFromKeyPhoenix(k) ?? startOfMonthPhoenix(fromUtc);
      const c = cap.get(k) ?? { sumCents: 0, count: 0 };
      const r = ref.get(k) ?? { sumCents: 0, count: 0 };
      const n = c.sumCents - r.sumCents;

      return {
        key: k,
        tick: formatMonthTickPhoenix(ms),
        label: formatMonthLabelPhoenix(ms),
        capturedCents: c.sumCents,
        refundedCents: r.sumCents,
        netCents: n,
        count: c.count,
        refundedCount: r.count,
      };
    });
  }

  // quarter/year logic follows (unchanged from original)
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
        quarterStartFromQuarterKeyPhoenix(qk) ?? startOfMonthPhoenix(fromUtc);
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

export default async function EarningsPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = (await Promise.resolve(searchParams ?? {})) as SP;
  const now = new Date();
  const view = cleanView(spGet(sp, "view"));
  const currentMonthStart = startOfMonthPhoenix(now);
  const rangeFromParam = spGet(sp, "from");
  const rangeToParam = spGet(sp, "to");
  const defaultTo = ymdForInputPhoenix(now);
  const defaultFrom = ymdForInputPhoenix(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  );
  const resolvedMY = resolveMonthYear({ view, sp, now });
  const resolvedMonthKey = resolvedMY.key;

  const [earliestPaid, latestPaid] = await Promise.all([
    db.payment.findFirst({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    }),
    db.payment.findFirst({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true },
    }),
  ]);

  let fromUtc = currentMonthStart;
  let toUtc = addMonthsPhoenix(currentMonthStart, 1);
  let rangeLabel = formatMonthLabelPhoenix(currentMonthStart);

  if (view === "daily") {
    const ms = monthStartFromKeyPhoenix(resolvedMonthKey) ?? currentMonthStart;
    fromUtc = ms;
    toUtc = addMonthsPhoenix(ms, 1);
    rangeLabel = formatMonthLabelPhoenix(ms);
  }

  if (view === "monthly") {
    const oldest = addMonthsPhoenix(currentMonthStart, -11);
    const nextAfterCurrent = addMonthsPhoenix(currentMonthStart, 1);
    fromUtc = oldest;
    toUtc = nextAfterCurrent;
    rangeLabel = "Last 12 months";
  }

  if (view === "ytd") {
    fromUtc = startOfYearPhoenix(now);
    toUtc = addMonthsPhoenix(currentMonthStart, 1);
    rangeLabel = "Year to date";
  }

  if (view === "range") {
    const f = parseYMD(rangeFromParam ?? defaultFrom);
    const t = parseYMD(rangeToParam ?? defaultTo);
    const fUtc = f
      ? startOfDayFromYMDPhoenix(f)
      : startOfDayFromYMDPhoenix(parseYMD(defaultFrom)!);
    const tUtc0 = t
      ? startOfDayFromYMDPhoenix(t)
      : startOfDayFromYMDPhoenix(parseYMD(defaultTo)!);
    const tUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    fromUtc = fUtc;
    toUtc = tUtc;
    rangeLabel = `${formatDatePhx(fromUtc)} → ${formatDatePhx(new Date(toUtc.getTime() - 1))}`;
  }

  if (view === "all") {
    fromUtc = earliestPaid?.paidAt
      ? startOfDayPhoenix(earliestPaid.paidAt)
      : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    toUtc = new Date(startOfDayPhoenix(now).getTime() + 24 * 60 * 60 * 1000);
    rangeLabel = "All time";
  }

  const earliestYear = earliestPaid?.paidAt
    ? toPhoenixParts(earliestPaid.paidAt).y
    : toPhoenixParts(now).y;
  const latestYear = latestPaid?.paidAt
    ? toPhoenixParts(latestPaid.paidAt).y
    : toPhoenixParts(now).y;

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

  const [payments, chartData] = await Promise.all([
    db.payment.findMany({
      where: { paidAt: { gte: fromUtc, lt: toUtc } },
      orderBy: { paidAt: "desc" },
      take: 250,
      select: {
        id: true,
        paidAt: true,
        amountTotalCents: true,
        currency: true,
        bookingId: true,
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            userId: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
            guestPhone: true,
          },
        },
      },
    }),
    view === "daily"
      ? chartAggDaily(fromUtc, toUtc)
      : chartAggMonthly(fromUtc, toUtc),
  ]);

  const kpi = kpisFromChartData(chartData);
  const netTone: "good" | "warn" = kpi.netSumCents >= 0 ? "good" : "warn";

  const monthMenuStarts = Array.from({ length: 12 }).map((_, i) =>
    addMonthsPhoenix(startOfMonthPhoenix(now), -i),
  );
  const oldestMonthStart =
    monthMenuStarts[monthMenuStarts.length - 1] ?? startOfMonthPhoenix(now);
  const nextAfterCurrent = addMonthsPhoenix(startOfMonthPhoenix(now), 1);

  const last12CapturedRows = await db.payment.findMany({
    where: { paidAt: { gte: oldestMonthStart, lt: nextAfterCurrent } },
    select: { paidAt: true, amountTotalCents: true },
  });

  const bucket = new Map<string, { sumCents: number; count: number }>();
  for (const r of last12CapturedRows) {
    if (!r.paidAt) continue;
    const key = monthKeyFromDatePhoenix(r.paidAt);
    const prev = bucket.get(key) ?? { sumCents: 0, count: 0 };
    bucket.set(key, {
      sumCents: prev.sumCents + (r.amountTotalCents ?? 0),
      count: prev.count + 1,
    });
  }

  const monthSummary = monthMenuStarts
    .map((ms) => {
      const key = monthKeyFromDatePhoenix(ms);
      const label = formatMonthLabelPhoenix(ms);
      const v = bucket.get(key) ?? { sumCents: 0, count: 0 };
      const avgCents = v.count > 0 ? Math.round(v.sumCents / v.count) : 0;
      return { key, label, sumCents: v.sumCents, count: v.count, avgCents };
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  const monthlyFromForExport = ymdForInputPhoenix(oldestMonthStart);
  const monthlyToForExport = ymdForInputPhoenix(
    new Date(nextAfterCurrent.getTime() - 1),
  );

  const exportView: "month" | "ytd" | "all" | "range" =
    view === "daily" ? "month" : view === "monthly" ? "range" : view;

  const exportHref = buildHref("/admin/earnings/export", {
    view: exportView,
    year: exportView === "month" ? resolvedMY.year : undefined,
    month: exportView === "month" ? resolvedMY.month : undefined,
    from:
      exportView === "range"
        ? view === "monthly"
          ? monthlyFromForExport
          : (rangeFromParam ?? defaultFrom)
        : undefined,
    to:
      exportView === "range"
        ? view === "monthly"
          ? monthlyToForExport
          : (rangeToParam ?? defaultTo)
        : undefined,
  });

  const chartTitle = chartHeadingFromData(view, chartData);
  const chartSub = rangeLabel;

  return (
    <section className={`${base.content} ${styles.container}`}>
      <header className='header'>
        <h1 className='heading h2'>Earnings</h1>

        <div className={styles.earningsTop}>
          <p className='subheading'>
            View captured revenue, refunds, and net totals by month, range,
            year-to-date, or all time.
          </p>
          <div className={styles.headerActions}>
            <Button
              href={exportHref}
              text='Download CSV'
              btnType='black'
              downloadIcon
            />
          </div>
        </div>

        <EarningsControls
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

      <div className={styles.kpiGrid}>
        <KpiCard
          label='Captured'
          value={formatMoney(kpi.capturedSumCents, currency)}
          sub={`${kpi.payCount} payment${kpi.payCount === 1 ? "" : "s"}`}
        />
        <KpiCard
          label='Avg order value'
          value={formatMoney(kpi.avgCents, currency)}
          sub='Current chart range'
        />
        <KpiCard
          label='Refunded'
          value={formatMoney(kpi.refundedSumCents, currency)}
          sub={`${kpi.refundCount} refund${kpi.refundCount === 1 ? "" : "s"}`}
          tone='warn'
        />
        <KpiCard
          label='Net'
          value={formatMoney(kpi.netSumCents, currency)}
          sub='Captured minus refunded'
          tone={netTone}
        />
      </div>

      <section className={`${styles.card} ${styles.chartCard}`}>
        <div className={styles.cardHeader}>
          <div className='cardTitle h4'>{chartTitle}</div>
          <div className='miniNote'>{chartSub}</div>
        </div>
        <div className={styles.chartWrap}>
          <EarningsChart data={chartData} currency={currency} />
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className='cardTitle h4'>Monthly breakdown</div>
            <div className='miniNote'>Last 12 months</div>
          </div>
          <div className={styles.cardHeaderRight}>
            <span className='miniNote'>Selected</span>
            <span className={styles.selectedMonth}>
              {view === "daily" ? resolvedMonthKey : "—"}
            </span>
          </div>

          <div className={styles.monthTableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.right}>Captured</th>
                  <th className={styles.right}>Payments</th>
                  <th className={styles.right}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {monthSummary.map((m) => {
                  const active = view === "daily" && m.key === resolvedMonthKey;
                  const y = m.key.slice(0, 4);
                  const mo = m.key.slice(5, 7);
                  return (
                    <tr key={m.key} className={active ? styles.rowActive : ""}>
                      <td>
                        <Link
                          className={styles.rowLink}
                          href={buildHref("/admin/earnings", {
                            view: "daily",
                            year: y,
                            month: mo,
                          })}
                        >
                          {m.label}
                        </Link>
                      </td>
                      <td className={styles.right}>
                        {formatMoney(m.sumCents, currency)}
                      </td>
                      <td className={styles.right}>{m.count}</td>
                      <td className={styles.right}>
                        {formatMoney(m.avgCents, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.cardFooter}>
            <Button
              href={exportHref}
              text='Download CSV for current view'
              btnType='black'
              downloadIcon
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className='cardTitle h4'>Payments</div>
            <div className='miniNote'>Most recent 250 for selected period</div>
          </div>
          <div className={styles.cardHeaderRight}>
            <span className='miniNote'>Phoenix time</span>
            <span className={styles.tzPill}>{PHX_TZ}</span>
          </div>

          {payments.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No payments found</div>
              <div className='miniNote'>
                Try a different filter or expand the date range.
              </div>
            </div>
          ) : (
            <div className={styles.paymentsTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paid</th>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th className={styles.right}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const paidAt = p.paidAt ? new Date(p.paidAt) : null;
                    const b = p.booking;
                    const cust =
                      (b?.user?.name?.trim() || b?.user?.email || "").trim() ||
                      (b?.guestName?.trim() || b?.guestEmail || "").trim() ||
                      "Customer";

                    const bookingHref = b?.id
                      ? buildHref("/admin/bookings", { bookingId: b.id })
                      : "/admin/bookings";
                    const bookingId = b?.id ?? p.bookingId ?? null;

                    return (
                      <tr key={p.id}>
                        <td>{paidAt ? formatDateShortPhx(paidAt) : "—"}</td>
                        <td>
                          <Link className={styles.rowLink} href={bookingHref}>
                            <div className={styles.bookingId}>
                              {shortId(bookingId, 7)}
                            </div>
                          </Link>
                        </td>
                        <td>
                          <div className={styles.customerName}>{cust}</div>
                          {b?.pickupAt ? (
                            <div className='miniNote'>
                              Pickup: {formatDateTimePhx(new Date(b.pickupAt))}
                            </div>
                          ) : (
                            <div className='miniNote' />
                          )}
                        </td>
                        <td className={styles.right}>
                          {formatMoney(p.amountTotalCents ?? 0, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.cardFooter}>
            <Button
              href={exportHref}
              text='Download CSV'
              btnType='black'
              downloadIcon
            />
          </div>
        </section>
      </div>
    </section>
  );
}

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
      <div className={styles.kpiTop}>
        <div className='emptyTitle underline'>{label}</div>
      </div>
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
      <div className='miniNote'>{sub}</div>
    </div>
  );
}
