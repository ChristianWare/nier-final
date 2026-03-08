/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";

export async function bulkDeleteInquiries(inquiryIds: string[]): Promise<{
  ok: boolean;
  deletedCount?: number;
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

    const ids = inquiryIds.map((id) => String(id || "").trim()).filter(Boolean);

    if (ids.length === 0)
      return { ok: false, error: "No inquiry IDs provided." };

    const result = await db.corporateInquiry.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/admin/corporate/inquiries");

    return { ok: true, deletedCount: result.count };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Bulk delete failed." };
  }
}
