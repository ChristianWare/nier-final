// src/lib/booking/dueDates.ts
//
// Deposit and balance due dates are calendar days ("Oct 22, 2026"), not
// moments in time. The admin picks a day, and it is saved as midnight UTC on
// that day (2026-10-22T00:00:00Z).
//
// Formatting that value in Phoenix time (UTC-7) turns it into 5 PM the day
// BEFORE, which is why the pay page and admin badges showed Oct 21 for a
// balance due Oct 22. Always read these dates through the helpers below:
// they treat the saved value as a plain calendar day.

type DueDateInput = Date | string | null | undefined;

function toDate(value: DueDateInput): Date | null {
  if (!value) return null;
  // A bare "YYYY-MM-DD" is already a calendar day: read it as UTC midnight.
  const d =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00Z`)
      : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "October 22, 2026" (long) or "Oct 22, 2026" (short). Null when unset. */
export function formatDueDate(
  value: DueDateInput,
  style: "long" | "short" = "long",
): string | null {
  const d = toDate(value);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: style,
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** "2026-10-22": the calendar day, for date inputs and comparisons. */
export function dueDateKey(value: DueDateInput): string | null {
  const d = toDate(value);
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Minutes the zone is ahead of UTC at that instant (Phoenix: -420). */
function zoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    n("year"),
    n("month") - 1,
    n("day"),
    n("hour"),
    n("minute"),
    n("second"),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/**
 * The moment a due-date email should go out: `hour`:00 in the company's time
 * zone on the due day (9:00 AM Phoenix by default).
 */
export function dueDateSendAt(
  value: DueDateInput,
  timeZone: string,
  hour = 9,
): Date | null {
  const key = dueDateKey(value);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
  // Correct by the zone's offset; repeat once in case the guess crossed a
  // daylight-saving change.
  let t = wallClockAsUtc - zoneOffsetMinutes(new Date(wallClockAsUtc), timeZone) * 60_000;
  t = wallClockAsUtc - zoneOffsetMinutes(new Date(t), timeZone) * 60_000;
  return new Date(t);
}
