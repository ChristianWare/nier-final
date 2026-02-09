"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function approveRouteAction(bookingId: string) {
  await db.booking.update({
    where: { id: bookingId },
    data: { routeApproved: true },
  });
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

export async function unapproveRouteAction(bookingId: string) {
  await db.booking.update({
    where: { id: bookingId },
    data: { routeApproved: false },
  });
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
