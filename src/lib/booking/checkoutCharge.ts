// src/lib/booking/checkoutCharge.ts
import { db } from "@/lib/db";
import { getAmountDue, type AmountDue } from "@/lib/booking/getAmountDue";

/**
 * What a customer payment costs, worked out on the server.
 *
 * Used by the card form (/api/checkout/create-payment-intent) and by
 * "Pay with saved card", so both charge the same amount for the same choice.
 *
 * The browser only says WHAT it is paying for (the deposit, the balance, or
 * just this one ride) and how much tip to add. It never decides the amount.
 * The total it showed the customer is passed in as expectedAmountCents and is
 * only compared against the figure worked out here: if they differ, nothing
 * goes ahead.
 */
export type CheckoutCharge = {
  due: AmountDue;
  /** Fare this payment covers (tip not included). */
  fareCents: number;
  tipCents: number;
  /** What to charge: fare + tip. */
  amountCents: number;
  isDepositPayment: boolean;
  /** Read by the Stripe webhook when it records the payment. */
  metadata: {
    tipCents: string;
    baseFareCents: string;
    isBalancePayment: "true" | "false";
    isDepositPayment: "true" | "false";
    depositAmountCents: string;
  };
};

export type CheckoutChargeResult =
  | { ok: true; charge: CheckoutCharge }
  | {
      ok: false;
      reason:
        | "not_found"
        | "invalid_total"
        | "already_paid"
        | "invalid_tip"
        | "deposit_unavailable"
        | "amount_changed";
      error: string;
      /** For "amount_changed": what the total actually is. */
      amountDueCents?: number;
    };

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function resolveCheckoutCharge({
  bookingId,
  tipCents,
  isDepositPayment = false,
  scope = "bill",
  expectedAmountCents,
}: {
  bookingId: string;
  tipCents?: unknown;
  /** The customer chose "Pay deposit". */
  isDepositPayment?: boolean;
  /**
   * "bill": everything still owed (the whole trip for a multi-ride booking).
   * "ride": this one ride only, which is what the dashboard's form collects.
   */
  scope?: "bill" | "ride";
  /** The total the customer was shown: fare plus tip. */
  expectedAmountCents: unknown;
}): Promise<CheckoutChargeResult> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      depositMode: true,
      depositPercent: true,
      depositCents: true,
    },
  });
  const due = booking ? await getAmountDue(bookingId) : null;
  if (!booking || !due) {
    return { ok: false, reason: "not_found", error: "Booking not found" };
  }

  if (due.totalCents <= 0) {
    return {
      ok: false,
      reason: "invalid_total",
      error: "Invalid booking total.",
    };
  }
  if (due.balanceCents <= 0) {
    return {
      ok: false,
      reason: "already_paid",
      error: "This booking is already fully paid.",
    };
  }

  const tip = tipCents ?? 0;
  if (typeof tip !== "number" || !Number.isInteger(tip) || tip < 0) {
    return { ok: false, reason: "invalid_tip", error: "Invalid tip amount." };
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
        ok: false,
        reason: "deposit_unavailable",
        error:
          "A deposit can't be paid on this booking right now. Nothing was charged. Please refresh the page.",
      };
    }
    fareCents = depositCents;
  } else if (scope === "ride") {
    fareCents = due.rideBalanceCents;
    if (fareCents <= 0) {
      return {
        ok: false,
        reason: "already_paid",
        error: "Nothing is due on this ride.",
      };
    }
  } else {
    fareCents = due.balanceCents;
  }

  const amountCents = fareCents + tip;

  // What you see is what you pay.
  if (expectedAmountCents !== amountCents) {
    return {
      ok: false,
      reason: "amount_changed",
      error: `The amount due is now ${money(amountCents)}. Nothing was charged. Please refresh the page and try again.`,
      amountDueCents: amountCents,
    };
  }

  return {
    ok: true,
    charge: {
      due,
      fareCents,
      tipCents: tip,
      amountCents,
      isDepositPayment,
      metadata: {
        tipCents: tip.toString(),
        baseFareCents: fareCents.toString(),
        // When something was already paid, the webhook adds this payment to
        // it instead of replacing it. (A deposit is always added.)
        isBalancePayment:
          !isDepositPayment && due.paidCents > 0 ? "true" : "false",
        isDepositPayment: isDepositPayment ? "true" : "false",
        depositAmountCents: isDepositPayment ? fareCents.toString() : "",
      },
    },
  };
}
