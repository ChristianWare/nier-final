"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function isValidYmd(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function addBlackoutDate(formData: FormData) {
  const ymd = String(formData.get("ymd") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!ymd || !isValidYmd(ymd)) {
    return { ok: false as const, error: "Invalid date" };
  }

  await db.blackoutDate.upsert({
    where: { ymd },
    create: { ymd, reason },
    update: { reason },
  });

  revalidatePath("/admin/calendar");
  revalidatePath("/book");
  revalidatePath("/booking");

  return { ok: true as const };
}
