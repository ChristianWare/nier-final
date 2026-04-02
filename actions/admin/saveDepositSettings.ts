"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const VALID_PERCENTS = new Set([10, 20, 30, 50, 75, 100]);

export async function saveDepositSettings(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const bookingId = formData.get("bookingId") as string;
  if (!bookingId) return { error: "Missing booking ID" };

  const depositMode = formData.get("depositMode") === "true";

  if (!depositMode) {
    await db.booking.update({
      where: { id: bookingId },
      data: {
        depositMode: false,
        depositPercent: null,
        depositCents: null,
        balanceCents: null,
        depositDueDate: null,
        balanceDueDate: null,
      },
    });
    revalidatePath(`/admin/bookings/${bookingId}`);
    return { success: true };
  }

  const raw = formData.get("depositPercent");
  const depositPercent = raw != null ? parseInt(raw as string, 10) : NaN;
  if (isNaN(depositPercent) || !VALID_PERCENTS.has(depositPercent)) {
    return { error: "Invalid deposit percentage" };
  }

  const depositDueDateRaw = (formData.get("depositDueDate") as string) || null;
  const balanceDueDateRaw =
    depositPercent < 100
      ? (formData.get("balanceDueDate") as string) || null
      : null;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { totalCents: true, status: true },
  });
  if (!booking) return { error: "Booking not found" };

  const depositCents = Math.round((booking.totalCents * depositPercent) / 100);
  const balanceCents =
    depositPercent < 100 ? booking.totalCents - depositCents : 0;

  await db.booking.update({
    where: { id: bookingId },
    data: {
      depositMode: true,
      depositPercent,
      depositCents,
      balanceCents,
      depositDueDate: depositDueDateRaw ? new Date(depositDueDateRaw) : null,
      balanceDueDate: balanceDueDateRaw ? new Date(balanceDueDateRaw) : null,
    },
  });

  await db.bookingStatusEvent.create({
    data: {
      bookingId,
      status: booking.status,
      eventType: "DEPOSIT_CONFIGURED",
      metadata: {
        depositPercent,
        depositCents,
        balanceCents,
        depositDueDate: depositDueDateRaw,
        balanceDueDate: balanceDueDateRaw,
      },
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
