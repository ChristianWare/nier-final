"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actionResult";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.userId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

// "" -> null, else string
const optStringNullable = z.preprocess((v) => {
  if (v === "" || v == null) return null;
  return String(v);
}, z.string().nullable());

// categoryId: allow "" => null
const optCategoryId = z.preprocess((v) => {
  if (v === "" || v == null) return null;
  return String(v);
}, z.string().nullable());

// checkbox => boolean
const boolFromCheckbox = z.preprocess((v) => {
  if (v === "on" || v === "true" || v === true) return true;
  return false;
}, z.boolean());

const VehicleUnitSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  plate: optStringNullable.optional(),
  categoryId: optCategoryId.optional(), // nullable allowed
  active: boolFromCheckbox,
});

export async function createVehicleUnit(
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = VehicleUnitSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { error: "Invalid vehicle unit data." };

    const d = parsed.data;

    await db.vehicleUnit.create({
      data: {
        name: d.name,
        plate: d.plate ?? null,
        categoryId: d.categoryId ?? null,
        active: d.active,
      },
    });

    revalidatePath("/admin/vehicles");
    return { success: "vehicle added" };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to create vehicle." };
  }
}

export async function updateVehicleUnit(
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = VehicleUnitSchema.safeParse(formDataToObject(formData));
    if (!parsed.success || !parsed.data.id) {
      return { error: "Invalid vehicle unit data." };
    }

    const d = parsed.data;

    await db.vehicleUnit.update({
      where: { id: d.id },
      data: {
        name: d.name,
        plate: d.plate ?? null,
        categoryId: d.categoryId ?? null,
        active: d.active,
      },
    });

    revalidatePath("/admin/vehicles");
    revalidatePath(`/admin/vehicles/${d.id}`);
    return { success: "vehicle updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to update vehicle." };
  }
}

export async function toggleVehicleUnit(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await db.vehicleUnit.update({
      where: { id },
      data: { active },
    });

    revalidatePath("/admin/vehicles");
    return { success: active ? "vehicle enabled" : "vehicle disabled" };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to update vehicle." };
  }
}
