/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { slugify } from "@/lib/slugify";
import { ServicePricingStrategy, AirportLeg } from "@prisma/client";

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

  const roles = getSessionRoles(session);
  if (roles.includes("ADMIN")) return { userId: actorId };

  const me = await db.user.findUnique({
    where: { id: actorId },
    select: { roles: true },
  });

  if (!me?.roles?.includes("ADMIN")) throw new Error("Forbidden");

  return { userId: actorId };
}

function parseAirportLeg(v: FormDataEntryValue | null): AirportLeg {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (s === "PICKUP") return AirportLeg.PICKUP;
  if (s === "DROPOFF") return AirportLeg.DROPOFF;
  return AirportLeg.NONE;
}

function airportIdsFromForm(fd: FormData) {
  return fd
    .getAll("airportIds")
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}

// Parse fees from form data
// Format: fees[0].label, fees[0].amount, fees[1].label, fees[1].amount, etc.
// Parse fees from form data
// Format: fees[0].label, fees[0].amount, fees[1].label, fees[1].amount, etc.
function parseFeesFromForm(
  fd: FormData,
): Array<{ label: string; amountCents: number }> {
  const fees: Array<{ label: string; amountCents: number }> = [];

  // Get all fee entries
  const feeLabels = fd.getAll("feeLabel");
  const feeAmounts = fd.getAll("feeAmount");

  for (let i = 0; i < feeLabels.length; i++) {
    // ✅ FIX: Assign to variable first for proper type narrowing
    const labelVal = feeLabels[i];
    const amountVal = feeAmounts[i];
    
    const label = typeof labelVal === "string" ? labelVal.trim() : "";
    const amountStr = typeof amountVal === "string" ? amountVal.trim() : "0";
    const amountCents = Math.round(Number(amountStr) * 100);

    // Only add if label is not empty and amount is valid
    if (label && Number.isFinite(amountCents) && amountCents > 0) {
      fees.push({ label, amountCents });
    }
  }

  return fees;
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
      formData.get("pricingStrategy") ?? "POINT_TO_POINT",
    ) as ServicePricingStrategy;

    const minFareCents = moneyToCents(formData.get("minFare"));
    const baseFeeCents = moneyToCents(formData.get("baseFee"));
    const perMileCents = moneyToCents(formData.get("perMile"));
    const perMinuteCents = moneyToCents(formData.get("perMinute"));
    const perHourCents = moneyToCents(formData.get("perHour"));

    // ✅ NEW: minHours for HOURLY services
    const minHours =
      pricingStrategy === "HOURLY" ? intFromForm(formData.get("minHours")) : 0;

    const sortOrder = intFromForm(formData.get("sortOrder"));
    const active = formData.get("active") === "on";

    const airportLeg = parseAirportLeg(formData.get("airportLeg"));
    const airportIds = airportIdsFromForm(formData);

    // ✅ NEW: Parse fees
    const fees = parseFeesFromForm(formData);

    if (airportLeg !== AirportLeg.NONE && airportIds.length === 0) {
      return { error: "Select at least one airport for an airport service." };
    }

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
        minHours,
        sortOrder,
        active,

        airportLeg,
        airports:
          airportLeg === AirportLeg.NONE
            ? undefined
            : { connect: airportIds.map((id) => ({ id })) },

        // ✅ NEW: Create fees
        fees:
          fees.length > 0
            ? {
                create: fees.map((fee, index) => ({
                  label: fee.label,
                  amountCents: fee.amountCents,
                  sortOrder: index,
                  active: true,
                })),
              }
            : undefined,
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
      formData.get("pricingStrategy") ?? "POINT_TO_POINT",
    ) as ServicePricingStrategy;

    const minFareCents = moneyToCents(formData.get("minFare"));
    const baseFeeCents = moneyToCents(formData.get("baseFee"));
    const perMileCents = moneyToCents(formData.get("perMile"));
    const perMinuteCents = moneyToCents(formData.get("perMinute"));
    const perHourCents = moneyToCents(formData.get("perHour"));

    // ✅ NEW: minHours for HOURLY services
    const minHours =
      pricingStrategy === "HOURLY" ? intFromForm(formData.get("minHours")) : 0;

    const sortOrder = intFromForm(formData.get("sortOrder"));
    const active = formData.get("active") === "on";

    const airportLeg = parseAirportLeg(formData.get("airportLeg"));
    const airportIds = airportIdsFromForm(formData);

    // ✅ NEW: Parse fees
    const fees = parseFeesFromForm(formData);

    if (airportLeg !== AirportLeg.NONE && airportIds.length === 0) {
      return { error: "Select at least one airport for an airport service." };
    }

    const existing = await db.serviceType.findUnique({ where: { slug } });
    if (existing && existing.id !== serviceId) {
      return { error: "That slug is already in use." };
    }

    // ✅ NEW: Delete existing fees and recreate them
    // This is simpler than tracking individual fee changes
    await db.$transaction([
      // Delete all existing fees for this service
      db.serviceFee.deleteMany({
        where: { serviceTypeId: serviceId },
      }),
      // Update the service
      db.serviceType.update({
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
          minHours,
          sortOrder,
          active,

          airportLeg,
          airports:
            airportLeg === AirportLeg.NONE
              ? { set: [] }
              : { set: airportIds.map((id) => ({ id })) },
        },
      }),
      // Create new fees
      ...(fees.length > 0
        ? [
            db.serviceFee.createMany({
              data: fees.map((fee, index) => ({
                serviceTypeId: serviceId,
                label: fee.label,
                amountCents: fee.amountCents,
                sortOrder: index,
                active: true,
              })),
            }),
          ]
        : []),
    ]);

    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${serviceId}`);
    return { success: "service updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

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
