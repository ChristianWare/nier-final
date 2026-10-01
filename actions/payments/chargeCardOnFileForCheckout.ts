// actions/payments/chargeCardOnFileForCheckout.ts
"use server";

import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getAmountDue } from "@/lib/booking/getAmountDue";
import { billScope, chargeSavedCard } from "@/lib/booking/chargeSavedCard";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── "Pay with saved card" on the customer's pay page ─────────────────────────
//
// The server works out the fare itself (trip-aware, and deposit-aware) and
// only charges if the total matches what the button showed. Like the admin
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
      depositMode: true,
      depositPercent: true,
      depositCents: true,
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

  // Same calculation the pay page uses. For a multi-ride trip this is the
  // whole trip, whichever ride's link the customer opened.
  const due = await getAmountDue(bookingId);
  if (!due || due.totalCents <= 0) {
    return { error: "Invalid booking total." };
  }
  if (due.balanceCents <= 0) {
    return { error: "This booking is already fully paid." };
  }

  const tip = tipCents ?? 0;
  if (!Number.isInteger(tip) || tip < 0) {
    return { error: "Invalid tip amount." };
  }

  // The deposit, worked out the same way the pay page does.
  const depositCents =
    booking.depositMode && booking.depositPercent != null
      ? Math.round((due.totalCents * booking.depositPercent) / 100)
      : (booking.depositCents ?? null);
  const depositIsOpen =
    booking.depositMode &&
    depositCents != null &&
    depositCents > 0 &&
    due.paidCents < depositCents;

  let fareCents: number;
  if (isDepositPayment) {
    if (!depositIsOpen || depositCents == null) {
      return {
        error:
          "A deposit can't be paid on this booking right now. Nothing was charged. Please refresh the page.",
      };
    }
    fareCents = depositCents;
  } else {
    fareCents = due.balanceCents;
  }

  const amountToCharge = fareCents + tip;

  // What you see is what you pay.
  if (expectedAmountCents !== amountToCharge) {
    return {
      error: `The amount due is now ${money(amountToCharge)}. Nothing was charged. Please refresh the page and try again.`,
      amountDueCents: amountToCharge,
    };
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

  const result = await chargeSavedCard({
    customerId,
    amountCents: amountToCharge,
    currency: due.currency,
    chargeScope: billScope(due),
    previouslyPaidCents: due.paidCents,
    // Same keys the card form's PaymentIntent carries, so the webhook records
    // both kinds of payment the same way.
    metadata: {
      bookingId: booking.id,
      tripGroupId: due.tripGroupId ?? "",
      userId: booking.userId ?? "",
      kind: "CARD_ON_FILE_CHECKOUT",
      tipCents: tip.toString(),
      baseFareCents: fareCents.toString(),
      isBalancePayment:
        !isDepositPayment && due.paidCents > 0 ? "true" : "false",
      isDepositPayment: isDepositPayment ? "true" : "false",
      depositAmountCents: isDepositPayment ? fareCents.toString() : "",
      originalTotal: due.totalCents.toString(),
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
