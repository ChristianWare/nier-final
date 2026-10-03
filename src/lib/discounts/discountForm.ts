// src/lib/discounts/discountForm.ts — checks what the admin typed into the
// discount code form and turns it into what's saved.

import * as tz from "@/lib/timezone";
import { normalizeCode } from "./discountRules";

export type DiscountCodeInput = {
  id?: string;
  code: string;
  name: string;
  partner: string;
  kind: "PERCENT" | "AMOUNT";
  /** Percent (e.g. "15") or dollars (e.g. "20"), depending on kind. */
  value: string;
  /** Dollars; percent codes only. */
  maxDiscount: string;
  minFare: string;
  /** Dates as YYYY-MM-DD; the "until" dates include that whole day. */
  bookFrom: string;
  bookUntil: string;
  rideFrom: string;
  rideUntil: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  active: boolean;
  notes: string;
};

export type DiscountCodeData = {
  code: string;
  name: string;
  partner: string | null;
  kind: "PERCENT" | "AMOUNT";
  percentOff: number | null;
  amountOffCents: number | null;
  maxDiscountCents: number | null;
  minFareCents: number | null;
  bookFrom: Date | null;
  bookUntil: Date | null;
  rideFrom: Date | null;
  rideUntil: Date | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  active: boolean;
  notes: string | null;
};

type Field = keyof DiscountCodeInput;
export type ParseResult =
  | { ok: true; data: DiscountCodeData }
  | { ok: false; error: string; field: Field };

const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

function nextDay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export function parseDiscountCodeInput(
  input: DiscountCodeInput,
  timezone: string,
): ParseResult {
  const fail = (field: Field, error: string): ParseResult => ({
    ok: false,
    error,
    field,
  });

  const code = normalizeCode(input.code ?? "");
  if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(code)) {
    return fail(
      "code",
      "Use 3–30 letters, numbers, dashes or underscores, with no spaces.",
    );
  }
  const name = text(input.name, 100);
  if (!name)
    return fail("name", "Give the code a name, e.g. the event it's for.");

  const kind = input.kind === "AMOUNT" ? "AMOUNT" : "PERCENT";
  const value = Number(String(input.value ?? "").replace(/[$%,\s]/g, ""));
  let percentOff: number | null = null;
  let amountOffCents: number | null = null;
  if (kind === "PERCENT") {
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      return fail("value", "Enter a percentage between 1 and 100.");
    }
    percentOff = Math.round(value * 100) / 100;
  } else {
    if (!Number.isFinite(value) || value <= 0 || value > 10000) {
      return fail("value", "Enter a dollar amount, e.g. 20.");
    }
    amountOffCents = Math.round(value * 100);
  }

  const money = (raw: string, field: Field): number | null | ParseResult => {
    const s = String(raw ?? "").replace(/[$,\s]/g, "");
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0 || n > 100000)
      return fail(field, "Enter a dollar amount, e.g. 50.");
    return Math.round(n * 100);
  };
  const maxDiscountCents =
    kind === "PERCENT" ? money(input.maxDiscount, "maxDiscount") : null;
  if (maxDiscountCents && typeof maxDiscountCents === "object")
    return maxDiscountCents;
  const minFareCents = money(input.minFare, "minFare");
  if (minFareCents && typeof minFareCents === "object") return minFareCents;

  const day = (
    raw: string,
    field: Field,
    end: boolean,
  ): Date | null | ParseResult => {
    const s = String(raw ?? "").trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fail(field, "Pick a date.");
    return new Date(tz.localToUtcIso(end ? nextDay(s) : s, "00:00", timezone));
  };
  const dates = {
    bookFrom: day(input.bookFrom, "bookFrom", false),
    bookUntil: day(input.bookUntil, "bookUntil", true),
    rideFrom: day(input.rideFrom, "rideFrom", false),
    rideUntil: day(input.rideUntil, "rideUntil", true),
  };
  for (const v of Object.values(dates)) if (v && !(v instanceof Date)) return v;
  const d = dates as Record<keyof typeof dates, Date | null>;
  if (d.bookFrom && d.bookUntil && d.bookUntil <= d.bookFrom) {
    return fail("bookUntil", "The last day to book can't be before the first.");
  }
  if (d.rideFrom && d.rideUntil && d.rideUntil <= d.rideFrom) {
    return fail("rideUntil", "The last ride date can't be before the first.");
  }

  const count = (raw: string, field: Field): number | null | ParseResult => {
    const s = String(raw ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1 || n > 100000)
      return fail(field, "Enter a whole number, 1 or more.");
    return n;
  };
  const maxUses = count(input.maxUses, "maxUses");
  if (maxUses && typeof maxUses === "object") return maxUses;
  const maxUsesPerCustomer = count(
    input.maxUsesPerCustomer,
    "maxUsesPerCustomer",
  );
  if (maxUsesPerCustomer && typeof maxUsesPerCustomer === "object")
    return maxUsesPerCustomer;

  return {
    ok: true,
    data: {
      code,
      name,
      partner: text(input.partner, 100),
      kind,
      percentOff,
      amountOffCents,
      maxDiscountCents: (maxDiscountCents as number | null) || null,
      minFareCents: (minFareCents as number | null) ?? null,
      ...d,
      maxUses: maxUses as number | null,
      maxUsesPerCustomer: maxUsesPerCustomer as number | null,
      active: !!input.active,
      notes: text(input.notes, 2000),
    },
  };
}

/** Saved values back into the form (dates in the company's time zone). */
export function toDiscountCodeInput(
  c: DiscountCodeData & { id: string },
  timezone: string,
): DiscountCodeInput {
  const from = (dt: Date | null) => (dt ? tz.formatIsoDate(dt, timezone) : "");
  const until = (dt: Date | null) =>
    dt ? tz.formatIsoDate(new Date(dt.getTime() - 1), timezone) : "";
  const dollars = (cents: number | null) =>
    cents == null ? "" : String(Math.round(cents) / 100);
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    partner: c.partner ?? "",
    kind: c.kind,
    value:
      c.kind === "PERCENT"
        ? String(c.percentOff ?? "")
        : dollars(c.amountOffCents),
    maxDiscount: dollars(c.maxDiscountCents),
    minFare: dollars(c.minFareCents),
    bookFrom: from(c.bookFrom),
    bookUntil: until(c.bookUntil),
    rideFrom: from(c.rideFrom),
    rideUntil: until(c.rideUntil),
    maxUses: c.maxUses == null ? "" : String(c.maxUses),
    maxUsesPerCustomer:
      c.maxUsesPerCustomer == null ? "" : String(c.maxUsesPerCustomer),
    active: c.active,
    notes: c.notes ?? "",
  };
}
