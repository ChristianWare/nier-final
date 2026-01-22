"use server";

import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

export async function adminCreateManualPaymentIntent({
  bookingId,
}: {
  bookingId: string;
}) {
  if (!bookingId) return { error: "Missing bookingId" };
  if (!process.env.STRIPE_SECRET_KEY)
    return { error: "Missing STRIPE_SECRET_KEY" };

  const b = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      totalCents: true,
      currency: true,
      payment: {
        select: {
          amountPaidCents: true,
          status: true,
        },
      },
    },
  });

  if (!b) return { error: "Booking not found" };

  const totalCents = Number(b.totalCents ?? 0);
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    return { error: "Booking total must be > 0. Approve price first." };
  }

  // Calculate amount to charge (balance if partially paid, full amount otherwise)
  const amountPaidCents = Number(b.payment?.amountPaidCents ?? 0);
  const amountToCharge = totalCents - amountPaidCents;

  if (amountToCharge <= 0) {
    return { error: "No balance due. The booking is fully paid." };
  }

  const currency = (b.currency ?? "USD").toLowerCase();
  const isBalancePayment = amountPaidCents > 0;

  const pi = await stripe.paymentIntents.create({
    amount: amountToCharge,
    currency,
    metadata: {
      bookingId: b.id,
      kind: "ADMIN_MANUAL",
      isBalancePayment: isBalancePayment ? "true" : "false",
      balanceAmount: amountToCharge.toString(),
      originalTotal: totalCents.toString(),
      previouslyPaid: amountPaidCents.toString(),
    },
    automatic_payment_methods: { enabled: true },
  });

  if (!pi.client_secret)
    return { error: "No client secret returned by Stripe" };

  return {
    clientSecret: pi.client_secret,
    amountToCharge,
    isBalancePayment,
  };
}
