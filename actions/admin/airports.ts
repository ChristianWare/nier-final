/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { Prisma } from "@prisma/client";

type ActionResult = { success?: string; error?: string };
type AppRole = "USER" | "ADMIN" | "DRIVER";

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

function normIata(v: string) {
  return v.trim().toUpperCase();
}

function decimalFromString(s: string) {
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  // store as Decimal safely
  return new Prisma.Decimal(String(n));
}

function getTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createAirport(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const name = getTrimmed(formData, "name");
    const iata = normIata(getTrimmed(formData, "iata"));
    const address = getTrimmed(formData, "address");

    const placeIdRaw = getTrimmed(formData, "placeId");
    const placeId = placeIdRaw ? placeIdRaw : null;

    const latStr = getTrimmed(formData, "lat");
    const lngStr = getTrimmed(formData, "lng");

    const sortOrder = intFromForm(formData.get("sortOrder"));
    const active = formData.get("active") === "on";

    if (!name) return { error: "Name is required." };
    if (!iata || iata.length !== 3)
      return { error: "IATA code must be 3 letters." };
    if (!address) return { error: "Address is required." };

    // ✅ For airports, coords are required for routing/maps
    const lat = latStr ? decimalFromString(latStr) : null;
    const lng = lngStr ? decimalFromString(lngStr) : null;

    if (!lat || !lng) {
      return {
        error:
          "Please select an address suggestion so we can capture coordinates (lat/lng).",
      };
    }

    const existing = await db.airport.findUnique({ where: { iata } });
    if (existing) return { error: "That IATA code is already in use." };

    await db.airport.create({
      data: {
        name,
        iata,
        address,
        placeId,
        lat,
        lng,
        sortOrder,
        active,
      },
    });

    revalidatePath("/admin/airports");
    return { success: "Airport added" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function updateAirport(
  airportId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const name = getTrimmed(formData, "name");
    const iata = normIata(getTrimmed(formData, "iata"));
    const address = getTrimmed(formData, "address");

    const placeIdRaw = getTrimmed(formData, "placeId");
    const placeId = placeIdRaw ? placeIdRaw : null;

    const latStr = getTrimmed(formData, "lat");
    const lngStr = getTrimmed(formData, "lng");

    const sortOrder = intFromForm(formData.get("sortOrder"));
    const active = formData.get("active") === "on";

    if (!name) return { error: "Name is required." };
    if (!iata || iata.length !== 3)
      return { error: "IATA code must be 3 letters." };
    if (!address) return { error: "Address is required." };

    const existing = await db.airport.findUnique({ where: { iata } });
    if (existing && existing.id !== airportId) {
      return { error: "That IATA code is already in use." };
    }

    // ✅ Don’t wipe coords if the edit form didn’t change them
    // Only update lat/lng if the form actually has values.
    const updateLatLng = Boolean(latStr || lngStr);

    if (updateLatLng) {
      if (!latStr || !lngStr) {
        return {
          error:
            "Please select an address suggestion so we can capture coordinates (lat/lng).",
        };
      }
    }

    const data: any = {
      name,
      iata,
      address,
      placeId,
      sortOrder,
      active,
    };

    if (updateLatLng) {
      const lat = decimalFromString(latStr);
      const lng = decimalFromString(lngStr);

      if (!lat || !lng) {
        return {
          error:
            "Invalid coordinates captured. Please re-select the address suggestion.",
        };
      }

      data.lat = lat;
      data.lng = lng;
    }

    await db.airport.update({
      where: { id: airportId },
      data,
    });

    revalidatePath("/admin/airports");
    revalidatePath(`/admin/airports/${airportId}`);
    return { success: "Airport updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function toggleAirport(airportId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const current = await db.airport.findUnique({
      where: { id: airportId },
      select: { active: true },
    });
    if (!current) return { error: "Airport not found." };

    await db.airport.update({
      where: { id: airportId },
      data: { active: !current.active },
    });

    revalidatePath("/admin/airports");
    return { success: "Airport updated" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}

export async function deleteAirport(airportId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.airport.delete({ where: { id: airportId } });
    revalidatePath("/admin/airports");
    return { success: "Airport deleted" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}
