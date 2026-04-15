"use server";

import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function adminCreateManualPaymentIntent({
  bookingId,
}: {
  bookingId: string;
}) {
  if (!bookingId) return { error: "Missing bookingId" };

  const b = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      totalCents: true,
      currency: true,
      tripGroupId: true, // ← NEW
      payment: { select: { amountPaidCents: true, status: true } },
    },
  });

  if (!b) return { error: "Booking not found" };

  // ── For group bookings, charge the group total minus what's already paid ──
  let effectiveTotalCents = Number(b.totalCents ?? 0);
  let groupAmountPaidCents = 0;

  if (b.tripGroupId) {
    const siblings = await db.booking.findMany({
      where: { tripGroupId: b.tripGroupId },
      select: {
        totalCents: true,
        payment: { select: { amountPaidCents: true } },
      },
    });
    effectiveTotalCents = siblings.reduce((sum, s) => sum + s.totalCents, 0);
    groupAmountPaidCents = siblings.reduce(
      (sum, s) => sum + (s.payment?.amountPaidCents ?? 0),
      0,
    );
  }

  if (!Number.isFinite(effectiveTotalCents) || effectiveTotalCents <= 0) {
    return { error: "Booking total must be > 0. Approve price first." };
  }

  const amountToCharge = effectiveTotalCents - groupAmountPaidCents;
  if (amountToCharge <= 0) {
    return { error: "No balance due. The booking is fully paid." };
  }

  const currency = (b.currency ?? "USD").toLowerCase();
  const isBalancePayment = groupAmountPaidCents > 0;

  const stripe = await getStripe();
  const pi = await stripe.paymentIntents.create({
    amount: amountToCharge,
    currency,
    metadata: {
      bookingId: b.id,
      tripGroupId: b.tripGroupId ?? "", // ← NEW
      kind: "ADMIN_MANUAL",
      isBalancePayment: isBalancePayment ? "true" : "false",
      balanceAmount: amountToCharge.toString(),
      originalTotal: effectiveTotalCents.toString(),
      previouslyPaid: groupAmountPaidCents.toString(),
    },
    automatic_payment_methods: { enabled: true },
  });

  if (!pi.client_secret)
    return { error: "No client secret returned by Stripe" };

  return { clientSecret: pi.client_secret, amountToCharge, isBalancePayment };
}
