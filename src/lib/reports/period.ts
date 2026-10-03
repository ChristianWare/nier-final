// src/lib/reports/period.ts
//
// The period a generated report covers, in the company's time zone.

import * as tz from "@/lib/timezone";

export type PeriodKind = "month" | "quarter" | "year" | "range" | "all";

export type Period = {
  kind: PeriodKind;
  /** null for all time. */
  fromUtc: Date | null;
  toUtc: Date | null;
  label: string;
  /** Safe for file names, e.g. "2026-09" or "2026-Q3". */
  fileLabel: string;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dayStart(ymd: string, timezone: string): Date {
  return new Date(tz.localToUtcIso(ymd, "00:00", timezone));
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const isYmd = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function resolvePeriod(
  q: {
    period?: string | null;
    year?: string | null;
    month?: string | null;
    quarter?: string | null;
    from?: string | null;
    to?: string | null;
  },
  timezone: string,
  now: Date,
): Period {
  const local = tz.toLocalParts(now, timezone);
  const year = q.year && /^\d{4}$/.test(q.year) ? Number(q.year) : local.y;

  switch (q.period) {
    case "all":
      return {
        kind: "all",
        fromUtc: null,
        toUtc: null,
        label: "All time",
        fileLabel: "all-time",
      };
    case "year": {
      const from = dayStart(`${year}-01-01`, timezone);
      const to = dayStart(`${year + 1}-01-01`, timezone);
      return {
        kind: "year",
        fromUtc: from,
        toUtc: to,
        label: String(year),
        fileLabel: String(year),
      };
    }
    case "quarter": {
      const qn = Math.min(
        4,
        Math.max(1, Number(q.quarter) || Math.floor(local.m / 3) + 1),
      );
      const m = (qn - 1) * 3 + 1;
      const from = dayStart(
        `${year}-${String(m).padStart(2, "0")}-01`,
        timezone,
      );
      const to = tz.addMonths(from, 3, timezone);
      return {
        kind: "quarter",
        fromUtc: from,
        toUtc: to,
        label: `Q${qn} ${year} (${MONTHS[m - 1].slice(0, 3)}–${MONTHS[m + 1].slice(0, 3)})`,
        fileLabel: `${year}-Q${qn}`,
      };
    }
    case "range": {
      if (isYmd(q.from) && isYmd(q.to)) {
        const [a, b] = q.from <= q.to ? [q.from, q.to] : [q.to, q.from];
        const fmt = (ymd: string) =>
          tz.formatDateMedium(dayStart(ymd, timezone), timezone);
        return {
          kind: "range",
          fromUtc: dayStart(a, timezone),
          toUtc: dayStart(addDays(b, 1), timezone),
          label: a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`,
          fileLabel: a === b ? a : `${a}_to_${b}`,
        };
      }
      break; // falls back to the month below
    }
  }

  const monthNum =
    q.month && /^(0?[1-9]|1[0-2])$/.test(q.month)
      ? Number(q.month)
      : local.m + 1;
  const key = `${year}-${String(monthNum).padStart(2, "0")}`;
  const from = tz.monthStartFromKey(key, timezone)!;
  return {
    kind: "month",
    fromUtc: from,
    toUtc: tz.addMonths(from, 1, timezone),
    label: `${MONTHS[monthNum - 1]} ${year}`,
    fileLabel: key,
  };
}
