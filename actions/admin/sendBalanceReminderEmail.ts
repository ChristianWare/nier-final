"use server";

// actions/admin/sendBalanceReminderEmail.ts

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import { sendPaymentLinkEmail } from "@/lib/email/sendPaymentLink";

const Schema = z.object({
  bookingId: z.string().min(1),
});

export async function sendBalanceReminderEmail(formData: FormData) {
  const session = await auth();
  const actorId =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (!session?.user || !actorId) {
    return { error: "Unauthorized" };
  }

  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };

  const { bookingId } = parsed.data;

  const overrideEmail =
    (formData.get("overrideEmail") as string | null)?.trim().toLowerCase() ||
    null;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      serviceType: true,
      payment: true,
    },
  });

  if (!booking) return { error: "Booking not found." };

  // Only makes sense when there's actually an outstanding balance
  const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
  const totalCents = booking.totalCents ?? 0;
  const outstandingCents = totalCents - amountPaidCents;

  if (outstandingCents <= 0 && booking.payment?.status !== "PENDING") {
    return { error: "No outstanding balance on this booking." };
  }

  const recipientEmail =
    overrideEmail ||
    (booking.user?.email ?? booking.guestEmail ?? "").trim().toLowerCase();

  const recipientName =
    (booking.user?.name ?? booking.guestName ?? "").trim() || null;

  if (!recipientEmail)
    return { error: "No email address found for this customer." };

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const checkoutUrl =
    booking.payment?.checkoutUrl ?? `${APP_URL}/pay/${bookingId}`;

  // Reuse the payment link email — it already has all the right content
  // (pickup date, addresses, amount, pay button). The subject line and
  // intro copy make it clear this is a reminder for an outstanding balance.
  try {
    await sendPaymentLinkEmail({
      to: recipientEmail,
      name: recipientName,
      pickupAtISO: booking.pickupAt.toISOString(),
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      // Show the outstanding amount, not the full total, when partially paid
      totalCents: amountPaidCents > 0 ? outstandingCents : totalCents,
      currency: booking.currency,
      payUrl: checkoutUrl,
      bookingId: booking.id,
    });
  } catch (e) {
    console.error("sendBalanceReminderEmail: email send failed", e);
    return { error: "Failed to send the reminder email. Please try again." };
  }

  // Log the event so history appears in the activity timeline + component
  await db.bookingStatusEvent.create({
    data: {
      bookingId,
      status: booking.status,
      eventType: "BALANCE_REMINDER_SENT",
      metadata: {
        recipientEmail,
        outstandingCents,
        totalCents,
        amountPaidCents,
        currency: booking.currency,
        sentManually: true,
      },
      createdById: actorId,
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true, recipientEmail };
}
