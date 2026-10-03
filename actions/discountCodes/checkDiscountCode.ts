// actions/discountCodes/checkDiscountCode.ts
"use server";

import { headers } from "next/headers";
import { getSessionUserId } from "@/lib/sessionUser";
import { evaluateCodeForRides } from "@/lib/discounts/discountCodes";

// Simple guard against guessing codes: a few tries per visitor per window.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRIES = 12;
const tries = new Map<string, number[]>();

function allowed(key: string): boolean {
  const now = Date.now();
  const recent = (tries.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  tries.set(key, recent);
  if (tries.size > 5000) tries.clear();
  return recent.length <= MAX_TRIES;
}

export type CheckDiscountInput = {
  code: string;
  /** Each ride: pickup time (ISO), its estimate, and the fees inside it. */
  rides: { pickupAt: string; fareCents: number; feesCents: number }[];
  email?: string | null;
  phone?: string | null;
};

export type CheckDiscountResult =
  | {
      ok: true;
      code: string;
      name: string;
      summary: string;
      totalCents: number;
      perRideCents: number[];
    }
  | { ok: false; error: string };

/** Booking tool preview. The real discount is worked out again on the
 *  server when the request is submitted. */
export async function checkDiscountCode(
  input: CheckDiscountInput,
): Promise<CheckDiscountResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allowed(ip)) {
    return {
      ok: false,
      error: "Too many tries. Please wait a few minutes and try again.",
    };
  }

  const rides = (Array.isArray(input?.rides) ? input.rides : [])
    .slice(0, 20)
    .map((r) => ({
      pickupAt: new Date(r.pickupAt),
      rideCents: Math.max(
        0,
        Math.round(Number(r.fareCents) - Number(r.feesCents || 0)),
      ),
    }))
    .filter(
      (r) =>
        !Number.isNaN(r.pickupAt.getTime()) && Number.isFinite(r.rideCents),
    );
  if (rides.length === 0) {
    return {
      ok: false,
      error: "Choose your ride details first, then apply the code.",
    };
  }

  const userId = await getSessionUserId();
  const res = await evaluateCodeForRides({
    code: String(input?.code ?? "").slice(0, 40),
    rides,
    customer: {
      userId,
      email: input.email ?? null,
      phone: input.phone ?? null,
    },
  });
  if (!res.ok) return res;
  return {
    ok: true,
    code: res.code,
    name: res.name,
    summary: res.summary,
    totalCents: res.totalCents,
    perRideCents: res.perRideCents,
  };
}
