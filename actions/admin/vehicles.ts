/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "../../auth";

type ActionResult = { success?: string; error?: string };

function moneyToCents(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function intFromForm(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.userId;
  if (!userId) throw new Error("Unauthorized");

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!me || me.role !== "ADMIN") throw new Error("Forbidden");
  return { userId };
}

export async function createVehicle(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name is required." };

    const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
    const description =
      String(formData.get("description") ?? "").trim() || null;

    const capacity = intFromForm(formData.get("capacity"));
    const luggageCapacity = intFromForm(formData.get("luggageCapacity"));
    const minHours = intFromForm(formData.get("minHours"));
    const sortOrder = intFromForm(formData.get("sortOrder"));

    const baseFareCents = moneyToCents(formData.get("baseFare"));
    const perMileCents = moneyToCents(formData.get("perMile"));
    const perMinuteCents = moneyToCents(formData.get("perMinute"));
    const perHourCents = moneyToCents(formData.get("perHour"));

    const active = formData.get("active") === "on";

    if (capacity <= 0) return { error: "Capacity must be greater than 0." };
    if (luggageCapacity < 0)
      return { error: "Luggage capacity must be 0 or more." };
    if (minHours < 0) return { error: "Min hours must be 0 or more." };

    await db.vehicle.create({
      data: {
        name,
        imageUrl,
        description,
        capacity,
        luggageCapacity,
        minHours,
        sortOrder,
        baseFareCents,
        perMileCents,
        perMinuteCents,
        perHourCents,
        active,
      },
    });

    revalidatePath("/admin/vehicles");
    return { success: "vehicle added" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function updateVehicle(
  vehicleId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name is required." };

    const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
    const description =
      String(formData.get("description") ?? "").trim() || null;

    const capacity = intFromForm(formData.get("capacity"));
    const luggageCapacity = intFromForm(formData.get("luggageCapacity"));
    const minHours = intFromForm(formData.get("minHours"));
    const sortOrder = intFromForm(formData.get("sortOrder"));

    const baseFareCents = moneyToCents(formData.get("baseFare"));
    const perMileCents = moneyToCents(formData.get("perMile"));
    const perMinuteCents = moneyToCents(formData.get("perMinute"));
    const perHourCents = moneyToCents(formData.get("perHour"));

    const active = formData.get("active") === "on";

    if (capacity <= 0) return { error: "Capacity must be greater than 0." };
    if (luggageCapacity < 0)
      return { error: "Luggage capacity must be 0 or more." };
    if (minHours < 0) return { error: "Min hours must be 0 or more." };

    await db.vehicle.update({
      where: { id: vehicleId },
      data: {
        name,
        imageUrl,
        description,
        capacity,
        luggageCapacity,
        minHours,
        sortOrder,
        baseFareCents,
        perMileCents,
        perMinuteCents,
        perHourCents,
        active,
      },
    });

    revalidatePath("/admin/vehicles");
    revalidatePath(`/admin/vehicles/${vehicleId}`);
    return { success: "vehicle updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function toggleVehicle(vehicleId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const current = await db.vehicle.findUnique({
      where: { id: vehicleId },
      select: { active: true },
    });
    if (!current) return { error: "Vehicle not found." };

    await db.vehicle.update({
      where: { id: vehicleId },
      data: { active: !current.active },
    });

    revalidatePath("/admin/vehicles");
    return { success: "vehicle updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function deleteVehicle(vehicleId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.vehicle.delete({ where: { id: vehicleId } });
    revalidatePath("/admin/vehicles");
    return { success: "vehicle deleted" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}
