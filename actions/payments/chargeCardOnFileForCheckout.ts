// actions/payments/chargeCardOnFileForCheckout.ts
"use server";

import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { billScope, chargeSavedCard } from "@/lib/booking/chargeSavedCard";
import { resolveCheckoutCharge } from "@/lib/booking/checkoutCharge";
import { getSessionUserId } from "@/lib/sessionUser";

/**
 * A saved card is only ever shown to, or charged by, the customer the booking
 * belongs to, signed in to their own account. Holding the pay link is not
 * enough: links get forwarded, and an admin can send one to another address.
 */
async function getOwnerIfViewing(booking: {
  userId: string | null;
}): Promise<string | null> {
  if (!booking.userId) return null;
  const viewerId = await getSessionUserId();
  return viewerId === booking.userId ? booking.userId : null;
}

// ── "Pay with saved card" on the customer's pay page ─────────────────────────
//
// The server works out the amount itself (the same calculation the card form
// uses) and only charges if it matches what the button showed. Like the admin
// card-on-file action, it only moves the money: the Stripe webhook records it.

export async function chargeCardOnFileForCheckout({
  bookingId,
  tipCents,
  isDepositPayment = false,
  expectedAmountCents,
}: {
  bookingId: string;
  tipCents?: number;
  /** The customer chose "Pay deposit" on the pay page. */
  isDepositPayment?: boolean;
  /** The total on the "Pay $X" button: fare plus tip. If that is no longer
   *  what is owed, nothing is charged. */
  expectedAmountCents: number;
}): Promise<
  | {
      success: true;
      last4: string;
      amountCents: number;
      paymentIntentId: string;
    }
  | { error: string; amountDueCents?: number }
> {
  if (!bookingId) return { error: "Missing bookingId" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      guestStripeCustomerId: true,
      status: true,
    },
  });

  if (!booking) return { error: "Booking not found" };

  const ownerId = await getOwnerIfViewing(booking);
  if (!ownerId) {
    return {
      error:
        "Please sign in to your account to pay with a saved card, or use the card form below. Nothing was charged.",
    };
  }

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

  // What this payment costs: trip-aware, deposit-aware, and checked against
  // the total the button showed.
  const resolved = await resolveCheckoutCharge({
    bookingId,
    tipCents,
    isDepositPayment,
    expectedAmountCents,
  });
  if (!resolved.ok) {
    return { error: resolved.error, amountDueCents: resolved.amountDueCents };
  }
  const { charge } = resolved;

  // ── Resolve Stripe customer ID ─────────────────────────────────────────
  // The customer's own Stripe record first, then one saved on the booking
  // at charter checkout.
  const user = await db.user.findUnique({
    where: { id: ownerId },
    select: { stripeCustomerId: true },
  });
  const customerId =
    user?.stripeCustomerId ?? booking.guestStripeCustomerId ?? null;

  if (!customerId) {
    return { error: "No card on file." };
  }

  const result = await chargeSavedCard({
    customerId,
    amountCents: charge.amountCents,
    currency: charge.due.currency,
    chargeScope: billScope(charge.due),
    previouslyPaidCents: charge.due.paidCents,
    // Same keys the card form's PaymentIntent carries, so the webhook records
    // both kinds of payment the same way.
    metadata: {
      bookingId: booking.id,
      tripGroupId: charge.due.tripGroupId ?? "",
      userId: ownerId,
      kind: "CARD_ON_FILE_CHECKOUT",
      ...charge.metadata,
      originalTotal: charge.due.totalCents.toString(),
    },
  });

  if (!result.ok) {
    switch (result.reason) {
      case "stripe_unreachable":
        return {
          error:
            "We couldn't reach the payment processor. Nothing was charged. Please try again.",
        };
      case "no_active_card":
        return { error: "No active card on file." };
      case "already_charged":
        return {
          error:
            "This card was already charged for this booking a moment ago. Please wait a minute and refresh. You do not need to pay again.",
        };
      case "needs_authentication":
        return {
          error:
            "Your bank needs you to approve this payment. Nothing was charged. Please use the card form below instead.",
        };
      case "declined":
        return {
          error: `${result.detail ?? "Your card was declined."} Nothing was charged. Please use the card form below instead.`,
        };
      default:
        return {
          error:
            "We couldn't confirm this payment. Please wait a minute and refresh this page before trying again.",
        };
    }
  }

  return {
    success: true,
    last4: result.last4,
    amountCents: result.amountCents,
    paymentIntentId: result.paymentIntentId,
  };
}

// ── Read-only: has the webhook recorded this payment yet? ─────────────────────
// The pay page waits on this for a few seconds before showing the receipt.

export async function isCheckoutPaymentRecorded(
  paymentIntentId: string,
): Promise<boolean> {
  if (!paymentIntentId) return false;
  const row = await db.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });
  return Boolean(row);
}

// ── Read-only: the saved card for a booking, for its own signed-in customer ──

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

  // Only the booking's own customer, signed in, gets to see the saved card.
  if (!(await getOwnerIfViewing(booking))) return null;

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
