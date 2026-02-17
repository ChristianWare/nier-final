/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "../../../../auth";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import styles from "./DriverEarningsPage.module.css";
import DriverEarningsControls from "./DriverEarningsControls";
import DriverEarningsChart from "./DriverEarningsChart";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ViewMode = "daily" | "weekly" | "monthly" | "ytd" | "all" | "range";
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
    v === "weekly" ||
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

function formatDateTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateMedium(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(dateUtc: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone,
  }).format(dateUtc);
}

function formatMonthTick(dateUtc: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone,
  }).format(dateUtc);
}

function formatDayLabel(dateUtc: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateUtc);
}

function formatDayTick(dateUtc: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
  }).format(dateUtc);
}

function ymdForInput(dateUtc: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateUtc);
}

function getYear(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "year")!.value);
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

function startOfDayFromYMD(
  ymd: { y: number; m: number; d: number },
  timeZone: string,
) {
  const noon = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12, 0, 0));
  return tz.startOfDay(noon, timeZone);
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

/* ── Chart data type ────────────────────────────────────────── */

type ChartPoint = {
  key: string;
  tick: string;
  label: string;
  baseCents: number;
  tipCents: number;
  totalCents: number;
  count: number;
};

function kpisFromChartData(rows: ChartPoint[]) {
  let totalCents = 0,
    tipCents = 0,
    tripCount = 0;
  for (const r of rows) {
    totalCents += Number(r.totalCents || 0);
    tipCents += Number(r.tipCents || 0);
    tripCount += Number(r.count || 0);
  }
  return {
    totalCents,
    tipCents,
    baseCents: totalCents - tipCents,
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

/* ── Aggregation helpers ──────────────────────────────────── */
/* driverPaymentCents = base pay                               */
/* driverTipCents     = tip on top of base                     */
/* total = base + tip                                          */

async function chartAggDaily(
  driverId: string,
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
): Promise<ChartPoint[]> {
  const rows = await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as base,
      COALESCE(SUM(a."driverTipCents"), 0) as tips,
      COUNT(*) as count
    FROM "Assignment" a
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId}
      AND b.status = 'COMPLETED'
      AND b."pickupAt" >= ${fromUtc}
      AND b."pickupAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const bucket = new Map<
    string,
    { baseCents: number; tipCents: number; count: number }
  >();
  for (const r of rows) {
    bucket.set(String(r.key), {
      baseCents: Number(r.base || 0),
      tipCents: Number(r.tips || 0),
      count: Number(r.count || 0),
    });
  }

  const points: ChartPoint[] = [];
  for (
    let d = new Date(fromUtc.getTime());
    d.getTime() < toUtc.getTime();
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const ymd = ymdForInput(d, timeZone);
    const b = bucket.get(ymd) ?? { baseCents: 0, tipCents: 0, count: 0 };
    points.push({
      key: ymd,
      tick: formatDayTick(d, timeZone),
      label: formatDayLabel(d, timeZone),
      baseCents: b.baseCents,
      tipCents: b.tipCents,
      totalCents: b.baseCents + b.tipCents,
      count: b.count,
    });
  }
  return points;
}

async function chartAggMonthly(
  driverId: string,
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
): Promise<ChartPoint[]> {
  const rows = await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as base,
      COALESCE(SUM(a."driverTipCents"), 0) as tips,
      COUNT(*) as count
    FROM "Assignment" a
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId}
      AND b.status = 'COMPLETED'
      AND b."pickupAt" >= ${fromUtc}
      AND b."pickupAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  const bucket = new Map<
    string,
    { baseCents: number; tipCents: number; count: number }
  >();
  for (const r of rows) {
    bucket.set(String(r.key), {
      baseCents: Number(r.base || 0),
      tipCents: Number(r.tips || 0),
      count: Number(r.count || 0),
    });
  }

  const months: string[] = [];
  for (
    let ms = tz.startOfMonth(fromUtc, timeZone);
    ms.getTime() < toUtc.getTime();
    ms = tz.addMonths(ms, 1, timeZone)
  )
    months.push(tz.monthKey(ms, timeZone));

  return months.map((k) => {
    const ms =
      tz.monthStartFromKey(k, timeZone) ?? tz.startOfMonth(fromUtc, timeZone);
    const b = bucket.get(k) ?? { baseCents: 0, tipCents: 0, count: 0 };
    return {
      key: k,
      tick: formatMonthTick(ms, timeZone),
      label: formatMonthLabel(ms, timeZone),
      baseCents: b.baseCents,
      tipCents: b.tipCents,
      totalCents: b.baseCents + b.tipCents,
      count: b.count,
    };
  });
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
  const { timezone: companyTz } = await getCompanySettings();

  const view = cleanView(spGet(sp, "view"));
  const currentMonthStart = tz.startOfMonth(now, companyTz);
  const rangeFromParam = spGet(sp, "from");
  const rangeToParam = spGet(sp, "to");
  const defaultTo = ymdForInput(now, companyTz);
  const defaultFrom = ymdForInput(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    companyTz,
  );
  const resolvedMY = resolveMonthYear({ view, sp, now, timeZone: companyTz });
  const resolvedMonthKey = resolvedMY.key;

  const earliestAssignment = await db.assignment.findFirst({
    where: { driverId },
    orderBy: { assignedAt: "asc" },
    select: { assignedAt: true },
  });

  let fromUtc = currentMonthStart;
  let toUtc = tz.addMonths(currentMonthStart, 1, companyTz);
  let rangeLabel = formatMonthLabel(currentMonthStart, companyTz);

  if (view === "daily") {
    const ms =
      tz.monthStartFromKey(resolvedMonthKey, companyTz) ?? currentMonthStart;
    fromUtc = ms;
    toUtc = tz.addMonths(ms, 1, companyTz);
    rangeLabel = formatMonthLabel(ms, companyTz);
  }

  if (view === "weekly") {
    const nowLocal = new Date(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: companyTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now) + "T12:00:00",
    );
    const dow = nowLocal.getDay();
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(nowLocal);
    monday.setDate(monday.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    fromUtc = tz.startOfDay(monday, companyTz);
    toUtc = new Date(
      tz.startOfDay(sunday, companyTz).getTime() + 24 * 60 * 60 * 1000,
    );
    rangeLabel = "This week";
  }

  if (view === "monthly") {
    fromUtc = tz.addMonths(currentMonthStart, -11, companyTz);
    toUtc = tz.addMonths(currentMonthStart, 1, companyTz);
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
    fromUtc = fUtc;
    toUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    rangeLabel = `${formatDateMedium(fromUtc, companyTz)} → ${formatDateMedium(new Date(toUtc.getTime() - 1), companyTz)}`;
  }

  if (view === "all") {
    fromUtc = earliestAssignment?.assignedAt
      ? tz.startOfDay(earliestAssignment.assignedAt, companyTz)
      : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    toUtc = new Date(
      tz.startOfDay(now, companyTz).getTime() + 24 * 60 * 60 * 1000,
    );
    rangeLabel = "All time";
  }

  const earliestYear = earliestAssignment?.assignedAt
    ? getYear(earliestAssignment.assignedAt, companyTz)
    : getYear(now, companyTz);
  const currentYear = getYear(now, companyTz);
  const years = Array.from({
    length: Math.max(1, currentYear - earliestYear + 1),
  }).map((_, i) => String(currentYear - i));

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

  const chartData: ChartPoint[] =
    view === "daily" || view === "weekly"
      ? await chartAggDaily(driverId, fromUtc, toUtc, companyTz)
      : await chartAggMonthly(driverId, fromUtc, toUtc, companyTz);

  const kpi = kpisFromChartData(chartData);

  // Monthly breakdown for last 12 months
  const monthMenuStarts = Array.from({ length: 12 }).map((_, i) =>
    tz.addMonths(tz.startOfMonth(now, companyTz), -i, companyTz),
  );
  const oldestMonthStart =
    monthMenuStarts[monthMenuStarts.length - 1] ??
    tz.startOfMonth(now, companyTz);
  const nextAfterCurrent = tz.addMonths(
    tz.startOfMonth(now, companyTz),
    1,
    companyTz,
  );

  const last12Rows = await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${companyTz}), 'YYYY-MM') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as base,
      COALESCE(SUM(a."driverTipCents"), 0) as tips,
      COUNT(*) as count
    FROM "Assignment" a
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId}
      AND b.status = 'COMPLETED'
      AND b."pickupAt" >= ${oldestMonthStart}
      AND b."pickupAt" < ${nextAfterCurrent}
    GROUP BY 1
    ORDER BY 1 DESC
  `;

  const bucket = new Map<
    string,
    { baseCents: number; tipCents: number; count: number }
  >();
  for (const r of last12Rows) {
    bucket.set(String(r.key), {
      baseCents: Number(r.base || 0),
      tipCents: Number(r.tips || 0),
      count: Number(r.count || 0),
    });
  }

  const monthSummary = monthMenuStarts
    .map((ms) => {
      const key = tz.monthKey(ms, companyTz);
      const label = formatMonthLabel(ms, companyTz);
      const v = bucket.get(key) ?? { baseCents: 0, tipCents: 0, count: 0 };
      const totalCents = v.baseCents + v.tipCents;
      const avgCents = v.count > 0 ? Math.round(totalCents / v.count) : 0;
      return {
        key,
        label,
        totalCents,
        tipCents: v.tipCents,
        count: v.count,
        avgCents,
      };
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

  const chartTitle =
    view === "daily"
      ? "Daily Earnings"
      : view === "weekly"
        ? "This Week"
        : "Monthly Earnings";

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link href='/driver-dashboard' className={`${styles.backBtn} backBtn`}>
          <Arrow className='backArrow' /> Back to Dashboard
        </Link>
        <h1 className='heading h2'>My Earnings</h1>
        <p className='subheading'>
          Track your completed trip earnings by day, week, month, or custom date
          range.
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
            <div className='emptyTitle underline'>Total Earnings</div>
          </div>
          <div className={styles.kpiValue}>
            {formatMoney(kpi.totalCents, currency)}
          </div>
          <div className='miniNote'>{rangeLabel}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <div className='emptyTitle underline'>Completed Trips</div>
          </div>
          <div className={styles.kpiValue}>{kpi.tripCount}</div>
          <div className='miniNote'>{rangeLabel}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <div className='emptyTitle underline'>Avg per Trip</div>
          </div>
          <div className={styles.kpiValue}>
            {formatMoney(kpi.avgCents, currency)}
          </div>
          <div className='miniNote'>Based on {kpi.tripCount} trips</div>
        </div>
        <div className={`${styles.kpiCard} ${styles.tone_good}`}>
          <div className={styles.kpiTop}>
            <div className='emptyTitle underline'>Tips</div>
          </div>
          <div className={styles.kpiValue}>
            {formatMoney(kpi.tipCents, currency)}
          </div>
          <div className='miniNote'>Included in total earnings</div>
        </div>
      </div>

      {/* Chart */}
      <section className={styles.chartCard}>
        <div className={styles.cardHeader}>
          <div className='cardTitle h4'>{chartTitle}</div>
          <div className='miniNote'>{rangeLabel}</div>
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
            <div className='cardTitle h4'>Monthly Breakdown</div>
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
                  <th className={styles.right}>Earnings</th>
                  <th className={styles.right}>Tips</th>
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
                          {formatMoney(m.totalCents, currency)}
                        </span>
                      </td>
                      <td className={styles.right}>
                        {m.tipCents > 0
                          ? formatMoney(m.tipCents, currency)
                          : "—"}
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
            <div className='cardTitle h4'>Completed Trips</div>
            <div className='miniNote'>Most recent 50 for selected period</div>
          </div>
          <div className={styles.cardHeaderRight}>
            <span className='miniNote'>Company time</span>
            <span className={styles.tzPill}>{companyTz}</span>
          </div>

          {recentTrips.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No completed trips</div>
              <div className='miniNote'>
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
                    <th className={styles.right}>Tip</th>
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
                            {tz.formatDate(b.pickupAt, companyTz)}
                          </Link>
                          <div className='miniNote'>
                            {tz.formatEta(b.pickupAt, now)}
                          </div>
                        </td>
                        <td>
                          <div className={styles.customerName}>
                            {customerName}
                          </div>
                        </td>
                        <td>{b.serviceType?.name ?? "—"}</td>
                        <td className={styles.right}>
                          {a.driverTipCents && a.driverTipCents > 0
                            ? formatMoney(a.driverTipCents, currency)
                            : "—"}
                        </td>
                        <td className={styles.right}>
                          <span className={styles.earningsValue}>
                            {a.driverPaymentCents != null ||
                            a.driverTipCents != null
                              ? formatMoney(
                                  (a.driverPaymentCents ?? 0) +
                                    (a.driverTipCents ?? 0),
                                  currency,
                                )
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
            <Link
              href='/driver-dashboard/trips?range=past'
              className='primaryBtn'
            >
              View All Trips
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
