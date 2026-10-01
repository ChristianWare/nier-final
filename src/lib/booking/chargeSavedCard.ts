// src/lib/booking/chargeSavedCard.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStripe } from "@/lib/stripe";

/**
 * Charge a customer's saved card, off-session, for an amount the caller has
 * already worked out.
 *
 * Shared by the admin "Charge card on file" button and the customer's
 * "Pay with saved card" button, so both follow the same safety rules.
 *
 * It only moves the money. It does NOT record the payment: the Stripe webhook
 * (payment_intent.succeeded → finalizePaid) does that, so a payment can only
 * ever be recorded once.
 */

/** How far back to look for a charge Stripe took that isn't recorded yet. */
const UNRECORDED_LOOKBACK_SECONDS = 24 * 60 * 60;

export type SavedCardChargeFailure =
  /** Stripe could not be reached before anything was attempted. */
  | "stripe_unreachable"
  | "no_active_card"
  /** An earlier saved-card charge for this bill has not been recorded yet. */
  | "already_charged"
  | "needs_authentication"
  | "declined"
  /** Stripe did not confirm the charge. The outcome is unknown. */
  | "unconfirmed";

export type SavedCardChargeResult =
  | { ok: true; paymentIntentId: string; amountCents: number; last4: string }
  | {
      ok: false;
      reason: SavedCardChargeFailure;
      /** Stripe's own wording, when there is some. */
      detail?: string;
      /** For "already_charged": the earlier charge. */
      earlier?: { id: string; amountCents: number };
    };

/** The bill a charge settles: the whole trip, or the single booking. */
export function billScope(due: {
  tripGroupId: string | null;
  bookingId: string;
}): string {
  return due.tripGroupId
    ? `group:${due.tripGroupId}`
    : `booking:${due.bookingId}`;
}

export async function chargeSavedCard({
  customerId,
  amountCents,
  currency,
  chargeScope,
  previouslyPaidCents,
  metadata,
}: {
  customerId: string;
  /** Exactly what to charge, tip included. */
  amountCents: number;
  currency: string;
  /** From billScope(). */
  chargeScope: string;
  /** What had been collected on this bill when the amount was worked out. */
  previouslyPaidCents: number;
  /** Read by the webhook to record the payment. */
  metadata: Record<string, string>;
}): Promise<SavedCardChargeResult> {
  // Everything in this block only reads from Stripe. If any of it fails, no
  // charge has been attempted.
  let stripe;
  let pmList;
  let recent;
  try {
    stripe = await getStripe();
    pmList = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 10,
    });
    recent = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 20,
      created: {
        gte: Math.floor(Date.now() / 1000) - UNRECORDED_LOOKBACK_SECONDS,
      },
    });
  } catch (e: any) {
    console.error("chargeSavedCard: Stripe lookup failed", e);
    return {
      ok: false,
      reason: "stripe_unreachable",
      detail: e?.message ?? "unknown error",
    };
  }

  const now = new Date();
  const activePm = pmList.data.find((pm) => {
    const card = pm.card;
    if (!card) return false;
    const expDate = new Date(card.exp_year, card.exp_month - 1, 1);
    return expDate >= new Date(now.getFullYear(), now.getMonth(), 1);
  });
  if (!activePm) return { ok: false, reason: "no_active_card" };

  // Guard against charging twice. If Stripe already took a saved-card payment
  // for this bill and the webhook has not posted it yet, "paid so far" is still
  // the figure that earlier charge started from. Charging again would double up.
  const earlier = recent.data.find(
    (p) =>
      p.status === "succeeded" &&
      p.metadata?.chargeScope === chargeScope &&
      p.metadata?.previouslyPaid === String(previouslyPaidCents),
  );
  if (earlier) {
    return {
      ok: false,
      reason: "already_charged",
      earlier: { id: earlier.id, amountCents: earlier.amount },
    };
  }

  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customerId,
      payment_method: activePm.id,
      confirm: true,
      off_session: true,
      metadata: {
        ...metadata,
        chargeScope,
        previouslyPaid: String(previouslyPaidCents),
      },
    });
  } catch (e: any) {
    // Declines and "needs authentication" are thrown for off-session charges.
    if (e?.type === "StripeCardError") {
      if (e?.code === "authentication_required") {
        return { ok: false, reason: "needs_authentication" };
      }
      return { ok: false, reason: "declined", detail: e?.message };
    }
    console.error("chargeSavedCard: Stripe error", e);
    return {
      ok: false,
      reason: "unconfirmed",
      detail: e?.message ?? "unknown error",
    };
  }

  if (pi.status !== "succeeded") {
    return {
      ok: false,
      reason: "unconfirmed",
      detail: `Stripe status: ${pi.status}`,
    };
  }

  return {
    ok: true,
    paymentIntentId: pi.id,
    amountCents: pi.amount,
    last4: activePm.card?.last4 ?? "????",
  };
}
