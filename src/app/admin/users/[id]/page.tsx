/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./UserDetailPage.module.css";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import Button from "@/components/shared/Button/Button";
import RoleCheckboxForm from "@/components/admin/RoleCheckboxForm/RoleCheckboxForm";
import UserEarningsChart from "./Userearningschart";
import UserEarningsControls from "./Userearningscontrols";
import DeleteUserDangerZoneClient from "./DeleteUserDangerZoneClient";
import AdminPhotoUpload from "@/components/admin/Adminphotoupload/Adminphotoupload";
import DefaultProfileImg from "../../../../../public/images/mesaii.jpg";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import EditUserProfileForm from "@/components/admin/EditUserProfileForm/EditUserProfileForm";

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
  return "monthly";
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

function buildExportHref(
  userId: string,
  view: ViewMode,
  resolvedMY: { year: string; month: string },
  rangeFromParam: string | null,
  rangeToParam: string | null,
  defaultFrom: string,
  defaultTo: string,
) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (view === "daily") {
    params.set("year", resolvedMY.year);
    params.set("month", resolvedMY.month);
  } else if (view === "range") {
    params.set("from", rangeFromParam ?? defaultFrom);
    params.set("to", rangeToParam ?? defaultTo);
  }
  return `/api/admin/users/${userId}/earnings/export?${params.toString()}`;
}

async function chartAggDaily(
  driverId: string,
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('day', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM-DD') as key,
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
    const ymd = tz.formatIsoDate(d, timeZone);
    const b = bucket.get(ymd) ?? { sumCents: 0, count: 0 };
    points.push({
      key: ymd,
      tick: tz.formatDayTick(d, timeZone),
      label: tz.formatDateMedium(d, timeZone),
      earningsCents: b.sumCents,
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
) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
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
    let ms = tz.startOfMonth(fromUtc, timeZone);
    ms.getTime() < toUtc.getTime();
    ms = tz.addMonths(ms, 1, timeZone)
  )
    months.push(tz.monthKey(ms, timeZone));
  return months.map((k) => {
    const ms =
      tz.monthStartFromKey(k, timeZone) ?? tz.startOfMonth(fromUtc, timeZone);
    const b = bucket.get(k) ?? { sumCents: 0, count: 0 };
    return {
      key: k,
      tick: tz.formatMonthTick(ms, timeZone),
      label: tz.formatMonthLabel(ms, timeZone),
      earningsCents: b.sumCents,
      count: b.count,
    };
  });
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
  const { timezone: companyTz } = await getCompanySettings();

  const user = await db.user.findUnique({
    where: { id },
    include: {
      _count: { select: { bookings: true, driverAssignments: true } },
    },
  });
  if (!user) notFound();

  const roles = (user.roles?.length ? user.roles : ["USER"]) as Role[];
  const isDriver = roles.includes("DRIVER");
  const profileImage = user.image ?? null;

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

  let chartData: any[] = [],
    kpi = { totalCents: 0, tripCount: 0, avgCents: 0 },
    rangeLabel = "";
  const view = cleanView(spGet(sp, "view"));
  const currentMonthStart = tz.startOfMonth(now, companyTz);
  const rangeFromParam = spGet(sp, "from"),
    rangeToParam = spGet(sp, "to");
  const defaultTo = tz.formatIsoDate(now, companyTz);
  const defaultFrom = tz.formatIsoDate(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    companyTz,
  );
  const resolvedMY = resolveMonthYear({ view, sp, now, timeZone: companyTz });

  if (isDriver) {
    let fromUtc = currentMonthStart,
      toUtc = tz.addMonths(currentMonthStart, 1, companyTz);
    if (view === "daily") {
      const ms =
        tz.monthStartFromKey(resolvedMY.key, companyTz) ?? currentMonthStart;
      fromUtc = ms;
      toUtc = tz.addMonths(ms, 1, companyTz);
      rangeLabel = tz.formatMonthLabel(ms, companyTz);
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
      const f = parseYMD(rangeFromParam ?? defaultFrom),
        t = parseYMD(rangeToParam ?? defaultTo);
      const fUtc = f
        ? startOfDayFromYMD(f, companyTz)
        : startOfDayFromYMD(parseYMD(defaultFrom)!, companyTz);
      const tUtc0 = t
        ? startOfDayFromYMD(t, companyTz)
        : startOfDayFromYMD(parseYMD(defaultTo)!, companyTz);
      fromUtc = fUtc;
      toUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
      rangeLabel = `${tz.formatDateMedium(fromUtc, companyTz)} → ${tz.formatDateMedium(new Date(toUtc.getTime() - 1), companyTz)}`;
    }
    if (view === "all") {
      const earliest = await db.assignment.findFirst({
        where: { driverId: user.id },
        orderBy: { assignedAt: "asc" },
        select: { assignedAt: true },
      });
      fromUtc = earliest?.assignedAt
        ? tz.startOfDay(earliest.assignedAt, companyTz)
        : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      toUtc = new Date(
        tz.startOfDay(now, companyTz).getTime() + 24 * 60 * 60 * 1000,
      );
      rangeLabel = "All time";
    }
    chartData =
      view === "daily"
        ? await chartAggDaily(user.id, fromUtc, toUtc, companyTz)
        : await chartAggMonthly(user.id, fromUtc, toUtc, companyTz);
    kpi = kpisFromChartData(chartData);
  }

  const earliestAssignment = isDriver
    ? await db.assignment.findFirst({
        where: { driverId: user.id },
        orderBy: { assignedAt: "asc" },
        select: { assignedAt: true },
      })
    : null;
  const earliestYear = earliestAssignment?.assignedAt
    ? tz.toLocalParts(earliestAssignment.assignedAt, companyTz).y
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
  const exportHref = isDriver
    ? buildExportHref(
        user.id,
        view,
        resolvedMY,
        rangeFromParam,
        rangeToParam,
        defaultFrom,
        defaultTo,
      )
    : null;

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link href='/admin/users' className={`${styles.backBtn} backBtn`}>
          <Arrow className='backArrow' /> Back to users
        </Link>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <div className={styles.profileSection}>
              <AdminPhotoUpload
                userId={user.id}
                currentImage={profileImage}
                userName={user.name}
                defaultImage={DefaultProfileImg}
              />
              <div className={styles.profileInfo}>
                <h1 className={`${styles.heading} h2`}>
                  {user.name || "Unnamed User"}
                </h1>
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
            </div>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Account Details */}
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
                {tz.formatDateTime(user.createdAt, companyTz)}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>User ID</span>
              <span className={`${styles.infoValue} ${styles.mono}`}>
                {user.id}
              </span>
            </div>

            {/* Editable name + phone */}
            <EditUserProfileForm
              userId={user.id}
              initialName={user.name ?? null}
              initialPhone={(user as any).phone ?? null}
            />
          </div>
        </div>

        {/* Statistics */}
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

        {/* Manage Roles */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className='cardTitle h4'>Manage Roles</h2>
          </div>
          <div className={styles.cardBody}>
            <RoleCheckboxForm
              userId={user.id}
              initialRoles={roles.filter(
                (r): r is "USER" | "ADMIN" | "DRIVER" =>
                  ["USER", "ADMIN", "DRIVER"].includes(r),
              )}
            />
          </div>
        </div>
      </div>

      {isDriver && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderTop}>
              <div>
                <h2 className='h4'>Driver Earnings</h2>
                <p className='miniNote'>
                  Track completed trip earnings for this driver
                </p>
              </div>
              {exportHref && (
                <Button
                  href={exportHref}
                  text='Download CSV'
                  btnType='black'
                  downloadIcon
                />
              )}
            </div>
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
              <div className='kpiValue'>
                {tz.formatMoneyShort(kpi.totalCents)}
              </div>
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
              <div className='kpiValue'>
                {tz.formatMoneyShort(kpi.avgCents)}
              </div>
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
                  {recentBookings.map((b) => {
                    const href = `/admin/bookings/${b.id}`;
                    return (
                      <tr key={b.id} className={styles.tr}>
                        <td
                          className={styles.td}
                          data-label='Pickup'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-label='Open booking'
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <Link href={href} className={styles.rowLink}>
                            {tz.formatDate(b.pickupAt, companyTz)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>
                              {tz.formatEta(b.pickupAt, now)}
                            </span>
                          </div>
                        </td>
                        <td
                          className={styles.td}
                          data-label='Status'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <span
                            className={`badge badge_${tz.badgeTone(b.status)}`}
                          >
                            {tz.statusLabel(b.status)}
                          </span>
                        </td>
                        <td
                          className={styles.td}
                          data-label='Service'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {b.serviceType?.name ?? "—"}
                        </td>
                        <td
                          className={styles.td}
                          data-label='Route'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
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
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {tz.formatMoneyShort(b.totalCents ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
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
                    const href = `/admin/bookings/${b.id}`;
                    const customerName =
                      b.user?.name?.trim() ||
                      b.guestName?.trim() ||
                      b.user?.email ||
                      b.guestEmail ||
                      "Guest";
                    return (
                      <tr key={a.id} className={styles.tr}>
                        <td
                          className={styles.td}
                          data-label='Pickup'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-label='Open booking'
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <Link href={href} className={styles.rowLink}>
                            {tz.formatDate(b.pickupAt, companyTz)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>
                              {tz.formatEta(b.pickupAt, now)}
                            </span>
                          </div>
                        </td>
                        <td
                          className={styles.td}
                          data-label='Status'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <span
                            className={`badge badge_${tz.badgeTone(b.status)}`}
                          >
                            {tz.statusLabel(b.status)}
                          </span>
                        </td>
                        <td
                          className={styles.td}
                          data-label='Customer'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {customerName}
                        </td>
                        <td
                          className={styles.td}
                          data-label='Service'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {b.serviceType?.name ?? "—"}
                        </td>
                        <td
                          className={`${styles.td} ${styles.tdRight}`}
                          data-label='Driver Pay'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {a.driverPaymentCents
                            ? tz.formatMoneyShort(a.driverPaymentCents)
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

      <DeleteUserDangerZoneClient
        userId={user.id}
        userName={user.name}
        userEmail={user.email}
      />
    </section>
  );
}
