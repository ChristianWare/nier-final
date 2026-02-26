"use server";

import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function adminChargeCardOnFile({
  bookingId,
}: {
  bookingId: string;
}): Promise<
  { success: true; last4: string; amountCents: number } | { error: string }
> {
  if (!bookingId) return { error: "Missing bookingId" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      totalCents: true,
      currency: true,
      userId: true,
      payment: {
        select: {
          amountPaidCents: true,
          status: true,
        },
      },
    },
  });

  if (!booking) return { error: "Booking not found" };

  const totalCents = Number(booking.totalCents ?? 0);
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    return { error: "Booking total must be > 0. Approve price first." };
  }

  const amountPaidCents = Number(booking.payment?.amountPaidCents ?? 0);
  const amountToCharge = totalCents - amountPaidCents;

  if (amountToCharge <= 0) {
    return { error: "No balance due. The booking is fully paid." };
  }

  if (!booking.userId) {
    return { error: "This booking has no associated user account." };
  }

  const user = await db.user.findUnique({
    where: { id: booking.userId },
    select: { stripeCustomerId: true },
  });

  const customerId = user?.stripeCustomerId ?? null;
  if (!customerId) {
    return { error: "This customer has no card on file." };
  }

  const stripe = await getStripe();

  const pmList = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 10,
  });

  const now = new Date();
  const activePm = pmList.data.find((pm) => {
    const card = pm.card;
    if (!card) return false;
    const expDate = new Date(card.exp_year, card.exp_month - 1, 1);
    return expDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  });

  if (!activePm) {
    return { error: "No active (non-expired) card on file for this customer." };
  }

  const currency = (booking.currency ?? "USD").toLowerCase();
  const isBalancePayment = amountPaidCents > 0;

  const pi = await stripe.paymentIntents.create({
    amount: amountToCharge,
    currency,
    customer: customerId,
    payment_method: activePm.id,
    confirm: true,
    off_session: true,
    metadata: {
      bookingId: booking.id,
      kind: "ADMIN_CARD_ON_FILE",
      isBalancePayment: isBalancePayment ? "true" : "false",
      balanceAmount: amountToCharge.toString(),
      originalTotal: totalCents.toString(),
      previouslyPaid: amountPaidCents.toString(),
    },
  });

  if (pi.status !== "succeeded") {
    return {
      error: `Payment not completed. Stripe status: ${pi.status}. The card may require authentication — ask the customer to pay via the payment link instead.`,
    };
  }

  const newAmountPaid = amountPaidCents + amountToCharge;
  const isFullyPaid = newAmountPaid >= totalCents;
  const paidAt = new Date();

  await db.payment.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      status: "PAID",
      amountPaidCents: newAmountPaid,
      stripePaymentIntentId: pi.id,
      paidAt,
    },
    update: {
      status: isFullyPaid ? "PAID" : "PARTIALLY_REFUNDED",
      amountPaidCents: newAmountPaid,
      stripePaymentIntentId: pi.id,
      paidAt: isFullyPaid ? paidAt : undefined,
    },
  });

  if (isFullyPaid) {
    await db.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });

    await db.bookingStatusEvent.create({
      data: {
        bookingId: booking.id,
        status: "CONFIRMED",
        eventType: "PAYMENT_RECEIVED",
        metadata: {
          amountCents: amountToCharge,
          method: "card_on_file",
          last4: activePm.card?.last4 ?? null,
          stripePaymentIntentId: pi.id,
        },
      },
    });
  }

  return {
    success: true,
    last4: activePm.card?.last4 ?? "????",
    amountCents: amountToCharge,
  };
}

// ── Read-only: check if a user has a card on file (for UI display) ────────────

export async function adminGetCardOnFile(userId: string): Promise<{
  hasCard: boolean;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  isExpired: boolean;
} | null> {
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  const customerId = user?.stripeCustomerId ?? null;
  if (!customerId)
    return {
      hasCard: false,
      brand: null,
      last4: null,
      exp_month: null,
      exp_year: null,
      isExpired: false,
    };

  try {
    const stripe = await getStripe();
    const pmList = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 10,
    });

    const now = new Date();
    const activePm =
      pmList.data.find((pm) => {
        const card = pm.card;
        if (!card) return false;
        const expDate = new Date(card.exp_year, card.exp_month - 1, 1);
        return expDate >= new Date(now.getFullYear(), now.getMonth(), 1);
      }) ??
      pmList.data[0] ??
      null;

    if (!activePm?.card)
      return {
        hasCard: false,
        brand: null,
        last4: null,
        exp_month: null,
        exp_year: null,
        isExpired: false,
      };

    const card = activePm.card;
    const expDate = new Date(card.exp_year, card.exp_month - 1, 1);
    const isExpired = expDate < new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      hasCard: true,
      brand: card.brand,
      last4: card.last4,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      isExpired,
    };
  } catch {
    return null;
  }
}
