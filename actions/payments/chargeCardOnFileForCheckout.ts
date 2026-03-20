"use server";

import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function chargeCardOnFileForCheckout({
  bookingId,
  tipCents,
}: {
  bookingId: string;
  tipCents?: number;
}): Promise<
  { success: true; last4: string; amountCents: number } | { error: string }
> {
  if (!bookingId) return { error: "Missing bookingId" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      guestStripeCustomerId: true,
      totalCents: true,
      currency: true,
      status: true,
      payment: {
        select: { amountPaidCents: true, status: true },
      },
    },
  });

  if (!booking) return { error: "Booking not found" };

  const invalidStatuses = [
    "CANCELLED",
    "NO_SHOW",
    "REFUNDED",
    "DECLINED",
    "DRAFT",
  ];
  if (invalidStatuses.includes(booking.status)) {
    return { error: "This booking cannot be paid." };
  }

  const totalCents = Number(booking.totalCents ?? 0);
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    return { error: "Invalid booking total." };
  }

  const amountPaidCents = Number(booking.payment?.amountPaidCents ?? 0);
  const tip = tipCents ?? 0;
  const amountToCharge = totalCents - amountPaidCents + tip;

  if (amountToCharge <= 0) {
    return { error: "This booking is already fully paid." };
  }

  // ── Resolve Stripe customer ID ─────────────────────────────────────────
  // Support both registered users (via User.stripeCustomerId) and
  // guests on charter bookings (via Booking.guestStripeCustomerId).
  let customerId: string | null = null;

  if (booking.userId) {
    const user = await db.user.findUnique({
      where: { id: booking.userId },
      select: { stripeCustomerId: true },
    });
    customerId = user?.stripeCustomerId ?? null;
  }

  // Fall back to guest Stripe customer saved at charter checkout
  if (!customerId) {
    customerId = booking.guestStripeCustomerId ?? null;
  }

  if (!customerId) {
    return { error: "No card on file." };
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
    return { error: "No active card on file." };
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
      tipCents: tip.toString(),
      kind: "CARD_ON_FILE_CHECKOUT",
      isBalancePayment: isBalancePayment ? "true" : "false",
      originalTotal: totalCents.toString(),
      previouslyPaid: amountPaidCents.toString(),
    },
  });

  if (pi.status !== "succeeded") {
    return {
      error: `Payment requires additional authentication. Please use the card form below instead.`,
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
      tipCents: tip > 0 ? tip : undefined,
      stripePaymentIntentId: pi.id,
      paidAt,
    },
    update: {
      status: isFullyPaid ? "PAID" : "PARTIALLY_REFUNDED",
      amountPaidCents: newAmountPaid,
      tipCents: tip > 0 ? tip : undefined,
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
          tipCents: tip,
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

// ── Read-only: get the saved card for a booking (supports guests) ─────────────

export async function getSavedCardForBooking(bookingId: string): Promise<{
  hasCard: boolean;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  isExpired: boolean;
} | null> {
  if (!bookingId) return null;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, guestStripeCustomerId: true },
  });

  if (!booking) return null;

  // Resolve customer ID — registered user first, then guest charter customer
  let customerId: string | null = null;

  if (booking.userId) {
    const user = await db.user.findUnique({
      where: { id: booking.userId },
      select: { stripeCustomerId: true },
    });
    customerId = user?.stripeCustomerId ?? null;
  }

  if (!customerId) {
    customerId = booking.guestStripeCustomerId ?? null;
  }

  if (!customerId) {
    return {
      hasCard: false,
      brand: null,
      last4: null,
      exp_month: null,
      exp_year: null,
      isExpired: false,
    };
  }

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

    if (!activePm?.card) {
      return {
        hasCard: false,
        brand: null,
        last4: null,
        exp_month: null,
        exp_year: null,
        isExpired: false,
      };
    }

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
