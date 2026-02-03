/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actionResult";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getActorId(session: any) {
  return (
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined)
  );
}

function getSessionRoles(session: any): AppRole[] {
  const roles = session?.user?.roles;
  return Array.isArray(roles) && roles.length > 0 ? (roles as AppRole[]) : [];
}

async function requireAdmin() {
  const session = await auth();
  const actorId = getActorId(session);
  if (!session?.user || !actorId) throw new Error("Unauthorized");

  // Fast path: session roles
  const roles = getSessionRoles(session);
  if (roles.includes("ADMIN")) return session;

  // Source-of-truth: DB roles (roles-only)
  const me = await db.user.findUnique({
    where: { id: actorId },
    select: { roles: true },
  });

  if (!me?.roles?.includes("ADMIN")) throw new Error("Unauthorized");

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
  formData: FormData,
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
  formData: FormData,
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
  active: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    await db.vehicleUnit.update({
      where: { id },
      data: { active },
    });

    revalidatePath("/admin/vehicles");
    revalidatePath(`/admin/vehicles/${id}`);
    return { success: active ? "vehicle enabled" : "vehicle disabled" };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to update vehicle." };
  }
}

export async function updateVehicleUnitImage(
  vehicleUnitId: string,
  imageUrl: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!vehicleUnitId) {
      return { error: "Missing vehicle ID" };
    }

    // Verify vehicle exists
    const vehicle = await db.vehicleUnit.findUnique({
      where: { id: vehicleUnitId },
      select: { id: true },
    });

    if (!vehicle) {
      return { error: "Vehicle not found" };
    }

    // Update the database with the Cloudinary URL
    await db.vehicleUnit.update({
      where: { id: vehicleUnitId },
      data: { image: imageUrl },
    });

    revalidatePath(`/admin/vehicles/${vehicleUnitId}`);
    revalidatePath("/admin/vehicles");

    return { success: "Vehicle image updated" };
  } catch (e: any) {
    console.error("Failed to update vehicle image:", e);
    return { error: e?.message ?? "Failed to update image" };
  }
}

export async function deleteVehicleUnitImage(
  vehicleUnitId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!vehicleUnitId) {
      return { error: "Missing vehicle ID" };
    }

    // Verify vehicle exists
    const vehicle = await db.vehicleUnit.findUnique({
      where: { id: vehicleUnitId },
      select: { id: true, image: true },
    });

    if (!vehicle) {
      return { error: "Vehicle not found" };
    }

    // Update the database (set image to null)
    await db.vehicleUnit.update({
      where: { id: vehicleUnitId },
      data: { image: null },
    });

    revalidatePath(`/admin/vehicles/${vehicleUnitId}`);
    revalidatePath("/admin/vehicles");

    return { success: "Vehicle image removed" };
  } catch (e: any) {
    console.error("Failed to delete vehicle image:", e);
    return { error: e?.message ?? "Failed to remove image" };
  }
}
