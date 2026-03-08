/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";

export async function deleteVehicleCategory(categoryId: string): Promise<{
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

    const id = String(categoryId || "").trim();
    if (!id) return { ok: false, error: "Missing category ID." };

    // Block deletion if category has any bookings
    const bookingCount = await db.booking.count({ where: { vehicleId: id } });
    if (bookingCount > 0) {
      return {
        ok: false,
        error: `Cannot delete a category with ${bookingCount} booking${bookingCount !== 1 ? "s" : ""}. Reassign or delete those bookings first.`,
      };
    }

    await db.vehicle.delete({ where: { id } });

    revalidatePath("/admin/vehicle-categories");
    revalidatePath(`/admin/vehicle-categories/${id}`);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Delete failed." };
  }
}
