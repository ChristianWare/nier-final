// actions/admin/drivers.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdminUserId } from "@/lib/sessionUser";
import { syncDriverPay } from "@/lib/drivers/driverPay";

function revalidateDriverPages(userId?: string) {
  revalidatePath("/admin/drivers");
  if (userId) revalidatePath(`/admin/drivers/${userId}`);
  revalidatePath("/admin/reports");
  revalidatePath("/admin/earnings");
}

/** "Fill in missing pay": default pay on completed rides with none recorded
 *  (pay already recorded is never changed), and tips brought up to date. */
export async function fillMissingDriverPay(bookingIds: string[]) {
  if (!(await getAdminUserId())) return { error: "Unauthorized" };
  const ids = (Array.isArray(bookingIds) ? bookingIds : [])
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .slice(0, 5000);
  if (ids.length === 0) return { error: "There's nothing to fill in." };
  const result = await syncDriverPay(ids);
  revalidateDriverPages();
  return { ok: true as const, ...result };
}

export type DriverProfileInput = {
  userId: string;
  /** Percentage of the ride's full price, e.g. "60" or "62.5". Empty = none. */
  payPercent: string;
  paidPerRide: boolean;
  active: boolean;
  phone: string;
  legalName: string;
  mailingAddress: string;
  /** Dates as YYYY-MM-DD, empty = none. */
  w9ReceivedAt: string;
  licenseNumber: string;
  licenseExpiresAt: string;
  permitExpiresAt: string;
  insuranceExpiresAt: string;
  backgroundCheckAt: string;
  notes: string;
};

const clean = (v: unknown, max = 500) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** YYYY-MM-DD → a date stored at noon UTC, so it reads as the same day
 *  everywhere. */
function day(v: unknown): Date | null | "invalid" {
  if (typeof v !== "string" || !v.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return "invalid";
  const d = new Date(`${v.trim()}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

export async function saveDriverProfile(input: DriverProfileInput) {
  if (!(await getAdminUserId())) return { error: "Unauthorized" };

  const user = await db.user.findUnique({
    where: { id: input?.userId ?? "" },
    select: { id: true, roles: true },
  });
  if (!user || !user.roles.includes("DRIVER")) {
    return { error: "Driver not found." };
  }

  let payPercent: number | null = null;
  if (typeof input.payPercent === "string" && input.payPercent.trim()) {
    const n = Number(input.payPercent.trim().replace(/%$/, ""));
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: "Pay rate must be a percentage between 0 and 100." };
    }
    payPercent = Math.round(n * 100) / 100;
  }

  const dates = {
    w9ReceivedAt: day(input.w9ReceivedAt),
    licenseExpiresAt: day(input.licenseExpiresAt),
    permitExpiresAt: day(input.permitExpiresAt),
    insuranceExpiresAt: day(input.insuranceExpiresAt),
    backgroundCheckAt: day(input.backgroundCheckAt),
  };
  if (Object.values(dates).includes("invalid")) {
    return { error: "Please enter dates as YYYY-MM-DD." };
  }
  const d = dates as Record<keyof typeof dates, Date | null>;

  const data = {
    payPercent,
    paidPerRide: !!input.paidPerRide,
    active: !!input.active,
    legalName: clean(input.legalName, 200),
    mailingAddress: clean(input.mailingAddress, 500),
    w9ReceivedAt: d.w9ReceivedAt,
    licenseNumber: clean(input.licenseNumber, 100),
    licenseExpiresAt: d.licenseExpiresAt,
    permitExpiresAt: d.permitExpiresAt,
    insuranceExpiresAt: d.insuranceExpiresAt,
    backgroundCheckAt: d.backgroundCheckAt,
    notes: clean(input.notes, 2000),
  };

  await db.$transaction([
    db.driverProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    }),
    db.user.update({
      where: { id: user.id },
      data: { phone: clean(input.phone, 40) },
    }),
  ]);

  revalidateDriverPages(user.id);
  return { ok: true as const };
}
