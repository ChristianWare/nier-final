"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function approvePriceAction(bookingId: string) {
  await db.booking.update({
    where: { id: bookingId },
    data: { priceApproved: true },
  });
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}

export async function unapprovePriceAction(bookingId: string) {
  await db.booking.update({
    where: { id: bookingId },
    data: { priceApproved: false },
  });
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
