// src/lib/reminders/reviewRequests.ts
//
// Post-ride Google review requests, run by the same 5-minute scheduled job
// as the ride reminders.
//
// When a ride is marked Completed (by the driver app or an admin), the rider
// gets one thank-you email with the Google review link about 2 hours later:
//   - never between 9 pm and 8 am company time (it waits for the morning)
//   - once per rider every 90 days, however many rides they take
//   - for a multi-leg trip, only after the last leg is done
//   - not for corporate-account rides (see INCLUDE_CORPORATE)
// Off until GOOGLE_REVIEW_URL is set. Each request is recorded on the
// booking's timeline and in its "Reminders Sent" card.

import type { BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { companyDisplayName } from "@/lib/companyName";
import { reviewRequestEmail, sendEmail } from "@/lib/email/sendReminderEmails";

export const REVIEW_REQUEST = "REVIEW_REQUEST_SENT";

const HOUR = 3_600_000;
/** Wait this long after the ride is marked Completed. */
export const REVIEW_DELAY_HOURS = 2;
/** Give up on a ride this long after completion (covers quiet hours). */
export const REVIEW_WINDOW_HOURS = 36;
/** Ask the same rider at most once in this many days. */
export const REVIEW_REPEAT_DAYS = 90;
/** Local hours when no request is sent: from 9 pm until 8 am. */
export const QUIET_FROM_HOUR = 21;
export const QUIET_UNTIL_HOUR = 8;
/** Corporate-account rides are skipped: the employer, not the rider, is the
 *  customer. Set to true to include their passengers too. */
export const INCLUDE_CORPORATE = false;

/** Legs of a trip that may still be driven. */
const OPEN_STATUSES: BookingStatus[] = [
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
];

export function reviewUrl(): string | null {
  const u = (process.env.GOOGLE_REVIEW_URL ?? "").trim();
  return /^https?:\/\//.test(u) ? u : null;
}

export type ReviewRide = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  tripGroupId: string | null;
  corporateAccountId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  user: { name: string | null; email: string } | null;
  corporatePassenger: { name: string | null; email: string | null } | null;
  tripGroup: {
    bookings: { id: string; status: BookingStatus; pickupAt: Date }[];
  } | null;
  statusEvents: { status: BookingStatus; eventType: string; createdAt: Date }[];
};

export type PlannedReviewRequest = {
  ride: ReviewRide;
  to: string;
  name: string | null;
};

const cleanEmail = (e: string | null | undefined) =>
  (e ?? "").trim().toLowerCase() || null;

export function contactOf(r: ReviewRide) {
  return {
    name:
      (
        r.user?.name ??
        r.guestName ??
        r.corporatePassenger?.name ??
        ""
      ).trim() || null,
    email: cleanEmail(
      r.user?.email ?? r.guestEmail ?? r.corporatePassenger?.email ?? null,
    ),
  };
}

/** When the ride was last marked Completed (null if never recorded). */
export function completedAt(r: ReviewRide): Date | null {
  const times = r.statusEvents
    .filter((e) => e.status === "COMPLETED")
    .map((e) => e.createdAt.getTime());
  return times.length ? new Date(Math.max(...times)) : null;
}

export function localHour(now: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number(h);
}

export function isQuietHour(now: Date, timeZone: string): boolean {
  const h = localHour(now, timeZone);
  return h >= QUIET_FROM_HOUR || h < QUIET_UNTIL_HOUR;
}

/**
 * Who is due a review request right now. No database, no sending.
 * `recentlyAsked` holds the emails asked in the last REVIEW_REPEAT_DAYS days.
 */
export function planReviewRequests(
  rides: ReviewRide[],
  opts: { now: Date; timeZone: string; recentlyAsked: Set<string> },
): PlannedReviewRequest[] {
  const { now, timeZone, recentlyAsked } = opts;
  if (isQuietHour(now, timeZone)) return [];

  const asked = new Set(recentlyAsked);
  const out: PlannedReviewRequest[] = [];

  // Oldest completion first, so a rider with two rides is asked about the first.
  const due = rides
    .map((r) => ({ r, at: completedAt(r) }))
    .filter((x): x is { r: ReviewRide; at: Date } => !!x.at)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  for (const { r, at } of due) {
    if (r.status !== "COMPLETED") continue;
    if (!INCLUDE_CORPORATE && r.corporateAccountId) continue;
    if (r.statusEvents.some((e) => e.eventType === REVIEW_REQUEST)) continue;

    const since = (now.getTime() - at.getTime()) / HOUR;
    if (since < REVIEW_DELAY_HOURS || since > REVIEW_WINDOW_HOURS) continue;

    // Multi-leg trip: wait until no later leg is still to be driven.
    const laterLegOpen = (r.tripGroup?.bookings ?? []).some(
      (b) =>
        b.id !== r.id &&
        b.pickupAt.getTime() > r.pickupAt.getTime() &&
        OPEN_STATUSES.includes(b.status),
    );
    if (laterLegOpen) continue;

    const c = contactOf(r);
    if (!c.email || asked.has(c.email)) continue;

    out.push({ ride: r, to: c.email, name: c.name });
    // One ask per rider per run, even across separate bookings.
    asked.add(c.email);
  }
  return out;
}

const RIDE_SELECT = {
  id: true,
  status: true,
  pickupAt: true,
  tripGroupId: true,
  corporateAccountId: true,
  guestName: true,
  guestEmail: true,
  user: { select: { name: true, email: true } },
  corporatePassenger: { select: { name: true, email: true } },
  tripGroup: {
    select: {
      bookings: { select: { id: true, status: true, pickupAt: true } },
    },
  },
  statusEvents: {
    where: {
      OR: [{ status: "COMPLETED" as const }, { eventType: REVIEW_REQUEST }],
    },
    select: { status: true, eventType: true, createdAt: true },
  },
};

export async function processReviewRequests(
  now = new Date(),
): Promise<{ sent: number; failed: number; off?: boolean }> {
  const url = reviewUrl();
  if (!url) return { sent: 0, failed: 0, off: true };

  const windowStart = new Date(now.getTime() - REVIEW_WINDOW_HOURS * HOUR);
  const rides = (await db.booking.findMany({
    where: {
      status: "COMPLETED",
      ...(INCLUDE_CORPORATE ? {} : { corporateAccountId: null }),
      statusEvents: {
        some: { status: "COMPLETED", createdAt: { gte: windowStart } },
        none: { eventType: REVIEW_REQUEST },
      },
    },
    select: RIDE_SELECT,
    take: 500,
  })) as unknown as ReviewRide[];
  if (rides.length === 0) return { sent: 0, failed: 0 };

  // Everyone asked in the last 90 days.
  const recent = await db.bookingStatusEvent.findMany({
    where: {
      eventType: REVIEW_REQUEST,
      createdAt: {
        gte: new Date(now.getTime() - REVIEW_REPEAT_DAYS * 24 * HOUR),
      },
    },
    select: { metadata: true },
  });
  const recentlyAsked = new Set<string>();
  for (const e of recent) {
    const m = (e.metadata ?? {}) as Record<string, unknown>;
    if (typeof m.to === "string" && m.to) recentlyAsked.add(m.to);
  }

  const settings = await getCompanySettings();
  const company = companyDisplayName(settings);
  const plan = planReviewRequests(rides, {
    now,
    timeZone: settings.timezone,
    recentlyAsked,
  });

  const counts = { sent: 0, failed: 0 };
  for (const p of plan) {
    // Record first so an overlapping run can't send twice. A failure stays
    // recorded (marked failed) rather than retrying every 5 minutes: a
    // review ask isn't worth emailing someone twice over.
    const ev = await db.bookingStatusEvent.create({
      data: {
        bookingId: p.ride.id,
        status: p.ride.status,
        eventType: REVIEW_REQUEST,
        metadata: { to: p.to, auto: true } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    try {
      await sendEmail(
        p.to,
        reviewRequestEmail({ company, name: p.name, reviewUrl: url }),
      );
      counts.sent += 1;
    } catch (e) {
      console.error("Review request failed:", e);
      counts.failed += 1;
      await db.bookingStatusEvent.update({
        where: { id: ev.id },
        data: {
          metadata: {
            to: p.to,
            auto: true,
            failed: true,
            error: String((e as Error)?.message ?? e).slice(0, 300),
          },
        },
      });
    }
  }
  return counts;
}
