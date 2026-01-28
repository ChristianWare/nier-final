/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "../../../../auth";
import styles from "./DriverEarningsPage.module.css";
import DriverEarningsControls from "./DriverEarningsControls";
import DriverEarningsChart from "./DriverEarningsChart";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

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
  if (v === "month") return "daily";
  if (
    v === "daily" ||
    v === "monthly" ||
    v === "ytd" ||
    v === "all" ||
    v === "range"
  )
    return v;
  return "monthly";
}

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
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

function formatEta(at: Date, now: Date) {
  const diffMs = at.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));
  const label = mins < 90 ? `${mins}m` : hours < 36 ? `${hours}h` : `${days}d`;
  if (diffMs >= 0) return `in ${label}`;
  return `${label} ago`;
}

function toPhoenixParts(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  return { y: phx.getUTCFullYear(), m: phx.getUTCMonth(), d: phx.getUTCDate() };
}

function startOfDayPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function startOfMonthPhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function startOfYearPhoenix(dateUtc: Date) {
  const { y } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, 0, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  return new Date(nextStartLocalMs - PHX_OFFSET_MS);
}

function monthKeyFromDatePhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthStartFromKeyPhoenix(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12)
    return null;
  const startLocalMs = Date.UTC(y, m - 1, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function parseYMD(s: string | null) {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]),
    m = Number(match[2]),
    d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function startOfDayFromYMDPhoenix(ymd: { y: number; m: number; d: number }) {
  const startLocalMs = Date.UTC(ymd.y, ymd.m - 1, ymd.d, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function ymdForInputPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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
  if (legacyKey)
    return {
      year: legacyKey.slice(0, 4),
      month: legacyKey.slice(5, 7),
      key: legacyKey,
    };
  const y = rawYear && /^\d{4}$/.test(rawYear) ? rawYear : currentYear;
  const m =
    rawMonth && /^(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentMonth;
  return { year: y, month: m, key: `${y}-${m}` };
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    CONFIRMED: "Confirmed",
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-show",
  };
  return labels[status] || String(status).replaceAll("_", " ");
}

function badgeTone(status: string) {
  if (status === "CONFIRMED" || status === "ASSIGNED" || status === "COMPLETED")
    return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  return "neutral";
}

function kpisFromChartData(rows: { earningsCents: number; count: number }[]) {
  let totalCents = 0,
    tripCount = 0;
  for (const r of rows) {
    totalCents += Number(r.earningsCents || 0);
    tripCount += Number(r.count || 0);
  }
  return {
    totalCents,
    tripCount,
    avgCents: tripCount > 0 ? Math.round(totalCents / tripCount) : 0,
  };
}

async function resolveSessionUserId(session: any) {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

async function chartAggDaily(driverId: string, fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('day', b."pickupAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM-DD') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as sum, COUNT(*) as count
    FROM "Assignment" a JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId} AND b.status = 'COMPLETED' AND b."pickupAt" >= ${fromUtc} AND b."pickupAt" < ${toUtc}
    GROUP BY 1 ORDER BY 1 ASC`;
  const bucket = new Map<string, { sumCents: number; count: number }>();
  for (const r of rows)
    bucket.set(String(r.key), {
      sumCents: Number(r.sum || 0),
      count: Number(r.count || 0),
    });
  const points: {
    key: string;
    tick: string;
    label: string;
    earningsCents: number;
    count: number;
  }[] = [];
  for (
    let d = new Date(fromUtc.getTime());
    d.getTime() < toUtc.getTime();
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const ymd = ymdForInputPhoenix(d);
    const b = bucket.get(ymd) ?? { sumCents: 0, count: 0 };
    points.push({
      key: ymd,
      tick: formatDayTickPhoenix(d),
      label: formatDayLabelPhoenix(d),
      earningsCents: b.sumCents,
      count: b.count,
    });
  }
  return points;
}

async function chartAggMonthly(driverId: string, fromUtc: Date, toUtc: Date) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as sum, COUNT(*) as count
    FROM "Assignment" a JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId} AND b.status = 'COMPLETED' AND b."pickupAt" >= ${fromUtc} AND b."pickupAt" < ${toUtc}
    GROUP BY 1 ORDER BY 1 ASC`;
  const bucket = new Map<string, { sumCents: number; count: number }>();
  for (const r of rows)
    bucket.set(String(r.key), {
      sumCents: Number(r.sum || 0),
      count: Number(r.count || 0),
    });
  const months: string[] = [];
  for (
    let ms = startOfMonthPhoenix(fromUtc);
    ms.getTime() < toUtc.getTime();
    ms = addMonthsPhoenix(ms, 1)
  )
    months.push(monthKeyFromDatePhoenix(ms));
  return months.map((k) => {
    const ms = monthStartFromKeyPhoenix(k) ?? startOfMonthPhoenix(fromUtc);
    const b = bucket.get(k) ?? { sumCents: 0, count: 0 };
    return {
      key: k,
      tick: formatMonthTickPhoenix(ms),
      label: formatMonthLabelPhoenix(ms),
      earningsCents: b.sumCents,
      count: b.count,
    };
  });
}

function buildHref(
  basePath: string,
  params: Record<string, string | undefined | null>
) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v.trim().length > 0) usp.set(k, v);
  }
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function DriverEarningsPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/earnings");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverIdOrNull = await resolveSessionUserId(session);
  if (!driverIdOrNull) redirect("/");
  const driverId: string = driverIdOrNull;

  const sp = (await Promise.resolve(searchParams ?? {})) as SP;
  const now = new Date();
  const view = cleanView(spGet(sp, "view"));
  const currentMonthStart = startOfMonthPhoenix(now);
  const rangeFromParam = spGet(sp, "from");
  const rangeToParam = spGet(sp, "to");
  const defaultTo = ymdForInputPhoenix(now);
  const defaultFrom = ymdForInputPhoenix(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  );
  const resolvedMY = resolveMonthYear({ view, sp, now });
  const resolvedMonthKey = resolvedMY.key;

  // Get earliest assignment for year range
  const earliestAssignment = await db.assignment.findFirst({
    where: { driverId },
    orderBy: { assignedAt: "asc" },
    select: { assignedAt: true },
  });

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
    fromUtc = addMonthsPhoenix(currentMonthStart, -11);
    toUtc = addMonthsPhoenix(currentMonthStart, 1);
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
    fromUtc = fUtc;
    toUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    rangeLabel = `${formatDatePhx(fromUtc)} → ${formatDatePhx(new Date(toUtc.getTime() - 1))}`;
  }

  if (view === "all") {
    fromUtc = earliestAssignment?.assignedAt
      ? startOfDayPhoenix(earliestAssignment.assignedAt)
      : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    toUtc = new Date(startOfDayPhoenix(now).getTime() + 24 * 60 * 60 * 1000);
    rangeLabel = "All time";
  }

  const earliestYear = earliestAssignment?.assignedAt
    ? toPhoenixParts(earliestAssignment.assignedAt).y
    : toPhoenixParts(now).y;
  const years = Array.from({
    length: Math.max(1, toPhoenixParts(now).y - earliestYear + 1),
  }).map((_, i) => String(toPhoenixParts(now).y - i));

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

  // Fetch chart data
  const chartData =
    view === "daily"
      ? await chartAggDaily(driverId, fromUtc, toUtc)
      : await chartAggMonthly(driverId, fromUtc, toUtc);

  const kpi = kpisFromChartData(chartData);

  // Monthly breakdown for last 12 months
  const monthMenuStarts = Array.from({ length: 12 }).map((_, i) =>
    addMonthsPhoenix(startOfMonthPhoenix(now), -i)
  );
  const oldestMonthStart =
    monthMenuStarts[monthMenuStarts.length - 1] ?? startOfMonthPhoenix(now);
  const nextAfterCurrent = addMonthsPhoenix(startOfMonthPhoenix(now), 1);

  const last12Rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as sum, COUNT(*) as count
    FROM "Assignment" a JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId} 
      AND b.status = 'COMPLETED' 
      AND b."pickupAt" >= ${oldestMonthStart} 
      AND b."pickupAt" < ${nextAfterCurrent}
    GROUP BY 1 ORDER BY 1 DESC`;

  const bucket = new Map<string, { sumCents: number; count: number }>();
  for (const r of last12Rows) {
    bucket.set(String(r.key), {
      sumCents: Number(r.sum || 0),
      count: Number(r.count || 0),
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

  // Recent completed trips
  const recentTrips = await db.assignment.findMany({
    where: {
      driverId,
      booking: {
        status: "COMPLETED",
        pickupAt: { gte: fromUtc, lt: toUtc },
      },
    },
    orderBy: { booking: { pickupAt: "desc" } },
    take: 50,
    include: {
      booking: {
        select: {
          id: true,
          pickupAt: true,
          pickupAddress: true,
          dropoffAddress: true,
          status: true,
          serviceType: { select: { name: true } },
          user: { select: { name: true } },
          guestName: true,
        },
      },
    },
  });

  const chartTitle = view === "daily" ? "Daily Earnings" : "Monthly Earnings";

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link href="/driver-dashboard" className={`${styles.backBtn} backBtn`}>
          <Arrow className="backArrow" /> Back to Dashboard
        </Link>
        <h1 className="heading h2">My Earnings</h1>
        <p className="subheading">
          Track your completed trip earnings by day, month, or custom date range.
        </p>

        <DriverEarningsControls
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

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.tone_good}`}>
          <div className={styles.kpiTop}>
            <div className="emptyTitle underline">Total Earnings</div>
          </div>
          <div className={styles.kpiValue}>{formatMoney(kpi.totalCents, currency)}</div>
          <div className="miniNote">{rangeLabel}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <div className="emptyTitle underline">Completed Trips</div>
          </div>
          <div className={styles.kpiValue}>{kpi.tripCount}</div>
          <div className="miniNote">{rangeLabel}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <div className="emptyTitle underline">Avg per Trip</div>
          </div>
          <div className={styles.kpiValue}>{formatMoney(kpi.avgCents, currency)}</div>
          <div className="miniNote">Based on {kpi.tripCount} trips</div>
        </div>
      </div>

      {/* Chart */}
      <section className={styles.chartCard}>
        <div className={styles.cardHeader}>
          <div className="cardTitle h4">{chartTitle}</div>
          <div className="miniNote">{rangeLabel}</div>
        </div>
        <div className={styles.chartWrap}>
          <DriverEarningsChart data={chartData} currency={currency} />
        </div>
      </section>

      {/* Two Column Layout */}
      <div className={styles.twoCol}>
        {/* Monthly Breakdown */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className="cardTitle h4">Monthly Breakdown</div>
            <div className="miniNote">Last 12 months</div>
          </div>
          <div className={styles.cardHeaderRight}>
            <span className="miniNote">Selected</span>
            <span className={styles.selectedMonth}>
              {view === "daily" ? resolvedMonthKey : "—"}
            </span>
          </div>

          <div className={styles.monthTableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.right}>Earnings</th>
                  <th className={styles.right}>Trips</th>
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
                          href={buildHref("/driver-dashboard/earnings", {
                            view: "daily",
                            year: y,
                            month: mo,
                          })}
                        >
                          {m.label}
                        </Link>
                      </td>
                      <td className={styles.right}>
                        <span className={styles.earningsValue}>
                          {formatMoney(m.sumCents, currency)}
                        </span>
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
        </section>

        {/* Recent Trips */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className="cardTitle h4">Completed Trips</div>
            <div className="miniNote">Most recent 50 for selected period</div>
          </div>
          <div className={styles.cardHeaderRight}>
            <span className="miniNote">Phoenix time</span>
            <span className={styles.tzPill}>{PHX_TZ}</span>
          </div>

          {recentTrips.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No completed trips</div>
              <div className="miniNote">
                Try a different filter or expand the date range.
              </div>
            </div>
          ) : (
            <div className={styles.tripsTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th className={styles.right}>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.map((a) => {
                    const b = a.booking;
                    const customerName =
                      b.user?.name?.trim() || b.guestName?.trim() || "Customer";
                    const href = `/driver-dashboard/trips/${b.id}`;

                    return (
                      <tr key={a.id}>
                        <td>
                          <Link className={styles.rowLink} href={href}>
                            {formatDate(b.pickupAt)}
                          </Link>
                          <div className="miniNote">
                            {formatEta(b.pickupAt, now)}
                          </div>
                        </td>
                        <td>
                          <div className={styles.customerName}>{customerName}</div>
                        </td>
                        <td>{b.serviceType?.name ?? "—"}</td>
                        <td className={styles.right}>
                          <span className={styles.earningsValue}>
                            {a.driverPaymentCents
                              ? formatMoney(a.driverPaymentCents, currency)
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.cardFooter}>
            <Link href="/driver-dashboard/trips?range=past" className="primaryBtn">
              View All Trips
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}