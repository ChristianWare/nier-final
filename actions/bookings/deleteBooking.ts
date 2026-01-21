/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";

export async function deleteBooking(bookingId: string): Promise<{
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

    const id = String(bookingId || "").trim();
    if (!id) return { ok: false, error: "Missing booking ID." };

    await db.booking.delete({ where: { id } });

    // Refresh listing + (now deleted) detail path
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${id}`);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Delete failed." };
  }
}
