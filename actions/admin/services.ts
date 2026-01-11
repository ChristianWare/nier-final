/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { slugify } from "@/lib/slugify";
import { ServicePricingStrategy } from "@prisma/client";

type AppRole = "USER" | "ADMIN" | "DRIVER";

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

  // Fast path: session already has roles
  const roles = getSessionRoles(session);
  if (roles.includes("ADMIN")) return { userId: actorId };

  // Source-of-truth path: verify from DB (roles-only)
  const me = await db.user.findUnique({
    where: { id: actorId },
    select: { roles: true },
  });

  if (!me?.roles?.includes("ADMIN")) throw new Error("Forbidden");

  return { userId: actorId };
}

export async function createService(formData: FormData) {
  try {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name is required." };

    const rawSlug = String(formData.get("slug") ?? "").trim();
    const slug = rawSlug ? slugify(rawSlug) : slugify(name);
    if (!slug) return { error: "Could not generate a slug." };

    const pricingStrategy = String(
      formData.get("pricingStrategy") ?? "POINT_TO_POINT"
    ) as ServicePricingStrategy;

    const minFareCents = moneyToCents(formData.get("minFare"));
    const baseFeeCents = moneyToCents(formData.get("baseFee"));
    const perMileCents = moneyToCents(formData.get("perMile"));
    const perMinuteCents = moneyToCents(formData.get("perMinute"));
    const perHourCents = moneyToCents(formData.get("perHour"));

    const sortOrder = intFromForm(formData.get("sortOrder"));
    const active = formData.get("active") === "on";

    const existing = await db.serviceType.findUnique({ where: { slug } });
    if (existing) return { error: "That slug is already in use." };

    await db.serviceType.create({
      data: {
        name,
        slug,
        pricingStrategy,
        minFareCents,
        baseFeeCents,
        perMileCents,
        perMinuteCents,
        perHourCents,
        sortOrder,
        active,
      },
    });

    revalidatePath("/admin/services");
    return { success: "service added" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function updateService(serviceId: string, formData: FormData) {
  try {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name is required." };

    const rawSlug = String(formData.get("slug") ?? "").trim();
    const slug = rawSlug ? slugify(rawSlug) : slugify(name);
    if (!slug) return { error: "Could not generate a slug." };

    const pricingStrategy = String(
      formData.get("pricingStrategy") ?? "POINT_TO_POINT"
    ) as ServicePricingStrategy;

    const minFareCents = moneyToCents(formData.get("minFare"));
    const baseFeeCents = moneyToCents(formData.get("baseFee"));
    const perMileCents = moneyToCents(formData.get("perMile"));
    const perMinuteCents = moneyToCents(formData.get("perMinute"));
    const perHourCents = moneyToCents(formData.get("perHour"));

    const sortOrder = intFromForm(formData.get("sortOrder"));
    const active = formData.get("active") === "on";

    const existing = await db.serviceType.findUnique({ where: { slug } });
    if (existing && existing.id !== serviceId) {
      return { error: "That slug is already in use." };
    }

    await db.serviceType.update({
      where: { id: serviceId },
      data: {
        name,
        slug,
        pricingStrategy,
        minFareCents,
        baseFeeCents,
        perMileCents,
        perMinuteCents,
        perHourCents,
        sortOrder,
        active,
      },
    });

    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${serviceId}`);
    return { success: "service updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

// Keep toggle behavior (page.tsx calls with only the id)
export async function toggleService(serviceId: string) {
  try {
    await requireAdmin();

    const current = await db.serviceType.findUnique({
      where: { id: serviceId },
      select: { active: true },
    });
    if (!current) return { error: "Service not found." };

    await db.serviceType.update({
      where: { id: serviceId },
      data: { active: !current.active },
    });

    revalidatePath("/admin/services");
    return { success: "service updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function deleteService(serviceId: string) {
  try {
    await requireAdmin();
    await db.serviceType.delete({ where: { id: serviceId } });
    revalidatePath("/admin/services");
    return { success: "service deleted" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}
