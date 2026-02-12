// ─── Internal: offset calculation ─────────────────────────────
// Uses Intl.DateTimeFormat to determine the UTC offset for any
// IANA timezone at a given moment. Handles DST automatically.
// Returns offset in milliseconds (positive = ahead of UTC).

const offsetFormatter = new Map<string, Intl.DateTimeFormat>();

function getFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = offsetFormatter.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    offsetFormatter.set(tz, fmt);
  }
  return fmt;
}

function getOffsetMs(dateUtc: Date, tz: string): number {
  const parts = getFormatter(tz).formatToParts(dateUtc);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  let hour = get("hour");
  if (hour === 24) hour = 0; // midnight edge case

  const localAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );

  return localAsUtc - dateUtc.getTime();
}

// ─── Local parts extraction ───────────────────────────────────

/** Extract year, month (0-based), day in the given timezone. */
export function toLocalParts(dateUtc: Date, tz: string) {
  const offset = getOffsetMs(dateUtc, tz);
  const local = new Date(dateUtc.getTime() + offset);
  return {
    y: local.getUTCFullYear(),
    m: local.getUTCMonth(),
    d: local.getUTCDate(),
  };
}

// ─── Date boundary helpers ────────────────────────────────────

/** UTC timestamp of midnight on the day containing dateUtc in the given timezone. */
export function startOfDay(dateUtc: Date, tz: string): Date {
  const { y, m, d } = toLocalParts(dateUtc, tz);
  const localMidnightMs = Date.UTC(y, m, d, 0, 0, 0);
  const estimate = new Date(localMidnightMs - getOffsetMs(dateUtc, tz));
  return new Date(localMidnightMs - getOffsetMs(estimate, tz));
}

/** UTC timestamp of midnight on the Sunday starting the week containing dateUtc. */
export function startOfWeek(dateUtc: Date, tz: string): Date {
  const { y, m, d } = toLocalParts(dateUtc, tz);
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
  const localSundayMs = Date.UTC(y, m, d - dow, 0, 0, 0);
  const estimate = new Date(localSundayMs - getOffsetMs(dateUtc, tz));
  return new Date(localSundayMs - getOffsetMs(estimate, tz));
}

// ─── Month math ───────────────────────────────────────────────

/** UTC timestamp of midnight on the 1st of the month containing dateUtc. */
export function startOfMonth(dateUtc: Date, tz: string): Date {
  const { y, m } = toLocalParts(dateUtc, tz);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  // First estimate using current offset
  const estimate = new Date(startLocalMs - getOffsetMs(dateUtc, tz));
  // Refine with the offset at the estimated UTC (handles DST boundary)
  return new Date(startLocalMs - getOffsetMs(estimate, tz));
}

/** Add (or subtract) months from a month-start UTC date. */
export function addMonths(
  monthStartUtc: Date,
  deltaMonths: number,
  tz: string,
): Date {
  const offset = getOffsetMs(monthStartUtc, tz);
  const local = new Date(monthStartUtc.getTime() + offset);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const nextLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  // Refine offset for the new month (DST may differ)
  const estimate = new Date(nextLocalMs - offset);
  return new Date(nextLocalMs - getOffsetMs(estimate, tz));
}

/** UTC timestamp of midnight on Jan 1 of the year containing dateUtc. */
export function startOfYear(dateUtc: Date, tz: string): Date {
  const { y } = toLocalParts(dateUtc, tz);
  const localMs = Date.UTC(y, 0, 1, 0, 0, 0);
  const estimate = new Date(localMs - getOffsetMs(dateUtc, tz));
  return new Date(localMs - getOffsetMs(estimate, tz));
}

/** "YYYY-MM" key from a UTC date in the given timezone. */
export function monthKey(dateUtc: Date, tz: string): string {
  const { y, m } = toLocalParts(dateUtc, tz);
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Parse a "YYYY-MM" key back to the UTC start-of-month in the given timezone. */
export function monthStartFromKey(key: string, tz: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || m < 1 || m > 12) return null;
  const startLocalMs = Date.UTC(y, m - 1, 1, 0, 0, 0);
  const estimate = new Date(startLocalMs + 7 * 60 * 60 * 1000); // rough guess
  return new Date(startLocalMs - getOffsetMs(estimate, tz));
}

// ─── Display formatting ───────────────────────────────────────
// These all use Intl.DateTimeFormat which natively handles DST.

/** "Jan 2026" */
export function formatMonthLabel(dateUtc: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: tz,
  }).format(dateUtc);
}

/** "Jan '26" */
export function formatMonthTick(dateUtc: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: tz,
  }).format(dateUtc);
}

/** "01/15/2026" */
export function formatDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

/** "Jan 15, 2026" (medium date, no time) */
export function formatDateMedium(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** "Jan 15, 2026, 3:00 PM" */
export function formatDateTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** "2026-01-15" (ISO date string in the given timezone) */
export function formatIsoDate(d: Date, tz: string): string {
  const { y, m, d: day } = toLocalParts(d, tz);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "01/15" (short day tick for charts, no year) */
export function formatDayTick(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// ─── Relative time (timezone-independent) ─────────────────────

/** "in 5m", "3h ago", "2d ago" */
export function formatEta(at: Date, now: Date): string {
  const diffMs = at.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));
  const label = mins < 90 ? `${mins}m` : hours < 36 ? `${hours}h` : `${days}d`;
  return diffMs >= 0 ? `in ${label}` : `${label} ago`;
}

// ─── Currency formatting (convenience, non-TZ) ───────────────

/** "$123.45" */
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

/** "$123" (no decimals) */
export function formatMoneyShort(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

// ─── Booking status helpers (convenience, non-TZ) ─────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  PENDING_PAYMENT: "Payment due",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Driver assigned",
  EN_ROUTE: "Driver en route",
  ARRIVED: "Driver arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
  DRAFT: "Draft",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || String(status).replaceAll("_", " ");
}

export function badgeTone(status: string): string {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED" || status === "COMPLETED")
    return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  return "neutral";
}

// ─── Chart aggregation helpers ────────────────────────────────

/**
 * Generate an array of month keys between fromUtc and toUtc
 * for building zero-filled chart data.
 */
export function monthKeysInRange(
  fromUtc: Date,
  toUtc: Date,
  tz: string,
): string[] {
  const keys: string[] = [];
  for (
    let ms = startOfMonth(fromUtc, tz);
    ms.getTime() < toUtc.getTime();
    ms = addMonths(ms, 1, tz)
  ) {
    keys.push(monthKey(ms, tz));
  }
  return keys;
}

/**
 * Build chart-ready month data from a bucket map.
 * Returns { key, tick, label, value } for each month in range.
 */
export function buildMonthChartData(
  bucket: Map<string, number>,
  fromUtc: Date,
  toUtc: Date,
  tz: string,
): { key: string; tick: string; label: string; value: number }[] {
  const keys = monthKeysInRange(fromUtc, toUtc, tz);
  return keys.map((k) => {
    const ms = monthStartFromKey(k, tz) ?? startOfMonth(fromUtc, tz);
    return {
      key: k,
      tick: formatMonthTick(ms, tz),
      label: formatMonthLabel(ms, tz),
      value: bucket.get(k) ?? 0,
    };
  });
}

// ─── BookingWizard: local time → UTC ISO ──────────────────────

/**
 * Convert a date string ("2026-02-15") and time string ("14:00")
 * in the company's timezone to a UTC ISO string.
 *
 * This solves the problem where a customer in New York booking
 * a 2:00 PM Phoenix pickup would otherwise get interpreted as
 * 2:00 PM Eastern by the browser's Date constructor.
 *
 * Usage (client-side):
 *   const utcIso = localToUtcIso("2026-02-15", "14:00", "America/Phoenix");
 *   // → "2026-02-15T21:00:00.000Z"  (14:00 MST = 21:00 UTC)
 */
export function localToUtcIso(
  dateStr: string,
  timeStr: string,
  tz: string,
): string {
  // Parse the date and time components
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Build a "local time expressed as UTC" timestamp
  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // Create a rough estimate of the actual UTC time
  // (use a known approximation, then refine)
  const roughUtc = new Date(localAsUtcMs);
  const offset = getOffsetMs(roughUtc, tz);

  // Actual UTC = localTime - offset
  const actualUtcMs = localAsUtcMs - offset;

  // Verify: the offset at our result should be the same
  // (handles rare DST transition edge cases)
  const actualUtc = new Date(actualUtcMs);
  const refinedOffset = getOffsetMs(actualUtc, tz);
  if (refinedOffset !== offset) {
    // DST boundary — use the refined offset
    return new Date(localAsUtcMs - refinedOffset).toISOString();
  }

  return actualUtc.toISOString();
}

/**
 * Check if a local time in the company timezone is "too soon"
 * (within the given minutes from now).
 *
 * Usage (client-side):
 *   const tooSoon = isPickupTooSoon("2026-02-15", "14:00", "America/Phoenix", 120);
 */
export function isPickupTooSoon(
  dateStr: string,
  timeStr: string,
  tz: string,
  minMinutesAhead: number,
): boolean {
  const utcIso = localToUtcIso(dateStr, timeStr, tz);
  const pickupMs = new Date(utcIso).getTime();
  const nowMs = Date.now();
  return pickupMs - nowMs < minMinutesAhead * 60 * 1000;
}

// ─── Timezone label for customer display ──────────────────────

const TIMEZONE_SHORT_LABELS: Record<string, string> = {
  "America/Phoenix": "Phoenix, AZ (MST)",
  "America/New_York": "Eastern (ET)",
  "America/Chicago": "Central (CT)",
  "America/Denver": "Mountain (MT)",
  "America/Los_Angeles": "Pacific (PT)",
  "America/Anchorage": "Alaska (AKT)",
  "Pacific/Honolulu": "Hawaii (HST)",
};

/** Human-readable timezone label, e.g. "Phoenix, AZ (MST)" */
export function timezoneLabel(tz: string): string {
  return TIMEZONE_SHORT_LABELS[tz] ?? tz;
}
