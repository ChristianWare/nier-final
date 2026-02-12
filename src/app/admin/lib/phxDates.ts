import * as tz from "@/lib/timezone";

// ─── Timezone-aware helpers (delegate to lib/timezone) ────────
// All accept a timezone string parameter instead of hardcoding Phoenix.

export function ymdInTz(dateUtc: Date, timeZone: string) {
  return tz.formatIsoDate(dateUtc, timeZone);
}

export function formatMonthLabel(dateUtc: Date, timeZone: string) {
  return tz.formatMonthLabel(dateUtc, timeZone);
}

export function startOfMonth(dateUtc: Date, timeZone: string) {
  return tz.startOfMonth(dateUtc, timeZone);
}

export function startOfNextMonth(monthStartUtc: Date, timeZone: string) {
  return tz.addMonths(monthStartUtc, 1, timeZone);
}

export function startOfDayFromYmd(ymd: string, timeZone: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(tz.localToUtcIso(ymd, "00:00", timeZone));
}

// ─── Non-timezone helpers (pure date math) ────────────────────

export function addDays(date: Date, n: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? 0 : day;
  const res = new Date(date);
  res.setDate(date.getDate() - diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

export function startOfMonthLocal(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
