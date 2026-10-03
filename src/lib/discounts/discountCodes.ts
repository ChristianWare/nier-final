// src/lib/discounts/discountCodes.ts — discount codes with the database.

import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import * as tz from "@/lib/timezone";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import {
  evaluateDiscount,
  normalizeCode,
  NOT_VALID,
  type DiscountResult,
  type DiscountRide,
} from "./discountRules";

/** Bookings in these states give their use back. */
export const RELEASED_STATUSES: BookingStatus[] = [
  "CANCELLED",
  "DECLINED",
  "REFUNDED",
  "DRAFT",
];

export type DiscountCustomer = {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
};

const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "").slice(-10);

/** How many bookings used the code (a trip counts once), and how many of
 *  those were this customer's (matched by account, email or phone). */
export async function countCodeUses(
  codeId: string,
  customer?: DiscountCustomer,
): Promise<{ uses: number; customerUses: number }> {
  const rows = await db.booking.findMany({
    where: { discountCodeId: codeId, status: { notIn: RELEASED_STATUSES } },
    select: {
      id: true,
      tripGroupId: true,
      userId: true,
      guestEmail: true,
      guestPhone: true,
      user: { select: { email: true, phone: true } },
    },
  });
  const all = new Set<string>();
  const mine = new Set<string>();
  const email = customer?.email?.trim().toLowerCase() || null;
  const phone = digits(customer?.phone) || null;
  for (const r of rows) {
    const key = r.tripGroupId ?? r.id;
    all.add(key);
    if (!customer) continue;
    const rEmail = (r.guestEmail ?? r.user?.email ?? "").toLowerCase() || null;
    const rPhone = digits(r.guestPhone ?? r.user?.phone) || null;
    if (
      (customer.userId && r.userId === customer.userId) ||
      (email && rEmail === email) ||
      (phone && phone.length >= 7 && rPhone === phone)
    ) {
      mine.add(key);
    }
  }
  return { uses: all.size, customerUses: mine.size };
}

/** Checks a code for the rides being booked. The booking tool uses this to
 *  preview the discount; booking requests use it again to apply it. */
export async function evaluateCodeForRides({
  code,
  rides,
  customer,
  now = new Date(),
}: {
  code: string;
  rides: DiscountRide[];
  customer?: DiscountCustomer;
  now?: Date;
}): Promise<DiscountResult> {
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, error: NOT_VALID };
  const rule = await db.discountCode.findUnique({
    where: { code: normalized },
  });
  if (!rule) return { ok: false, error: NOT_VALID };
  const [{ uses, customerUses }, { timezone }] = await Promise.all([
    countCodeUses(rule.id, customer),
    getCompanySettings(),
  ]);
  return evaluateDiscount({
    rule,
    rides,
    now,
    usesSoFar: uses,
    customerUses,
    formatDay: (d) => tz.formatDateMedium(d, timezone),
  });
}
