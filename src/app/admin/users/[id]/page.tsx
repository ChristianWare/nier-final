/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import Button from "@/components/shared/Button/Button";
import RoleCheckboxForm from "@/components/admin/RoleCheckboxForm/RoleCheckboxForm";
import styles from "./UserDetailPage.module.css";
import UserEarningsChart from "./Userearningschart";
import UserEarningsControls from "./Userearningscontrols";
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

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
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

function formatDatePhx(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

function statusLabel(status: string) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "PENDING_PAYMENT":
      return "Payment due";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Driver assigned";
    case "EN_ROUTE":
      return "Driver en route";
    case "ARRIVED":
      return "Driver arrived";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "DRAFT":
      return "Draft";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function badgeTone(status: string) {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  if (status === "COMPLETED") return "good";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  return "neutral";
}

async function chartAggDaily(driverId: string, fromUtc: Date, toUtc: Date) {
  const rows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('day', b."pickupAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM-DD') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as sum,
      COUNT(*) as count
    FROM "Assignment" a
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId}
      AND b.status = 'COMPLETED'
      AND b."pickupAt" >= ${fromUtc}
      AND b."pickupAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const bucket = new Map<string, { sumCents: number; count: number }>();
  for (const r of rows) {
    const k = String(r.key);
    bucket.set(k, {
      sumCents: Number(r.sum || 0),
      count: Number(r.count || 0),
    });
  }

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
  const rows = (await db.$queryRaw<any[]>`
    SELECT
      to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM') as key,
      COALESCE(SUM(a."driverPaymentCents"), 0) as sum,
      COUNT(*) as count
    FROM "Assignment" a
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId}
      AND b.status = 'COMPLETED'
      AND b."pickupAt" >= ${fromUtc}
      AND b."pickupAt" < ${toUtc}
    GROUP BY 1
    ORDER BY 1 ASC
  `) as any[];

  const bucket = new Map<string, { sumCents: number; count: number }>();
  for (const r of rows) {
    const k = String(r.key);
    bucket.set(k, {
      sumCents: Number(r.sum || 0),
      count: Number(r.count || 0),
    });
  }

  const months: string[] = [];
  for (
    let ms = startOfMonthPhoenix(fromUtc);
    ms.getTime() < toUtc.getTime();
    ms = addMonthsPhoenix(ms, 1)
  ) {
    months.push(monthKeyFromDatePhoenix(ms));
  }

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

function kpisFromChartData(
  rows: {
    earningsCents: number;
    count: number;
  }[],
) {
  let totalCents = 0;
  let tripCount = 0;

  for (const r of rows) {
    totalCents += Number(r.earningsCents || 0);
    tripCount += Number(r.count || 0);
  }

  const avgCents = tripCount > 0 ? Math.round(totalCents / tripCount) : 0;

  return {
    totalCents,
    tripCount,
    avgCents,
  };
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: SP | Promise<SP>;
}) {
  const { id } = await params;
  const sp = (await Promise.resolve(searchParams ?? {})) as SP;
  const now = new Date();

  const user = await db.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          bookings: true,
          driverAssignments: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const roles = (user.roles?.length ? user.roles : ["USER"]) as Role[];
  const isDriver = roles.includes("DRIVER");
  const isAdmin = roles.includes("ADMIN");

  // Get recent bookings (as customer)
  const recentBookings = await db.booking.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      status: true,
      totalCents: true,
      serviceType: { select: { name: true } },
    },
  });

  // Get recent assignments (as driver)
  const recentAssignments = isDriver
    ? await db.assignment.findMany({
        where: { driverId: user.id },
        orderBy: { assignedAt: "desc" },
        take: 10,
        include: {
          booking: {
            select: {
              id: true,
              pickupAt: true,
              pickupAddress: true,
              dropoffAddress: true,
              status: true,
              totalCents: true,
              serviceType: { select: { name: true } },
              user: { select: { name: true, email: true } },
              guestName: true,
              guestEmail: true,
            },
          },
        },
      })
    : [];

  // Driver earnings chart data
  let chartData: any[] = [];
  let kpi = { totalCents: 0, tripCount: 0, avgCents: 0 };
  let rangeLabel = "";

  if (isDriver) {
    const view = cleanView(spGet(sp, "view"));
    const currentMonthStart = startOfMonthPhoenix(now);
    const rangeFromParam = spGet(sp, "from");
    const rangeToParam = spGet(sp, "to");
    const defaultTo = ymdForInputPhoenix(now);
    const defaultFrom = ymdForInputPhoenix(
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    );
    const resolvedMY = resolveMonthYear({ view, sp, now });

    let fromUtc = currentMonthStart;
    let toUtc = addMonthsPhoenix(currentMonthStart, 1);

    if (view === "daily") {
      const ms = monthStartFromKeyPhoenix(resolvedMY.key) ?? currentMonthStart;
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
      const earliest = await db.assignment.findFirst({
        where: { driverId: user.id },
        orderBy: { assignedAt: "asc" },
        select: { assignedAt: true },
      });
      fromUtc = earliest?.assignedAt
        ? startOfDayPhoenix(earliest.assignedAt)
        : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      toUtc = new Date(startOfDayPhoenix(now).getTime() + 24 * 60 * 60 * 1000);
      rangeLabel = "All time";
    }

    chartData =
      view === "daily"
        ? await chartAggDaily(user.id, fromUtc, toUtc)
        : await chartAggMonthly(user.id, fromUtc, toUtc);

    kpi = kpisFromChartData(chartData);
  }

  // Get years for the dropdown
  const earliestAssignment = isDriver
    ? await db.assignment.findFirst({
        where: { driverId: user.id },
        orderBy: { assignedAt: "asc" },
        select: { assignedAt: true },
      })
    : null;

  const earliestYear = earliestAssignment?.assignedAt
    ? toPhoenixParts(earliestAssignment.assignedAt).y
    : toPhoenixParts(now).y;
  const latestYear = toPhoenixParts(now).y;

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

  const view = cleanView(spGet(sp, "view"));
  const resolvedMY = resolveMonthYear({ view, sp, now });
  const defaultTo = ymdForInputPhoenix(now);
  const defaultFrom = ymdForInputPhoenix(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  );

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link href='/admin/users' className='backBtn'>
          <Arrow className='backArrow'/> Back to Users
        </Link>

        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>
              {user.name || "Unnamed User"}
            </h1>
          </div>
          <div className={styles.badgesRow}>
            {roles.map((role) => (
              <span
                key={role}
                className={`badge ${
                  role === "ADMIN"
                    ? "badge_accent"
                    : role === "DRIVER"
                      ? "badge_good"
                      : "badge_neutral"
                }`}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* User Info Card */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className='cardTitle h4'>Account Details</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>{user.name || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email Verified</span>
              <span
                className={`badge ${user.emailVerified ? "badge_good" : "badge_neutral"}`}
              >
                {user.emailVerified ? "Yes" : "No"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Joined</span>
              <span className={styles.infoValue}>
                {formatDateTime(user.createdAt)}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>User ID</span>
              <span className={`${styles.infoValue} ${styles.mono}`}>
                {user.id}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className='cardTitle h4'>Statistics</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <div className={styles.statValue}>{user._count.bookings}</div>
                <div className={styles.statLabel}>Bookings</div>
              </div>
              {isDriver && (
                <div className={styles.statBox}>
                  <div className={styles.statValue}>
                    {user._count.driverAssignments}
                  </div>
                  <div className={styles.statLabel}>Trips Completed</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className='cardTitle h4'>Manage Roles</h2>
          </div>
          <div className={styles.cardBody}>
            <RoleCheckboxForm userId={user.id} initialRoles={roles} />
          </div>
        </div>
      </div>

      {/* Driver Earnings Section */}
      {isDriver && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='h4'>Driver Earnings</h2>
            <p className='miniNote'>
              Track completed trip earnings for this driver
            </p>
          </div>

          <UserEarningsControls
            userId={user.id}
            years={years}
            monthOptions={monthOptions}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
            initialView={view}
            initialYear={resolvedMY.year}
            initialMonth={resolvedMY.month}
            initialFrom={spGet(sp, "from") ?? defaultFrom}
            initialTo={spGet(sp, "to") ?? defaultTo}
            rangeLabel={rangeLabel}
          />

          <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${styles.tone_good}`}>
              <div className={styles.kpiTop}>
                <div className='emptyTitle underline'>Total Earnings</div>
              </div>
              <div className='kpiValue'>{formatMoney(kpi.totalCents)}</div>
              <div className='miniNote'>{rangeLabel}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <div className='emptyTitle underline'>Trips</div>
              </div>
              <div className='kpiValue'>{kpi.tripCount}</div>
              <div className='miniNote'>Completed trips</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <div className='emptyTitle underline'>Avg per Trip</div>
              </div>
              <div className='kpiValue'>{formatMoney(kpi.avgCents)}</div>
              <div className='miniNote'>Average earnings</div>
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <h3 className='cardTitle h4'>
                {view === "daily" ? "Daily" : "Monthly"} Earnings
              </h3>
              <div className='miniNote'>{rangeLabel}</div>
            </div>
            <div className={styles.chartWrap}>
              <UserEarningsChart data={chartData} currency='USD' />
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings (as customer) */}
      {recentBookings.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='h4'>Recent Bookings</h2>
            <p className='miniNote'>Bookings made by this user as a customer</p>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr className={styles.trHead}>
                    <th className={styles.th}>Pickup</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Service</th>
                    <th className={styles.th}>Route</th>
                    <th className={`${styles.th} ${styles.thRight}`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id} className={styles.tr}>
                      <td className={styles.td} data-label='Pickup'>
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className={styles.rowLink}
                        >
                          {formatDate(b.pickupAt)}
                        </Link>
                        <div className={styles.pickupMeta}>
                          <span className={styles.pill}>
                            {formatEta(b.pickupAt, now)}
                          </span>
                        </div>
                      </td>
                      <td className={styles.td} data-label='Status'>
                        <span className={`badge badge_${badgeTone(b.status)}`}>
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td className={styles.td} data-label='Service'>
                        {b.serviceType?.name ?? "—"}
                      </td>
                      <td className={styles.td} data-label='Route'>
                        <div className={styles.cellStack}>
                          <div className={styles.cellStrong}>
                            {b.pickupAddress?.slice(0, 30)}...
                          </div>
                          <div className={styles.cellSub}>
                            → {b.dropoffAddress?.slice(0, 30)}...
                          </div>
                        </div>
                      </td>
                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label='Total'
                      >
                        {formatMoney(b.totalCents ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.actionsRow}>
            <Button
              href={`/admin/bookings?q=${encodeURIComponent(user.email)}`}
              text='View All Bookings'
              btnType='black'
              arrow
            />
          </div>
        </div>
      )}

      {/* Recent Assignments (as driver) */}
      {isDriver && recentAssignments.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='h4'>Recent Assignments</h2>
            <p className='miniNote'>Trips assigned to this driver</p>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr className={styles.trHead}>
                    <th className={styles.th}>Pickup</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Customer</th>
                    <th className={styles.th}>Service</th>
                    <th className={`${styles.th} ${styles.thRight}`}>
                      Driver Pay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssignments.map((a) => {
                    const b = a.booking;
                    const customerName =
                      b.user?.name?.trim() ||
                      b.guestName?.trim() ||
                      b.user?.email ||
                      b.guestEmail ||
                      "Guest";

                    return (
                      <tr key={a.id} className={styles.tr}>
                        <td className={styles.td} data-label='Pickup'>
                          <Link
                            href={`/admin/bookings/${b.id}`}
                            className={styles.rowLink}
                          >
                            {formatDate(b.pickupAt)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>
                              {formatEta(b.pickupAt, now)}
                            </span>
                          </div>
                        </td>
                        <td className={styles.td} data-label='Status'>
                          <span
                            className={`badge badge_${badgeTone(b.status)}`}
                          >
                            {statusLabel(b.status)}
                          </span>
                        </td>
                        <td className={styles.td} data-label='Customer'>
                          {customerName}
                        </td>
                        <td className={styles.td} data-label='Service'>
                          {b.serviceType?.name ?? "—"}
                        </td>
                        <td
                          className={`${styles.td} ${styles.tdRight}`}
                          data-label='Driver Pay'
                        >
                          {a.driverPaymentCents
                            ? formatMoney(a.driverPaymentCents)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
