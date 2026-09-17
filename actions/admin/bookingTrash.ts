"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "../../auth";

type ActionResult = { ok: boolean; count?: number; error?: string };

async function requireAdmin(): Promise<
  { ok: true; userId: string | null } | { ok: false; error: string }
> {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u: any = session?.user ?? null;
  const roles: string[] = Array.isArray(u?.roles)
    ? u.roles
    : typeof u?.role === "string"
      ? [u.role]
      : [];
  if (!roles.includes("ADMIN")) return { ok: false, error: "Unauthorized." };
  return { ok: true, userId: u?.id ?? null };
}

function cleanIds(ids: string[]): string[] {
  return [...new Set((ids ?? []).map((s) => String(s || "").trim()))].filter(
    Boolean,
  );
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
}

/** Move bookings to the trash (soft delete). Reversible for 7 days. */
export async function trashBookings(bookingIds: string[]): Promise<ActionResult> {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return gate;

    const ids = cleanIds(bookingIds);
    if (ids.length === 0) return { ok: false, error: "No bookings selected." };

    const r = await db.booking.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: gate.userId },
    });

    refresh();
    return { ok: true, count: r.count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Trash failed." };
  }
}

/** Restore bookings from the trash. */
export async function restoreBookings(bookingIds: string[]): Promise<ActionResult> {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return gate;

    const ids = cleanIds(bookingIds);
    if (ids.length === 0) return { ok: false, error: "No bookings selected." };

    const r = await db.booking.updateMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      data: { deletedAt: null, deletedById: null },
    });

    refresh();
    return { ok: true, count: r.count };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Restore failed.",
    };
  }
}

/** Permanently delete — only allowed on bookings already in the trash. */
export async function deleteBookingsForever(
  bookingIds: string[],
): Promise<ActionResult> {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return gate;

    const ids = cleanIds(bookingIds);
    if (ids.length === 0) return { ok: false, error: "No bookings selected." };

    const r = await db.booking.deleteMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
    });

    refresh();
    return { ok: true, count: r.count };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Permanent delete failed (a booking may have linked records).",
    };
  }
}