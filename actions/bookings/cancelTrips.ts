"use server";

import { auth } from "../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";

const CANCELLABLE_STATUSES: BookingStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
];

export async function cancelTrip(formData: FormData) {
  const session = await auth();
  if (!session) return;

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  const email = session.user?.email ?? null;
  const sessionUserId = (session.user as { id?: string }).id ?? null;

  let userId = sessionUserId;

  if (!userId && email) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) return;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true, status: true },
  });

  if (!booking) return;
  if (booking.userId !== userId) return;
  if (!CANCELLABLE_STATUSES.includes(booking.status)) return;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "CANCELLED",
        createdById: userId,
      },
    }),
  ]);

  revalidatePath("/dashboard/trips");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/trips/${bookingId}`);
}
