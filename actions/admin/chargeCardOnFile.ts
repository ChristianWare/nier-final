// actions/admin/chargeCardOnFile.ts
"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getAmountDue } from "@/lib/booking/getAmountDue";
import { billScope, chargeSavedCard } from "@/lib/booking/chargeSavedCard";
import { auth } from "../../auth";

const KIND = "ADMIN_CARD_ON_FILE";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function getAdminId(): Promise<string | null> {
  const session = await auth();
  const user: any = session?.user ?? null;
  const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
  const id = (user?.id ?? user?.userId ?? null) as string | null;
  if (!user || !id || !roles.includes("ADMIN")) return null;
  return id;
}

// ── What the "Charge card on file" button shows ───────────────────────────────
// Same calculation the charge below uses, so the label and the charge match.

export type CardOnFileQuote = {
  /** This ride, or every ride in the trip added together. */
  totalCents: number;
  /** Collected so far. */
  paidCents: number;
  /** What the button will charge. */
  balanceCents: number;
  isGroup: boolean;
  rideCount: number;
  currency: string;
};

export async function adminGetCardOnFileQuote(
  bookingId: string,
): Promise<CardOnFileQuote | { error: string }> {
  if (!bookingId) return { error: "Missing bookingId" };
  if (!(await getAdminId())) return { error: "Unauthorized." };

  const due = await getAmountDue(bookingId);
  if (!due) return { error: "Booking not found" };

  return {
    totalCents: due.totalCents,
    paidCents: due.paidCents,
    balanceCents: due.balanceCents,
    isGroup: due.isGroup,
    rideCount: due.rideCount,
    currency: due.currency,
  };
}

// ── Charge the saved card for whatever is still owed ──────────────────────────
//
// This action only moves the money. It does NOT write the payment to the
// database: the Stripe webhook (payment_intent.succeeded → finalizePaid) does
// that, exactly as it does for "Take card payment (manual)" and for customer
// checkout. One writer means a payment can only ever be recorded once, and the
// webhook already knows how to roll a payment up to a multi-ride trip.

export async function adminChargeCardOnFile({
  bookingId,
  expectedAmountCents,
}: {
  bookingId: string;
  /** The amount the admin saw on the button. If it no longer matches what is
   *  owed, nothing is charged. */
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

  const adminId = await getAdminId();
  if (!adminId) return { error: "Unauthorized." };

  const due = await getAmountDue(bookingId);
  if (!due) return { error: "Booking not found" };

  if (due.totalCents <= 0) {
    return { error: "Booking total must be > 0. Approve price first." };
  }
  if (due.balanceCents <= 0) {
    return { error: "No balance due. The booking is fully paid." };
  }

  // What you see is what you charge.
  if (expectedAmountCents !== due.balanceCents) {
    return {
      error: `The amount due is now ${money(due.balanceCents)}. Nothing was charged. Check the new amount and confirm again.`,
      amountDueCents: due.balanceCents,
    };
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true },
  });

  if (!booking?.userId) {
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

  const result = await chargeSavedCard({
    customerId,
    amountCents: due.balanceCents,
    currency: due.currency,
    chargeScope: billScope(due),
    previouslyPaidCents: due.paidCents,
    metadata: {
      bookingId: due.bookingId,
      tripGroupId: due.tripGroupId ?? "",
      kind: KIND,
      // Read by the webhook: when something was already paid, add this
      // charge to it instead of replacing it.
      isBalancePayment: due.paidCents > 0 ? "true" : "false",
      balanceAmount: due.balanceCents.toString(),
      originalTotal: due.totalCents.toString(),
      chargedByUserId: adminId,
    },
  });

  if (!result.ok) {
    switch (result.reason) {
      case "stripe_unreachable":
        return {
          error: `Could not reach Stripe (${result.detail ?? "unknown error"}). Nothing was charged.`,
        };
      case "no_active_card":
        return {
          error: "No active (non-expired) card on file for this customer.",
        };
      case "already_charged":
        return {
          error: `This card was already charged ${money(result.earlier?.amountCents ?? 0)} for this ${due.isGroup ? "trip" : "booking"}, and Stripe has not finished posting it yet. Refresh in a minute. Do not charge again. (${result.earlier?.id ?? ""})`,
        };
      case "needs_authentication":
        return {
          error:
            "This card needs the customer to approve the charge, so it can't be charged from here. Nothing was charged. Use the payment link instead.",
        };
      case "declined":
        return {
          error: `${result.detail ?? "The card was declined."} Nothing was charged.`,
        };
      default:
        return {
          error: `Stripe could not confirm this charge (${result.detail ?? "unknown error"}). Check the Stripe dashboard before trying again.`,
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
