// src/lib/booking/bookingsChart.ts
//
// Data for the chart on /admin/bookings. The page passes in the same bookings
// its list shows (same filters), and this groups them into time buckets in
// the company's time zone. Drafts are never charted.

import type { BookingStatus } from "@prisma/client";
import * as tz from "@/lib/timezone";

export type ChartBasis = "pickup" | "created";
export type ChartBreakdown =
  "status" | "service" | "vehicle" | "driver" | "customer";
export type ChartGranularity = "hour" | "day" | "week" | "month";

export const CHART_BREAKDOWNS: { value: ChartBreakdown; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "service", label: "Service" },
  { value: "vehicle", label: "Vehicle" },
  { value: "driver", label: "Driver" },
  { value: "customer", label: "Customer type" },
];

export function safeBreakdown(v: unknown): ChartBreakdown {
  return CHART_BREAKDOWNS.some((b) => b.value === v)
    ? (v as ChartBreakdown)
    : "status";
}

/** One booking, with just what the chart needs. */
export type ChartRow = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  createdAt: Date;
  tripGroupId: string | null;
  totalCents: number;
  userId: string | null;
  corporateAccountId: string | null;
  serviceType: { id: string; name: string } | null;
  vehicle: { id: string; name: string } | null;
  driver: { id: string; name: string } | null;
};

export type ChartSeries = { key: string; label: string; color: string };

export type ChartBucket = {
  key: string;
  /** Short axis label, e.g. "Oct 1". */
  tick: string;
  /** Tooltip heading, e.g. "Thu, Oct 1". */
  label: string;
  /** Dates (YYYY-MM-DD, inclusive) to filter the list to when the bar is
   *  clicked. Null for hourly bars. */
  from: string | null;
  to: string | null;
  total: number;
  values: Record<string, number>;
};

export type ChartSummary = {
  /** Rides charted (drafts excluded). Each ride of a trip counts. */
  rides: number;
  /** A multi-ride trip counts once. */
  trips: number;
  done: number;
  /** Needs action + booked: not started yet. */
  upcoming: number;
  needsAction: number;
  lost: number;
  /** lost / rides, or null when there are no rides. */
  lostRate: number | null;
  /** Sum of ride totals, lost rides excluded. */
  bookedValueCents: number;
};

export type BookingsChartData = {
  granularity: ChartGranularity;
  buckets: ChartBucket[];
  series: ChartSeries[];
  /** Bucket holding "now", when it is on the chart. */
  todayKey: string | null;
  summary: ChartSummary;
};

// ── Status groups ────────────────────────────────────────────────────────────

type GroupKey = "needs_action" | "booked" | "done" | "lost";

const STATUS_GROUP: Partial<Record<BookingStatus, GroupKey>> = {
  PENDING_REVIEW: "needs_action",
  PENDING_PAYMENT: "needs_action",
  CONFIRMED: "booked",
  ASSIGNED: "booked",
  EN_ROUTE: "done",
  ARRIVED: "done",
  IN_PROGRESS: "done",
  COMPLETED: "done",
  PARTIALLY_REFUNDED: "done",
  CANCELLED: "lost",
  NO_SHOW: "lost",
  DECLINED: "lost",
  REFUNDED: "lost",
  // DRAFT has no group on purpose: drafts are never charted.
};

export function statusGroup(status: BookingStatus): GroupKey | null {
  return STATUS_GROUP[status] ?? null;
}

export const STATUS_SERIES: ChartSeries[] = [
  { key: "needs_action", label: "Needs action", color: "#f59e0b" },
  { key: "booked", label: "Booked", color: "var(--accentBlue, #3b82f6)" },
  { key: "done", label: "Done", color: "var(--lightGreen, #22c55e)" },
  { key: "lost", label: "Lost", color: "var(--red, #ef4444)" },
];

const PALETTE = [
  "var(--accentBlue, #3b82f6)",
  "var(--lightGreen, #22c55e)",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];
const OTHER_COLOR = "#94a3b8";

// ── Date helpers (keys are local calendar dates in the company time zone) ───

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const MAX_BUCKETS = 400;

const pad = (n: number) => String(n).padStart(2, "0");

function ymd(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function parseKey(key: string) {
  const [datePart, hourPart] = key.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  return { y, m: m - 1, d: d || 1, h: hourPart ? Number(hourPart) : 0 };
}

function addDays(key: string, n: number): string {
  const { y, m, d } = parseKey(key);
  return ymd(y, m, d + n);
}

function addMonthsToKey(monthKey: string, n: number): string {
  const { y, m } = parseKey(monthKey);
  const dt = new Date(Date.UTC(y, m + n, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}

function lastDayOfMonth(monthKey: string): string {
  const { y, m } = parseKey(monthKey);
  return ymd(y, m + 1, 0);
}

function localHour(d: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return Number(h) % 24;
}

/** The next local midnight after the day containing d. */
function nextLocalMidnight(d: Date, timeZone: string): Date {
  const start = tz.startOfDay(d, timeZone);
  return tz.startOfDay(new Date(start.getTime() + 36 * HOUR_MS), timeZone);
}

export function bucketKey(
  d: Date,
  granularity: ChartGranularity,
  timeZone: string,
): string {
  switch (granularity) {
    case "hour":
      return `${tz.formatIsoDate(d, timeZone)} ${pad(localHour(d, timeZone))}`;
    case "day":
      return tz.formatIsoDate(d, timeZone);
    case "week":
      return tz.formatIsoDate(tz.startOfWeek(d, timeZone), timeZone);
    case "month":
      return tz.monthKey(d, timeZone);
  }
}

/** Every bucket key from start (inclusive) to end (exclusive), in order. */
export function bucketKeys(
  start: Date,
  end: Date,
  granularity: ChartGranularity,
  timeZone: string,
): string[] {
  const last = new Date(Math.max(start.getTime(), end.getTime() - 1));
  const keys: string[] = [];

  if (granularity === "hour") {
    const first = Math.floor(start.getTime() / HOUR_MS) * HOUR_MS;
    for (
      let t = first;
      t <= last.getTime() && keys.length < MAX_BUCKETS;
      t += HOUR_MS
    ) {
      const k = bucketKey(new Date(t), "hour", timeZone);
      if (keys[keys.length - 1] !== k) keys.push(k);
    }
    return keys;
  }

  const firstKey = bucketKey(start, granularity, timeZone);
  const lastKey = bucketKey(last, granularity, timeZone);
  const step = (k: string) =>
    granularity === "day"
      ? addDays(k, 1)
      : granularity === "week"
        ? addDays(k, 7)
        : addMonthsToKey(k, 1);

  for (
    let k = firstKey;
    k <= lastKey && keys.length < MAX_BUCKETS;
    k = step(k)
  ) {
    keys.push(k);
  }
  return keys;
}

export function pickGranularity(
  range: string,
  spanMs: number,
): ChartGranularity {
  if (range === "today" || range === "next24") return "hour";
  if (range === "month" || range === "next7") return "day";
  if (range === "year") return "month";
  const days = spanMs / DAY_MS;
  if (days <= 1.05) return "hour";
  if (days <= 62) return "day";
  if (days <= 190) return "week";
  return "month";
}

// ── Labels (built from the keys, so they never shift with the server's zone) ─

function fmt(key: string, opts: Intl.DateTimeFormatOptions): string {
  const { y, m, d, h } = parseKey(key);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(
    new Date(Date.UTC(y, m, d, h)),
  );
}

function bucketLabels(
  key: string,
  granularity: ChartGranularity,
  spansYears: boolean,
): { tick: string; label: string } {
  switch (granularity) {
    case "hour":
      return {
        tick: fmt(key, { hour: "numeric" }),
        label: fmt(key, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
        }),
      };
    case "day":
      return {
        tick: fmt(key, { month: "short", day: "numeric" }),
        label: fmt(key, { weekday: "short", month: "short", day: "numeric" }),
      };
    case "week":
      return {
        tick: fmt(key, { month: "short", day: "numeric" }),
        label: `Week of ${fmt(key, { month: "short", day: "numeric", year: "numeric" })}`,
      };
    case "month":
      return {
        tick: spansYears
          ? fmt(key, { month: "short", year: "2-digit" })
          : fmt(key, { month: "short" }),
        label: fmt(key, { month: "long", year: "numeric" }),
      };
  }
}

function bucketDates(
  key: string,
  granularity: ChartGranularity,
): { from: string | null; to: string | null } {
  switch (granularity) {
    case "hour":
      return { from: null, to: null };
    case "day":
      return { from: key, to: key };
    case "week":
      return { from: key, to: addDays(key, 6) };
    case "month":
      return { from: `${key}-01`, to: lastDayOfMonth(key) };
  }
}

// ── Breakdown categories ─────────────────────────────────────────────────────

type Category = { id: string; label: string };

function categoryOf(row: ChartRow, breakdown: ChartBreakdown): Category {
  switch (breakdown) {
    case "service":
      return row.serviceType
        ? { id: row.serviceType.id, label: row.serviceType.name }
        : { id: "none", label: "No service" };
    case "vehicle":
      return row.vehicle
        ? { id: row.vehicle.id, label: row.vehicle.name }
        : { id: "none", label: "No vehicle" };
    case "driver":
      return row.driver
        ? { id: row.driver.id, label: row.driver.name }
        : { id: "unassigned", label: "Unassigned" };
    case "customer":
      // Same rules as the list's customer-type filter.
      if (row.corporateAccountId)
        return { id: "corporate", label: "Corporate" };
      if (row.userId) return { id: "account", label: "Account" };
      return { id: "guest", label: "Guest" };
    case "status": {
      const g = statusGroup(row.status) ?? "lost";
      const s = STATUS_SERIES.find((x) => x.key === g)!;
      return { id: s.key, label: s.label };
    }
  }
}

function buildSeries(
  rows: ChartRow[],
  breakdown: ChartBreakdown,
): { series: ChartSeries[]; seriesKeyOf: (row: ChartRow) => string } {
  if (breakdown === "status") {
    return {
      series: STATUS_SERIES,
      seriesKeyOf: (row) => statusGroup(row.status) ?? "lost",
    };
  }

  if (breakdown === "customer") {
    const fixed: ChartSeries[] = [
      { key: "corporate", label: "Corporate", color: PALETTE[0] },
      { key: "account", label: "Account", color: PALETTE[1] },
      { key: "guest", label: "Guest", color: PALETTE[2] },
    ];
    return {
      series: fixed,
      seriesKeyOf: (row) => categoryOf(row, "customer").id,
    };
  }

  // Busiest categories first. Up to six are shown; beyond that, the top five
  // plus "Other".
  const counts = new Map<string, { label: string; n: number }>();
  for (const row of rows) {
    const c = categoryOf(row, breakdown);
    const entry = counts.get(c.id) ?? { label: c.label, n: 0 };
    entry.n += 1;
    counts.set(c.id, entry);
  }
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label),
  );
  const shown = ranked.length <= 6 ? ranked : ranked.slice(0, 5);
  const keyById = new Map<string, string>();
  const series: ChartSeries[] = shown.map(([id, { label }], i) => {
    keyById.set(id, `s${i}`);
    return { key: `s${i}`, label, color: PALETTE[i % PALETTE.length] };
  });
  if (ranked.length > shown.length) {
    series.push({ key: "other", label: "Other", color: OTHER_COLOR });
  }

  return {
    series,
    seriesKeyOf: (row) => keyById.get(categoryOf(row, breakdown).id) ?? "other",
  };
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function summarize(rows: ChartRow[]): ChartSummary {
  const charted = rows.filter((r) => statusGroup(r.status));
  let done = 0;
  let needsAction = 0;
  let booked = 0;
  let lost = 0;
  let bookedValueCents = 0;
  const trips = new Set<string>();

  for (const r of charted) {
    const g = statusGroup(r.status);
    if (g === "done") done++;
    if (g === "needs_action") needsAction++;
    if (g === "booked") booked++;
    if (g === "lost") lost++;
    else bookedValueCents += r.totalCents || 0;
    trips.add(r.tripGroupId ? `trip:${r.tripGroupId}` : `ride:${r.id}`);
  }

  return {
    rides: charted.length,
    trips: trips.size,
    done,
    upcoming: needsAction + booked,
    needsAction,
    lost,
    lostRate: charted.length ? lost / charted.length : null,
    bookedValueCents,
  };
}

// ── The chart ────────────────────────────────────────────────────────────────

export function buildBookingsChart({
  rows,
  now,
  timeZone,
  range,
  basis,
  breakdown,
  window,
}: {
  rows: ChartRow[];
  now: Date;
  timeZone: string;
  /** The list's range filter ("month", "today", "range", "all", …). */
  range: string;
  basis: ChartBasis;
  breakdown: ChartBreakdown;
  /** The list's date window, or null to fit the chart to the data. */
  window: { start: Date; end: Date } | null;
}): BookingsChartData {
  const charted = rows.filter((r) => statusGroup(r.status));
  const dateOf = (r: ChartRow) =>
    basis === "created" ? r.createdAt : r.pickupAt;
  const summary = summarize(charted);

  let start: Date;
  let end: Date;
  if (window) {
    start = window.start;
    end = window.end;
  } else if (charted.length) {
    const times = charted.map((r) => dateOf(r).getTime());
    start = tz.startOfDay(new Date(Math.min(...times)), timeZone);
    end = nextLocalMidnight(new Date(Math.max(...times)), timeZone);
  } else {
    return {
      granularity: "day",
      buckets: [],
      series: [],
      todayKey: null,
      summary,
    };
  }

  const granularity = pickGranularity(
    window ? range : "all",
    end.getTime() - start.getTime(),
  );
  const keys = bucketKeys(start, end, granularity, timeZone);
  const spansYears =
    keys.length > 0 &&
    keys[0].slice(0, 4) !== keys[keys.length - 1].slice(0, 4);

  const { series, seriesKeyOf } = buildSeries(charted, breakdown);
  const blank = () => Object.fromEntries(series.map((s) => [s.key, 0]));

  const byKey = new Map<string, ChartBucket>();
  const buckets: ChartBucket[] = keys.map((key) => {
    const bucket: ChartBucket = {
      key,
      ...bucketLabels(key, granularity, spansYears),
      ...bucketDates(key, granularity),
      total: 0,
      values: blank(),
    };
    byKey.set(key, bucket);
    return bucket;
  });

  for (const row of charted) {
    const bucket = byKey.get(bucketKey(dateOf(row), granularity, timeZone));
    if (!bucket) continue;
    const s = seriesKeyOf(row);
    bucket.values[s] = (bucket.values[s] ?? 0) + 1;
    bucket.total += 1;
  }

  const todayKey = bucketKey(now, granularity, timeZone);

  return {
    granularity,
    buckets,
    series,
    todayKey: byKey.has(todayKey) ? todayKey : null,
    summary,
  };
}

// ── "Same days last month" comparison (current-month view) ───────────────────

function shortRange(y: number, m: number, d1: number, d2: number): string {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
  }).format(new Date(Date.UTC(y, m, 1)));
  return d1 === d2 ? `${month} ${d1}` : `${month} ${d1}–${d2}`;
}

export function sameDaysLastMonth(now: Date, timeZone: string) {
  const { y, m, d } = tz.toLocalParts(now, timeZone);
  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  const prevLast = new Date(Date.UTC(prevY, prevM + 1, 0)).getUTCDate();
  const prevD = Math.min(d, prevLast);
  return {
    thisFromYmd: ymd(y, m, 1),
    thisToYmd: ymd(y, m, d),
    lastFromYmd: ymd(prevY, prevM, 1),
    lastToYmd: ymd(prevY, prevM, prevD),
    thisLabel: shortRange(y, m, 1, d),
    lastLabel: shortRange(prevY, prevM, 1, prevD),
  };
}

/** Rides (drafts excluded) whose date falls between two YYYY-MM-DD dates. */
export function countRidesBetween(
  rows: ChartRow[],
  basis: ChartBasis,
  timeZone: string,
  fromYmd: string,
  toYmd: string,
): number {
  return rows.filter((r) => {
    if (!statusGroup(r.status)) return false;
    const day = tz.formatIsoDate(
      basis === "created" ? r.createdAt : r.pickupAt,
      timeZone,
    );
    return day >= fromYmd && day <= toYmd;
  }).length;
}

/** The last 12 months, newest first, as YYYY-MM keys with labels. */
export function recentMonths(now: Date, timeZone: string, count = 12) {
  const current = tz.monthKey(now, timeZone);
  return Array.from({ length: count }, (_, i) => {
    const key = addMonthsToKey(current, -i);
    return {
      key,
      from: `${key}-01`,
      to: lastDayOfMonth(key),
      label: fmt(`${key}-01`, { month: "long", year: "numeric" }),
    };
  });
}
