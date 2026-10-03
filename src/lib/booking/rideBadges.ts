// src/lib/booking/rideBadges.ts
//
// What a ride's badges say. Every ride gets two:
//   1. a status badge: where the ride is (Pending review … Completed), and
//   2. a payment tag: Paid, Partly paid or Unpaid — for a ride in a trip,
//      based on the whole trip, since a trip's payment is recorded on one ride.
// Each comes with a short explanation shown when you hover over it.

import type { BookingStatus, PaymentStatus } from "@prisma/client";

export type StatusTone =
  | "pending"
  | "due"
  | "confirmed"
  | "assigned"
  | "moving"
  | "done"
  | "lost"
  | "draft";
export type StatusBadgeInfo = { label: string; tone: StatusTone; tip: string };

export type PaymentTone = "paid" | "partial" | "unpaid" | "refunded";
export type PaymentTagInfo = { label: string; tone: PaymentTone; tip: string };

const STATUS: Record<BookingStatus, StatusBadgeInfo> = {
  PENDING_REVIEW: {
    label: "Pending review",
    tone: "pending",
    tip: "A new request. It needs to be reviewed and approved or declined.",
  },
  PENDING_PAYMENT: {
    label: "Payment due",
    tone: "due",
    tip: "Approved and waiting on the customer to pay before the ride is confirmed.",
  },
  CONFIRMED: {
    label: "Confirmed",
    tone: "confirmed",
    tip: "Booked and on the schedule. No driver is assigned yet.",
  },
  ASSIGNED: {
    label: "Driver assigned",
    tone: "assigned",
    tip: "Booked, with a driver assigned.",
  },
  EN_ROUTE: {
    label: "Driver en route",
    tone: "moving",
    tip: "The driver is on the way to the pickup.",
  },
  ARRIVED: {
    label: "Driver arrived",
    tone: "moving",
    tip: "The driver is at the pickup.",
  },
  IN_PROGRESS: {
    label: "In progress",
    tone: "moving",
    tip: "The ride is underway.",
  },
  COMPLETED: {
    label: "Completed",
    tone: "done",
    tip: "The ride is done.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "lost",
    tip: "The ride was cancelled and won't happen.",
  },
  DECLINED: {
    label: "Declined",
    tone: "lost",
    tip: "The request was declined.",
  },
  NO_SHOW: {
    label: "No-show",
    tone: "lost",
    tip: "The passenger didn't show up for the pickup.",
  },
  REFUNDED: {
    label: "Refunded",
    tone: "lost",
    tip: "The ride was refunded in full.",
  },
  PARTIALLY_REFUNDED: {
    label: "Partially refunded",
    tone: "done",
    tip: "The ride happened, and part of the payment was refunded.",
  },
  DRAFT: {
    label: "Draft",
    tone: "draft",
    tip: "Not finished yet. It was saved while the booking was being created.",
  },
};

export function statusBadge(status: BookingStatus | string): StatusBadgeInfo {
  return (
    STATUS[status as BookingStatus] ?? {
      label: String(status).replaceAll("_", " ").toLowerCase(),
      tone: "draft",
      tip: "",
    }
  );
}

export type PaymentInput = {
  status: BookingStatus | string;
  /** This ride's own payment record. */
  paymentStatus: PaymentStatus | string | null;
  /** The trip the ride belongs to, if any. */
  trip: {
    paymentStatus: PaymentStatus | string | null;
    amountPaidCents: number;
  } | null;
};

const CALLED_OFF = ["CANCELLED", "DECLINED", "NO_SHOW"];

/** The Paid / Partly paid / Unpaid tag, or null when there's nothing to say
 *  (drafts, refunded rides, and called-off rides with nothing paid). */
export function paymentTag(p: PaymentInput): PaymentTagInfo | null {
  if (p.status === "DRAFT" || p.status === "REFUNDED") return null;
  if (p.paymentStatus === "REFUNDED") {
    return {
      label: "Refunded",
      tone: "refunded",
      tip: "The payment was refunded.",
    };
  }
  if (p.paymentStatus === "PARTIALLY_REFUNDED") {
    return {
      label: "Partly refunded",
      tone: "refunded",
      tip: "Part of the payment was refunded.",
    };
  }

  let state: "paid" | "partial" | "unpaid";
  if (p.trip) {
    state =
      p.trip.paymentStatus === "PAID"
        ? "paid"
        : p.trip.amountPaidCents > 0 ||
            p.paymentStatus === "PAID" ||
            p.paymentStatus === "PARTIALLY_PAID"
          ? "partial"
          : "unpaid";
  } else {
    state =
      p.paymentStatus === "PAID"
        ? "paid"
        : p.paymentStatus === "PARTIALLY_PAID"
          ? "partial"
          : "unpaid";
  }
  if (CALLED_OFF.includes(String(p.status)) && state === "unpaid") return null;

  const what = p.trip ? "this trip" : "this ride";
  if (state === "paid") {
    return {
      label: "Paid",
      tone: "paid",
      tip: p.trip ? "The whole trip is paid in full." : "Paid in full.",
    };
  }
  if (state === "partial") {
    return {
      label: "Partly paid",
      tone: "partial",
      tip: `Part of ${what} has been paid. There's still a balance.`,
    };
  }
  return {
    label: "Unpaid",
    tone: "unpaid",
    tip:
      p.status === "COMPLETED"
        ? `Nothing has been paid on ${what}, and the ride is done. Money is still owed.`
        : `Nothing has been paid on ${what} yet.`,
  };
}
