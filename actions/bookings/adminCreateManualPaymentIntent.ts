"use server";

import { getStripe } from "@/lib/stripe";
import { getAmountDue } from "@/lib/booking/getAmountDue";
import { getAdminUserId } from "@/lib/sessionUser";

export async function adminCreateManualPaymentIntent({
  bookingId,
}: {
  bookingId: string;
}) {
  if (!bookingId) return { error: "Missing bookingId" };

  if (!(await getAdminUserId())) return { error: "Unauthorized" };

  // One shared calculation of what is still owed: the booking's total minus
  // what has been collected, or for a multi-ride trip the trip's total minus
  // everything collected on the trip.
  const due = await getAmountDue(bookingId);

  if (!due) return { error: "Booking not found" };

  if (due.totalCents <= 0) {
    return { error: "Booking total must be > 0. Approve price first." };
  }

  const amountToCharge = due.balanceCents;
  if (amountToCharge <= 0) {
    return { error: "No balance due. The booking is fully paid." };
  }

  const isBalancePayment = due.paidCents > 0;

  const stripe = await getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: amountToCharge,
    currency: due.currency,
    metadata: {
      bookingId: due.bookingId,
      tripGroupId: due.tripGroupId ?? "",
      kind: "ADMIN_MANUAL",
      isBalancePayment: isBalancePayment ? "true" : "false",
      balanceAmount: amountToCharge.toString(),
      originalTotal: due.totalCents.toString(),
      previouslyPaid: due.paidCents.toString(),
    },
    automatic_payment_methods: { enabled: true },
  });

  if (!pi.client_secret)
    return { error: "No client secret returned by Stripe" };

  return { clientSecret: pi.client_secret, amountToCharge, isBalancePayment };
}
