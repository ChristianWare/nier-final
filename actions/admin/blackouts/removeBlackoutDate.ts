"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function removeBlackoutDate(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false as const, error: "Missing id" };

  await db.blackoutDate.delete({ where: { id } });

  revalidatePath("/admin/calendar");
  revalidatePath("/book");
  revalidatePath("/booking");

  return { ok: true as const };
}
