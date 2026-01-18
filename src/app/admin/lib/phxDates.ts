export const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

export function ymdInPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PHX_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateUtc);
}

export function formatMonthLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "long",
    year: "numeric",
  }).format(dateUtc);
}

export function startOfMonthPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();

  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;

  return new Date(startUtcMs);
}

export function startOfNextMonthPhoenix(monthStartUtc: Date) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();

  const nextStartLocalMs = Date.UTC(y, m + 1, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;

  return new Date(nextStartUtcMs);
}

export function startOfPhoenixDayFromYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;

  const startLocalMs = Date.UTC(y, m - 1, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;

  return new Date(startUtcMs);
}

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
