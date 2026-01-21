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
    select: { id: true, totalCents: true, currency: true },
  });

  if (!b) return { error: "Booking not found" };

  const amount = Number(b.totalCents ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Booking total must be > 0. Approve price first." };
  }

  const currency = (b.currency ?? "USD").toLowerCase();

  const pi = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: {
      bookingId: b.id,
      kind: "ADMIN_MANUAL",
    },
    automatic_payment_methods: { enabled: true },
  });

  if (!pi.client_secret)
    return { error: "No client secret returned by Stripe" };

  return { clientSecret: pi.client_secret };
}
