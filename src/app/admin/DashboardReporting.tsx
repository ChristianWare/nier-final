// The dashboard's Reporting tab: Operational Metrics and Driver Performance,
// with their own period controls. Rendered only when the tab is open.

import * as tz from "@/lib/timezone";
import { describeRange, getRangeWindow } from "@/lib/booking/bookingsRange";
import { driverStats, loadReportRides } from "@/lib/reports/rideStats";
import BookingsTimeControls from "./bookings/BookingsTimeControls";
import OperationalMetricsSection from "./reports/OperationalMetricsSection";
import DriverPerformanceSection from "./reports/DriverPerformanceSection";

const RANGES = [
  "all",
  "month",
  "week",
  "last12",
  "ytd",
  "year",
  "today",
  "next24",
  "next7",
  "upcoming",
  "range",
];
const PICKUP_ONLY = ["next24", "next7", "upcoming"];
const MONTH_OPTIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
].map((label, i) => ({ v: String(i + 1).padStart(2, "0"), label }));

export default async function DashboardReporting({
  sp,
  timezone,
}: {
  sp: Record<string, string | undefined>;
  timezone: string;
}) {
  const range = RANGES.includes(sp.range ?? "") ? sp.range! : "month";
  const monthParam =
    sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : undefined;
  const basis: "pickup" | "created" =
    sp.basis === "created" && !PICKUP_ONLY.includes(range)
      ? "created"
      : "pickup";
  const basisLabel = basis === "created" ? "bookings made" : "rides happening";

  const now = new Date();
  const today = tz.formatIsoDate(now, timezone);
  const todayStart = tz.startOfDay(now, timezone);
  const currentMonthKey = tz.monthKey(now, timezone);
  const selectedMonthKey = monthParam ?? currentMonthKey;
  const fromYmd = sp.from ?? today;
  const toYmd = sp.to ?? today;
  const win = getRangeWindow({
    now,
    timezone,
    range,
    fromYmd,
    toYmd,
    monthKey: selectedMonthKey,
  });
  const rangeLabel = describeRange({ range, win, now, timezone });
  const thisYear = tz.toLocalParts(now, timezone).y;
  const years = Array.from({ length: 6 }, (_, i) => String(thisYear - 4 + i));

  const rides = await loadReportRides({
    dateField: basis === "created" ? "createdAt" : "pickupAt",
    window: win ?? null,
  });

  return (
    <div>
      <BookingsTimeControls
        activeRange={range}
        basis={basis}
        basisTitle='Showing'
        years={years}
        monthOptions={MONTH_OPTIONS}
        selectedYear={selectedMonthKey.slice(0, 4)}
        selectedMonth={selectedMonthKey.slice(5, 7)}
        currentMonthKey={currentMonthKey}
        from={fromYmd}
        to={toYmd}
        rangeLabel={rangeLabel}
      />
      <OperationalMetricsSection
        rides={rides}
        todayStart={todayStart}
        timeZone={timezone}
        rangeLabel={rangeLabel}
        basisLabel={basisLabel}
      />
      <DriverPerformanceSection
        drivers={driverStats(rides, now, todayStart)}
        rangeLabel={rangeLabel}
        basisLabel={basisLabel}
        currency='USD'
        linkToDrivers
      />
    </div>
  );
}
