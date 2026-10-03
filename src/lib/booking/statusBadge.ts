// src/lib/booking/statusBadge.ts — how ride tables show dates.
// (Status badges: src/lib/booking/rideBadges.ts)

/** 10/01/2026 */
export function formatMdy(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

/** 9:00 AM */
export function formatClock(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
