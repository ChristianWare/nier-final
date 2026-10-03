// src/lib/discounts/discountRules.ts
//
// The rules for a discount code, with no database access (easy to test).
// A code comes off the ride price only: never fees, taxes or tips. A
// percentage comes off each ride; a dollar amount comes off once per booking
// (a trip counts as one booking), split across its rides by price.

export type DiscountRule = {
  id: string;
  code: string;
  name: string;
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
};

/** One ride being booked: when it is, and its price without fees. */
export type DiscountRide = { pickupAt: Date; rideCents: number };

export type DiscountResult =
  | {
      ok: true;
      codeId: string;
      code: string;
      name: string;
      /** e.g. "15% off" */
      summary: string;
      /** The discount on each ride, in the order given. */
      perRideCents: number[];
      totalCents: number;
    }
  | { ok: false; error: string };

/** Same message for a wrong code, one that's turned off, or one that hasn't
 *  started: nobody can probe for which codes exist. */
export const NOT_VALID = "That code isn't valid.";

export function normalizeCode(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

const dollars = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

export function describeDiscount(
  r: Pick<
    DiscountRule,
    "kind" | "percentOff" | "amountOffCents" | "maxDiscountCents"
  >,
): string {
  if (r.kind === "PERCENT") {
    const pct = `${r.percentOff ?? 0}% off`;
    return r.maxDiscountCents
      ? `${pct} (up to ${dollars(r.maxDiscountCents)})`
      : pct;
  }
  return `${dollars(r.amountOffCents ?? 0)} off`;
}

/** Split `total` across `weights`; the parts always add up to the total. */
export function splitCents(total: number, weights: number[]): number[] {
  const w = weights.map((x) => Math.max(0, x || 0));
  const sum = w.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return w.map(() => 0);
  const raw = w.map((x) => (total * x) / sum);
  const parts = raw.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - parts[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const o of order) {
    if (left <= 0) break;
    parts[o.i] += 1;
    left -= 1;
  }
  return parts;
}

export function evaluateDiscount({
  rule,
  rides,
  now,
  usesSoFar,
  customerUses,
  formatDay,
}: {
  rule: DiscountRule | null;
  rides: DiscountRide[];
  now: Date;
  /** Bookings that already used the code (a trip counts once). */
  usesSoFar: number;
  /** Of those, this customer's. */
  customerUses: number;
  /** A date in words, in the company's time zone (e.g. "Oct 7, 2026"). */
  formatDay: (d: Date) => string;
}): DiscountResult {
  if (!rule || !rule.active) return { ok: false, error: NOT_VALID };
  if (rule.bookFrom && now < rule.bookFrom)
    return { ok: false, error: NOT_VALID };
  if (rule.bookUntil && now >= rule.bookUntil) {
    return { ok: false, error: "This code has expired." };
  }
  if (rule.maxUses != null && usesSoFar >= rule.maxUses) {
    return { ok: false, error: "This code has been fully used." };
  }
  if (
    rule.maxUsesPerCustomer != null &&
    customerUses >= rule.maxUsesPerCustomer
  ) {
    return {
      ok: false,
      error:
        rule.maxUsesPerCustomer === 1
          ? "You've already used this code."
          : `You've already used this code ${rule.maxUsesPerCustomer} times, the most allowed.`,
    };
  }

  const covered = (d: Date) =>
    (!rule.rideFrom || d >= rule.rideFrom) &&
    (!rule.rideUntil || d < rule.rideUntil);
  const eligible = rides.map((r) => covered(r.pickupAt) && r.rideCents > 0);
  if (!eligible.some(Boolean)) {
    const from = rule.rideFrom ? formatDay(rule.rideFrom) : null;
    const to = rule.rideUntil
      ? formatDay(new Date(rule.rideUntil.getTime() - 1))
      : null;
    return {
      ok: false,
      error:
        from && to
          ? from === to
            ? `This code is for rides on ${from}.`
            : `This code is for rides from ${from} to ${to}.`
          : from
            ? `This code is for rides on or after ${from}.`
            : to
              ? `This code is for rides through ${to}.`
              : "This code doesn't apply to this ride.",
    };
  }

  const prices = rides.map((r, i) =>
    eligible[i] ? Math.max(0, Math.round(r.rideCents)) : 0,
  );
  const eligibleTotal = prices.reduce((a, b) => a + b, 0);
  if (rule.minFareCents != null && eligibleTotal < rule.minFareCents) {
    return {
      ok: false,
      error: `This code needs a ride price of at least ${dollars(rule.minFareCents)}.`,
    };
  }

  let perRide: number[];
  if (rule.kind === "PERCENT") {
    const pct = Math.min(100, Math.max(0, rule.percentOff ?? 0));
    perRide = prices.map((c) => Math.round((c * pct) / 100));
    const sum = perRide.reduce((a, b) => a + b, 0);
    if (rule.maxDiscountCents != null && sum > rule.maxDiscountCents) {
      perRide = splitCents(rule.maxDiscountCents, perRide);
    }
  } else {
    perRide = splitCents(
      Math.min(rule.amountOffCents ?? 0, eligibleTotal),
      prices,
    );
  }
  // Never more than the ride price.
  perRide = perRide.map((d, i) => Math.min(d, prices[i]));
  const totalCents = perRide.reduce((a, b) => a + b, 0);
  if (totalCents <= 0)
    return { ok: false, error: "This code doesn't apply to this ride." };

  return {
    ok: true,
    codeId: rule.id,
    code: rule.code,
    name: rule.name,
    summary: describeDiscount(rule),
    perRideCents: perRide,
    totalCents,
  };
}

export type CodeStatus = "active" | "scheduled" | "expired" | "used_up" | "off";

export function codeStatus(
  rule: Pick<DiscountRule, "active" | "bookFrom" | "bookUntil" | "maxUses">,
  uses: number,
  now: Date,
): CodeStatus {
  if (!rule.active) return "off";
  if (rule.bookUntil && now >= rule.bookUntil) return "expired";
  if (rule.maxUses != null && uses >= rule.maxUses) return "used_up";
  if (rule.bookFrom && now < rule.bookFrom) return "scheduled";
  return "active";
}
