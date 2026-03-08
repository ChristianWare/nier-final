/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";

export async function deleteInquiry(inquiryId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const session = await auth();

    const u: any = session?.user ?? null;
    const roles: string[] = Array.isArray(u?.roles)
      ? u.roles
      : typeof u?.role === "string"
        ? [u.role]
        : [];

    if (!roles.includes("ADMIN")) {
      return { ok: false, error: "Unauthorized." };
    }

    const id = String(inquiryId || "").trim();
    if (!id) return { ok: false, error: "Missing inquiry ID." };

    await db.corporateInquiry.delete({ where: { id } });

    revalidatePath("/admin/corporate/inquiries");
    revalidatePath(`/admin/corporate/inquiries/${id}`);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Delete failed." };
  }
}
