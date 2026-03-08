/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";

export async function deleteVehicleUnit(unitId: string): Promise<{
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

    const id = String(unitId || "").trim();
    if (!id) return { ok: false, error: "Missing unit ID." };

    // Block deletion if unit has any assignments
    const assignmentCount = await db.assignment.count({
      where: { vehicleUnitId: id },
    });
    if (assignmentCount > 0) {
      return {
        ok: false,
        error: `Cannot delete a vehicle with ${assignmentCount} assignment${assignmentCount !== 1 ? "s" : ""}. Reassign or remove those assignments first.`,
      };
    }

    await db.vehicleUnit.delete({ where: { id } });

    revalidatePath("/admin/vehicles");
    revalidatePath(`/admin/vehicles/${id}`);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Delete failed." };
  }
}
