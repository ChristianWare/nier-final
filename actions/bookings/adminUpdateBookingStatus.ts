// actions/bookings/adminUpdateBookingStatus.ts
"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { handleCorporateBookingCompleted } from "@/lib/invoice/generateCorporateInvoice";

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

    const booking = await db.booking.update({
      where: { id: bookingId },
      data: { status: status as any },
      select: { id: true, corporateAccountId: true },
    });

    // Generate corporate invoice when ride completes
    if (status === "COMPLETED" && booking.corporateAccountId) {
      const result = await handleCorporateBookingCompleted(bookingId);
      if (!result.ok) {
        console.error(
          `[adminUpdateBookingStatus] Invoice generation failed for ${bookingId}:`,
          result.error,
        );
      }
    }

    return { ok: true };
  } catch (e: any) {
    return { error: e?.message ?? "Failed to update status." };
  }
}
