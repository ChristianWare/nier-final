// Plain calendar values (no time zones): dates are "YYYY-MM-DD", months
// "YYYY-MM", times "HH:MM" (24-hour), date-times "YYYY-MM-DDTHH:MM" — the same
// strings the browser's native inputs used, so forms keep working unchanged.

import type { ChangeEvent } from "react";

export const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" → a local Date (midnight), or undefined if not a real date. */
export function parseYmd(v?: string | null): Date | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
    ? dt
    : undefined;
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatYmd(v: string): string {
  const d = parseYmd(v);
  return d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

export function formatYm(v: string): string {
  if (!/^\d{4}-\d{2}$/.test(v)) return "";
  const [y, m] = v.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Typed dates: 9/25/2026, 09-25-26, 2026-09-25. Returns "YYYY-MM-DD". */
export function parseTypedDate(text: string): string | null {
  const t = text.trim();
  let y: number, m: number, d: number;
  let match = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (!match) return null;
    [m, d, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (y < 100) y += 2000;
  }
  const ymd = `${y}-${pad(m)}-${pad(d)}`;
  return parseYmd(ymd) ? ymd : null;
}

/** "HH:MM" → { hour12, minute, period } for the time selects. */
export function splitTime(v?: string | null) {
  if (!v || !/^\d{2}:\d{2}/.test(v))
    return { hour: "", minute: "", period: "" };
  const [h, min] = v.split(":").map(Number);
  return {
    hour: String(h % 12 === 0 ? 12 : h % 12),
    minute: pad(min),
    period: h >= 12 ? "PM" : "AM",
  };
}

export function joinTime(hour: string, minute: string, period: string): string {
  if (!hour) return "";
  let h = Number(hour) % 12;
  if ((period || "AM") === "PM") h += 12;
  return `${pad(h)}:${minute || "00"}`;
}

export function formatTime(v: string): string {
  const { hour, minute, period } = splitTime(v);
  return hour ? `${hour}:${minute} ${period}` : "";
}

/**
 * Something shaped like an input change event, so existing handlers such as
 * `(e) => setFrom(e.target.value)` or a shared `handleChange` keep working.
 */
export function changeEvent(
  name: string | undefined,
  value: string,
): ChangeEvent<HTMLInputElement> {
  const target = { name: name ?? "", value, type: "text" };
  return {
    target,
    currentTarget: target,
    preventDefault() {},
    stopPropagation() {},
  } as unknown as ChangeEvent<HTMLInputElement>;
}
