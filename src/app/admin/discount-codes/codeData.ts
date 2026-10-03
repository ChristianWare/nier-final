// Loading codes with their uses, for the admin pages.

import { db } from "@/lib/db";
import { RELEASED_STATUSES } from "@/lib/discounts/discountCodes";
import { codeStatus, type CodeStatus } from "@/lib/discounts/discountRules";

export const STATUS_BADGE: Record<
  CodeStatus,
  { label: string; cls: string; tip: string }
> = {
  active: {
    label: "Active",
    cls: "badge_good",
    tip: "Customers can use it now.",
  },
  scheduled: {
    label: "Scheduled",
    cls: "badge_purple",
    tip: "It starts working on its first booking day.",
  },
  expired: {
    label: "Expired",
    cls: "badge_neutral",
    tip: "Its last booking day has passed.",
  },
  used_up: {
    label: "Used up",
    cls: "badge_neutral",
    tip: "It has reached its total uses.",
  },
  off: {
    label: "Off",
    cls: "badge_neutral",
    tip: "Turned off. Customers can't use it.",
  },
};

export async function loadCodes() {
  const now = new Date();
  const codes = await db.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        where: { status: { notIn: RELEASED_STATUSES } },
        select: {
          id: true,
          tripGroupId: true,
          discountCents: true,
          totalCents: true,
        },
      },
    },
  });
  return codes.map((c) => {
    const uses = new Set(c.bookings.map((b) => b.tripGroupId ?? b.id)).size;
    return {
      ...c,
      uses,
      rides: c.bookings.length,
      givenCents: c.bookings.reduce((s, b) => s + (b.discountCents ?? 0), 0),
      bookedCents: c.bookings.reduce((s, b) => s + b.totalCents, 0),
      status: codeStatus(c, uses, now),
    };
  });
}
