"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateDriverPayAction(
  bookingId: string,
  driverPaymentCents: number,
  driverTipCents: number,
) {
  // Find the booking with its assignment
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { assignment: true },
  });

  if (!booking?.assignment) {
    return { error: "No driver assignment found. Assign a driver first." };
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      assignment: {
        update: {
          driverPaymentCents,
          driverTipCents,
        },
      },
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
