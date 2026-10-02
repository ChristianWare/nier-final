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
import {
  chartAggDaily,
  chartAggMonthly,
  kpisFromChartData,
} from "@/lib/earnings/moneyIn";
import { findTripCashPayments } from "@/lib/earnings/tripCash";
import {
  driverStats,
  leadTimeBuckets,
  loadReportRides,
  operationalStats,
  peakTimes,
} from "@/lib/reports/rideStats";

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

// ============================================
// OPERATIONAL METRICS DATA AGGREGATION
// ============================================

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

async function getRevenueByServiceType(fromUtc: Date, toUtc: Date) {
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

async function getRevenueByVehicle(fromUtc: Date, toUtc: Date) {
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

// ============================================
// DRIVER PERFORMANCE DATA AGGREGATION
// ============================================

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
  // "Showing bookings by": pickup date (default) or booked date. Money is
  // always counted by payment date, with the same math as the earnings page.
  const basis: "pickup" | "created" =
    spGet(sp, "basis") === "created" ? "created" : "pickup";
  const basisLabel = basis === "created" ? "by booked date" : "by pickup date";
  const todayStart = tz.startOfDay(now, companyTz);

  const [revenueChartData, rides, serviceRows, vehicleRows, tripCash] =
    await Promise.all([
      view === "daily"
        ? chartAggDaily(fromUtc, toUtc, companyTz)
        : chartAggMonthly(fromUtc, toUtc, companyTz),
      loadReportRides({
        dateField: basis === "created" ? "createdAt" : "pickupAt",
        window: view === "all" ? null : { gte: fromUtc, lt: toUtc },
      }),
      getRevenueByServiceType(fromUtc, toUtc),
      getRevenueByVehicle(fromUtc, toUtc),
      findTripCashPayments(fromUtc, toUtc),
    ]);

  // Cash recorded on trips isn't on a payment record, so it is its own slice
  // (the slices then add up to Captured).
  const tripCashCents = tripCash.reduce((sum, t) => sum + t.cents, 0);
  const cashSlice =
    tripCashCents > 0
      ? [
          {
            name: "Cash on trips",
            value: tripCashCents,
            count: tripCash.length,
          },
        ]
      : [];
  const revenueByService = [...serviceRows, ...cashSlice];
  const revenueByVehicle = [...vehicleRows, ...cashSlice];

  const ops = operationalStats(rides, todayStart);
  const bookingsByStatus = ops.byStatus.map((x) => ({
    name: formatStatusLabel(x.status),
    value: x.count,
    status: x.status,
  }));
  const leadTimeData = leadTimeBuckets(rides);
  const peakTimesData = peakTimes(rides, companyTz);
  const driverPerformance = driverStats(rides, now, todayStart);
  const driverTripsDistribution = driverPerformance
    .slice(0, 10)
    .map((d) => ({ name: d.driverName, value: d.trips }));
  const driverEarningsDistribution = [...driverPerformance]
    .sort((x, y) => y.payCents - x.payCents)
    .slice(0, 10)
    .map((d) => ({ name: d.driverName, value: d.payCents }));
  const driverPayMissing = driverPerformance.reduce(
    (sum, d) => sum + d.payMissing,
    0,
  );

  const kpi = kpisFromChartData(revenueChartData);
  const netTone: "good" | "warn" = kpi.netSumCents >= 0 ? "good" : "warn";
  const revenueChartTitle = chartHeadingFromData(view, revenueChartData);

  // Operational KPIs. Rates only look at rides before today, so upcoming
  // rides don't drag them down.
  const totalBookings = ops.total;
  const completedBookings = ops.completed;
  const cancelledBookings = ops.cancelled;
  const noShowBookings = ops.noShows;
  const completionRate = ops.completionRate ?? 0;
  const cancellationRate = ops.cancellationRate ?? 0;
  const noShowRate = ops.noShowRate ?? 0;

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
          basis={basis}
        />
      </header>

      {/* ============================================ */}
      {/* REVENUE & FINANCIAL SECTION */}
      {/* ============================================ */}
      <section className={styles.section}>
        <div className='header'>
          <h2 className={`cardTitle h4`}>Revenue &amp; Financial</h2>
          <span className={styles.sectionBadge}>
            {rangeLabel} · by payment date
          </span>
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
          <span className={styles.sectionBadge}>
            {rangeLabel} · {basisLabel}
          </span>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard
            label='Total Bookings'
            value={String(totalBookings)}
            sub={`Rides ${basisLabel}`}
          />
          <KpiCard
            label='Completion Rate'
            value={`${completionRate}%`}
            sub={`${completedBookings} completed · ${ops.notClosedOut} not closed out`}
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
          <span className={styles.sectionBadge}>
            {rangeLabel} · {basisLabel}
          </span>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard
            label='Active Drivers'
            value={String(driverPerformance.length)}
            sub='With rides in this period'
          />
          <KpiCard
            label='Total Trips'
            value={String(
              driverPerformance.reduce((sum, d) => sum + d.trips, 0),
            )}
            sub={`Rides ${basisLabel}`}
          />
          <KpiCard
            label='Avg Trips per Driver'
            value={String(
              driverPerformance.length > 0
                ? Math.round(
                    driverPerformance.reduce((sum, d) => sum + d.trips, 0) /
                      driverPerformance.length,
                  )
                : 0,
            )}
            sub='Workload distribution'
          />
          <KpiCard
            label='Driver Pay'
            value={tz.formatMoneyShort(
              driverPerformance.reduce((sum, d) => sum + d.payCents, 0),
              currency,
            )}
            sub={
              driverPayMissing > 0
                ? `Not recorded on ${driverPayMissing} completed ${driverPayMissing === 1 ? "ride" : "rides"}`
                : "Pay + tips recorded on rides"
            }
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
              <span className='miniNote'>Top 10 drivers by pay recorded</span>
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
                  No rides with a driver in this period
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
                    <th className={styles.right}>Upcoming</th>
                    <th className={styles.right}>Not closed out</th>
                    <th className={styles.right}>Cancelled</th>
                    <th className={styles.right}>No-Shows</th>
                    <th className={styles.right}>Completion Rate</th>
                    <th className={styles.right}>Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {driverPerformance.map((driver) => (
                    <tr key={driver.driverId}>
                      <td>
                        <div className={styles.driverName}>
                          {driver.driverName}
                        </div>
                        <span className='miniNote'>{driver.driverEmail}</span>
                      </td>
                      <td className={styles.right}>{driver.trips}</td>
                      <td className={styles.right}>{driver.completed}</td>
                      <td className={styles.right}>{driver.upcoming}</td>
                      <td className={styles.right}>{driver.notClosedOut}</td>
                      <td className={styles.right}>{driver.cancelled}</td>
                      <td className={styles.right}>{driver.noShows}</td>
                      <td className={styles.right}>
                        {driver.completionRate == null ? (
                          <span className='miniNote'>—</span>
                        ) : (
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
                        )}
                      </td>
                      <td className={styles.right}>
                        {tz.formatMoneyShort(driver.payCents, currency)}
                        {driver.payMissing > 0 ? (
                          <div className='miniNote'>
                            {driver.payMissing} not recorded
                          </div>
                        ) : null}
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
