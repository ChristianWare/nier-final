// actions/bookings/adminUpdateBookingStatus.ts
"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";

export async function adminUpdateBookingStatus({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  try {
    if (!bookingId) return { error: "Missing bookingId." };
    if (!status) return { error: "Missing status." };

    await db.booking.update({
      where: { id: bookingId },
      data: { status: status as any },
    });

    return { ok: true };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to update status." };
  }
}
