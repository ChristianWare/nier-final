/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "../../auth";

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

  const roles = getSessionRoles(session);
  if (roles.includes("ADMIN")) return { userId: actorId };

  const me = await db.user.findUnique({
    where: { id: actorId },
    select: { roles: true },
  });

  if (!me?.roles?.includes("ADMIN")) throw new Error("Forbidden");
  return { userId: actorId };
}

function intFromForm(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

function toUpperIata(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.toUpperCase();
}

export async function createAirport(formData: FormData) {
  try {
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const iata = toUpperIata(formData.get("iata"));
    const address = String(formData.get("address") ?? "").trim();
    const placeId = String(formData.get("placeId") ?? "").trim() || null;

    if (!name) return { error: "Name is required." };
    if (!iata || iata.length < 3) return { error: "IATA code is required." };
    if (!address) return { error: "Address is required." };

    const sortOrder = intFromForm(formData.get("sortOrder"));
    const active = formData.get("active") === "on";

    const existing = await db.airport.findUnique({ where: { iata } });
    if (existing) return { error: "That IATA code is already in use." };

    await db.airport.create({
      data: { name, iata, address, placeId, sortOrder, active },
    });

    revalidatePath("/admin/airports");
    return { success: "Airport added" };
  } catch (e: any) {
    return { error: e?.message ?? "Something went wrong." };
  }
}
