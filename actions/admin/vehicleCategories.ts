"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";

function toInt(v: FormDataEntryValue | null, fallback = 0) {
  const n = Number(v ?? fallback);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toString(v: FormDataEntryValue | null) {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || role !== "ADMIN") {
    return { error: "Unauthorized" as const };
  }
  return { session };
}

export async function createVehicleCategory(formData: FormData) {
  const gate = await requireAdmin();
  if ("error" in gate) return { error: gate.error };

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return { error: "Name is required." };

  const imageUrl = toString(formData.get("imageUrl"));
  const description = toString(formData.get("description"));

  const capacity = toInt(formData.get("capacity"), 1);
  const luggageCapacity = toInt(formData.get("luggageCapacity"), 0);
  const sortOrder = toInt(formData.get("sortOrder"), 0);

  // ✅ min hours for HOURLY services
  const minHours = toInt(formData.get("minHours"), 0);

  const active = formData.get("active") === "on";

  const baseFareCents = toInt(formData.get("baseFareCents"), 0);
  const perMileCents = toInt(formData.get("perMileCents"), 0);
  const perMinuteCents = toInt(formData.get("perMinuteCents"), 0);
  const perHourCents = toInt(formData.get("perHourCents"), 0);

  await db.vehicle.create({
    data: {
      name,
      imageUrl,
      description,
      capacity,
      luggageCapacity,
      sortOrder,
      minHours,
      active,
      baseFareCents,
      perMileCents,
      perMinuteCents,
      perHourCents,
    },
  });

  revalidatePath("/admin/vehicle-categories");
  return { success: true as const };
}

export async function updateVehicleCategory(id: string, formData: FormData) {
  const gate = await requireAdmin();
  if ("error" in gate) return { error: gate.error };

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return { error: "Name is required." };

  const imageUrl = toString(formData.get("imageUrl"));
  const description = toString(formData.get("description"));

  const capacity = toInt(formData.get("capacity"), 1);
  const luggageCapacity = toInt(formData.get("luggageCapacity"), 0);
  const sortOrder = toInt(formData.get("sortOrder"), 0);

  const minHours = toInt(formData.get("minHours"), 0);

  const active = formData.get("active") === "on";

  const baseFareCents = toInt(formData.get("baseFareCents"), 0);
  const perMileCents = toInt(formData.get("perMileCents"), 0);
  const perMinuteCents = toInt(formData.get("perMinuteCents"), 0);
  const perHourCents = toInt(formData.get("perHourCents"), 0);

  await db.vehicle.update({
    where: { id },
    data: {
      name,
      imageUrl,
      description,
      capacity,
      luggageCapacity,
      sortOrder,
      minHours,
      active,
      baseFareCents,
      perMileCents,
      perMinuteCents,
      perHourCents,
    },
  });

  revalidatePath("/admin/vehicle-categories");
  revalidatePath(`/admin/vehicle-categories/${id}`);
  return { success: true as const };
}

export async function toggleVehicleCategory(id: string, active: boolean) {
  const gate = await requireAdmin();
  if ("error" in gate) return { error: gate.error };

  await db.vehicle.update({
    where: { id },
    data: { active },
  });

  revalidatePath("/admin/vehicle-categories");
  return { success: true as const };
}
