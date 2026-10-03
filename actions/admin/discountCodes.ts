// actions/admin/discountCodes.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAdminUserId } from "@/lib/sessionUser";
import { getCompanySettings } from "./companySettings";
import {
  parseDiscountCodeInput,
  type DiscountCodeInput,
} from "@/lib/discounts/discountForm";

type Result = { ok: true; id: string } | { error: string; field?: string };

export async function saveDiscountCode(
  input: DiscountCodeInput,
): Promise<Result> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: "Unauthorized" };
  const { timezone } = await getCompanySettings();
  const parsed = parseDiscountCodeInput(input, timezone);
  if (!parsed.ok) return { error: parsed.error, field: parsed.field };
  const data = parsed.data;

  const clash = await db.discountCode.findUnique({
    where: { code: data.code },
    select: { id: true },
  });
  if (clash && clash.id !== input.id) {
    return { error: `There's already a code ${data.code}.`, field: "code" };
  }

  const saved = input.id
    ? await db.discountCode.update({
        where: { id: input.id },
        data: { ...data, updatedById: adminId },
        select: { id: true },
      })
    : await db.discountCode.create({
        data: { ...data, createdById: adminId, updatedById: adminId },
        select: { id: true },
      });
  revalidatePath("/admin/discount-codes");
  revalidatePath(`/admin/discount-codes/${saved.id}`);
  return { ok: true, id: saved.id };
}

/** Turn a code on or off. Off takes effect immediately. */
export async function setDiscountCodeActive(
  id: string,
  active: boolean,
): Promise<Result> {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: "Unauthorized" };
  await db.discountCode.update({
    where: { id },
    data: { active: !!active, updatedById: adminId },
  });
  revalidatePath("/admin/discount-codes");
  revalidatePath(`/admin/discount-codes/${id}`);
  return { ok: true, id };
}

/** Only a code nobody has used can be deleted; a used one is turned off
 *  instead, so its history stays. */
export async function deleteDiscountCode(id: string): Promise<Result> {
  if (!(await getAdminUserId())) return { error: "Unauthorized" };
  const used = await db.booking.count({ where: { discountCodeId: id } });
  if (used > 0) {
    return { error: "This code has been used, so it can only be turned off." };
  }
  await db.discountCode.delete({ where: { id } });
  revalidatePath("/admin/discount-codes");
  return { ok: true, id };
}
