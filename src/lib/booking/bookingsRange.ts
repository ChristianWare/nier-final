// src/lib/booking/bookingsRange.ts
//
// The date window behind each time view on /admin/bookings. The list query
// and the chart both use getRangeWindow, so they always cover the same dates.

import * as tz from "@/lib/timezone";

function parseYMD(s: string | null | undefined) {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
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
  timezone: string,
) {
  const iso = `${ymd.y}-${String(ymd.m).padStart(2, "0")}-${String(ymd.d).padStart(2, "0")}`;
  return new Date(tz.localToUtcIso(iso, "00:00", timezone));
}

function startOfYear(dateUtc: Date, timezone: string) {
  const { y } = tz.toLocalParts(dateUtc, timezone);
  const iso = `${y}-01-01`;
  return new Date(tz.localToUtcIso(iso, "00:00", timezone));
}

function startOfNextYear(yearStartUtc: Date, timezone: string) {
  const { y } = tz.toLocalParts(yearStartUtc, timezone);
  const iso = `${y + 1}-01-01`;
  return new Date(tz.localToUtcIso(iso, "00:00", timezone));
}

/** The date window for a range filter, in the company's time zone.
 *  "all" has no window. Shared by the list query and the chart. */
export function getRangeWindow(args: {
  now: Date;
  timezone: string;
  range: string;
  fromYmd: string;
  toYmd: string;
  /** YYYY-MM shown by the Daily view (defaults to the current month). */
  monthKey?: string;
}): { gte: Date; lt?: Date } | undefined {
  const { now, timezone, range, fromYmd, toYmd, monthKey } = args;
  const todayStart = tz.startOfDay(now, timezone);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const monthStart = tz.startOfMonth(now, timezone);
  const nextMonthStart = tz.addMonths(monthStart, 1, timezone);

  const yearStart = startOfYear(now, timezone);
  const nextYearStart = startOfNextYear(yearStart, timezone);

  let pickupAtFilter: { gte: Date; lt?: Date } | undefined;

  // Every pickup from now on, however far ahead.
  if (range === "upcoming") return { gte: now };

  if (range === "today")
    pickupAtFilter = { gte: todayStart, lt: tomorrowStart };
  if (range === "next24") pickupAtFilter = { gte: now, lt: next24h };
  if (range === "next7") pickupAtFilter = { gte: now, lt: next7d };
  if (range === "month") {
    const picked = monthKey ? tz.monthStartFromKey(monthKey, timezone) : null;
    const start = picked ?? monthStart;
    pickupAtFilter = { gte: start, lt: tz.addMonths(start, 1, timezone) };
  }
  // The same windows as the earnings page's Weekly / Monthly / Year to date.
  if (range === "week") {
    const { y, m, d } = tz.toLocalParts(now, timezone);
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
    const toMonday = dow === 0 ? 6 : dow - 1;
    const monday = new Date(Date.UTC(y, m, d - toMonday));
    const nextMonday = new Date(Date.UTC(y, m, d - toMonday + 7));
    const ymd = (dt: Date) => ({
      y: dt.getUTCFullYear(),
      m: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
    });
    pickupAtFilter = {
      gte: startOfDayFromYMD(ymd(monday), timezone),
      lt: startOfDayFromYMD(ymd(nextMonday), timezone),
    };
  }
  if (range === "last12")
    pickupAtFilter = {
      gte: tz.addMonths(monthStart, -11, timezone),
      lt: nextMonthStart,
    };
  if (range === "ytd") pickupAtFilter = { gte: yearStart, lt: nextMonthStart };
  if (range === "year") pickupAtFilter = { gte: yearStart, lt: nextYearStart };
  // "all" intentionally sets no date filter

  if (range === "range") {
    const f = parseYMD(fromYmd);
    const t = parseYMD(toYmd);

    let fromUtc = f ? startOfDayFromYMD(f, timezone) : todayStart;
    const toUtc0 = t ? startOfDayFromYMD(t, timezone) : todayStart;

    let toUtc = new Date(toUtc0.getTime() + 24 * 60 * 60 * 1000);

    if (toUtc.getTime() < fromUtc.getTime()) {
      const tmp = fromUtc;
      fromUtc = toUtc0;
      toUtc = new Date(tmp.getTime() + 24 * 60 * 60 * 1000);
    }

    pickupAtFilter = { gte: fromUtc, lt: toUtc };
  }

  return pickupAtFilter;
}

/** What the time controls' pill, the chart and the Rides card say. */
export function describeRange(args: {
  range: string;
  win: { gte: Date; lt?: Date } | undefined;
  now: Date;
  timezone: string;
}): string {
  const { range, win, now, timezone } = args;
  switch (range) {
    case "month":
      return tz.formatMonthLabel(win?.gte ?? now, timezone);
    case "week":
      return "This week";
    case "last12":
      return "Last 12 months";
    case "ytd":
      return "Year to date";
    case "year":
      return String(tz.toLocalParts(now, timezone).y);
    case "all":
      return "All time";
    case "today":
      return "Today";
    case "next24":
      return "Next 24 hours";
    case "next7":
      return "Next 7 days";
    case "upcoming":
      return "Upcoming";
    case "range": {
      if (!win?.lt) return "Date range";
      const first = tz.formatDateMedium(win.gte, timezone);
      const last = tz.formatDateMedium(
        new Date(win.lt.getTime() - 1),
        timezone,
      );
      return first === last ? first : `${first} → ${last}`;
    }
    default:
      return "All time";
  }
}
