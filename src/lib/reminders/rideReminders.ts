// src/lib/reminders/rideReminders.ts
//
// Automatic reminders, run by the scheduled job every 5 minutes:
//   - Customers: a trip reminder 24 hours and 2 hours before pickup.
//   - Customers: a payment reminder when a payment link is still unpaid 24
//     hours after it was sent, and again 48 hours before pickup.
//   - Admins: one email listing rides within 24 hours that are unpaid, have
//     no driver, or are still pending review.
// Never for cancelled, declined or completed rides. Each reminder goes out at
// most once per ride, and each one is recorded on the booking's timeline.

import type { BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { companyDisplayName } from "@/lib/companyName";
import { paymentTag } from "@/lib/booking/rideBadges";
import {
  adminRideAlertEmail,
  paymentReminderEmail,
  sendEmail,
  tripReminderEmail,
} from "@/lib/email/sendReminderEmails";

export const TRIP_REMINDER = "TRIP_REMINDER_SENT";
export const PAYMENT_REMINDER = "PAYMENT_REMINDER_SENT";
export const ADMIN_ALERT = "ADMIN_ALERT_SENT";
export const REMINDER_EVENT_TYPES = [
  TRIP_REMINDER,
  PAYMENT_REMINDER,
  ADMIN_ALERT,
  "BALANCE_REMINDER_SENT",
];

const HOUR = 3_600_000;
const TRIP_STATUSES: BookingStatus[] = ["CONFIRMED", "ASSIGNED", "EN_ROUTE"];
const ALERT_STATUSES: BookingStatus[] = [
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
];

export type ReminderRide = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  tripGroupId: string | null;
  totalCents: number;
  corporateAccountId: string | null;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  user: { name: string | null; email: string } | null;
  corporatePassenger: { name: string | null; email: string | null } | null;
  serviceType: { name: string } | null;
  vehicle: { name: string } | null;
  assignment: { driver: { name: string | null } | null } | null;
  payment: {
    status: string;
    amountPaidCents: number;
    checkoutUrl: string | null;
  } | null;
  tripGroup: { paymentStatus: string; amountPaidCents: number } | null;
  statusEvents: {
    eventType: string;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }[];
};

export type PlannedReminder =
  | { type: "trip"; kind: "24h" | "2h"; ride: ReminderRide }
  | {
      type: "payment";
      kinds: ("after_link" | "before_pickup")[];
      rides: ReminderRide[];
    }
  | {
      type: "admin";
      ride: ReminderRide;
      reasons: ("unpaid" | "no_driver" | "needs_review")[];
    };

const kindOf = (m: Prisma.JsonValue) =>
  m && typeof m === "object" && !Array.isArray(m)
    ? ((m as Record<string, unknown>).kind as string | string[] | undefined)
    : undefined;

function sent(rides: ReminderRide[], eventType: string, kind?: string) {
  return rides.some((r) =>
    r.statusEvents.some((e) => {
      if (e.eventType !== eventType) return false;
      if (!kind) return true;
      const k = kindOf(e.metadata);
      return Array.isArray(k) ? k.includes(kind) : k === kind;
    }),
  );
}

export function customerOf(r: ReminderRide): {
  email: string | null;
  name: string | null;
} {
  return {
    email:
      (r.user?.email ?? r.guestEmail ?? r.corporatePassenger?.email ?? "")
        .trim()
        .toLowerCase() || null,
    name:
      (
        r.user?.name ??
        r.guestName ??
        r.corporatePassenger?.name ??
        ""
      ).trim() || null,
  };
}

/** What's due right now (no database, no sending). */
export function planReminders(
  rides: ReminderRide[],
  now: Date,
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const hoursTo = (r: ReminderRide) =>
    (r.pickupAt.getTime() - now.getTime()) / HOUR;

  for (const r of rides) {
    const h = hoursTo(r);
    if (TRIP_STATUSES.includes(r.status) && customerOf(r).email) {
      if (h > 0 && h <= 2 && !sent([r], TRIP_REMINDER, "2h"))
        out.push({ type: "trip", kind: "2h", ride: r });
      else if (h > 3 && h <= 24 && !sent([r], TRIP_REMINDER, "24h"))
        out.push({ type: "trip", kind: "24h", ride: r });
    }
    if (
      ALERT_STATUSES.includes(r.status) &&
      h > 0 &&
      h <= 24 &&
      !sent([r], ADMIN_ALERT)
    ) {
      const reasons: ("unpaid" | "no_driver" | "needs_review")[] = [];
      if (r.status === "PENDING_REVIEW") reasons.push("needs_review");
      else if (!r.corporateAccountId) {
        const tag = paymentTag({
          status: r.status,
          paymentStatus: r.payment?.status ?? null,
          trip: r.tripGroup,
        });
        if (tag?.tone !== "paid") reasons.push("unpaid");
      }
      if (!r.assignment) reasons.push("no_driver");
      if (reasons.length) out.push({ type: "admin", ride: r, reasons });
    }
  }

  // Payment reminders: once per booking (a trip counts once).
  const groups = new Map<string, ReminderRide[]>();
  for (const r of rides) {
    if (r.status !== "PENDING_PAYMENT" || hoursTo(r) <= 0) continue;
    const key = r.tripGroupId ?? r.id;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.pickupAt.getTime() - b.pickupAt.getTime());
    if (!customerOf(list[0]).email) continue;
    // Already paid (for a trip: the whole trip), even if a status is stuck on
    // "Payment due": never ask a customer who paid.
    const tag = paymentTag({
      status: list[0].status,
      paymentStatus: list[0].payment?.status ?? null,
      trip: list[0].tripGroup,
    });
    if (tag?.tone === "paid") continue;
    const links = list.flatMap((r) =>
      r.statusEvents.filter((e) => e.eventType === "PAYMENT_LINK_SENT"),
    );
    if (links.length === 0) continue; // never asked to pay yet
    const linkAt = Math.max(...links.map((e) => e.createdAt.getTime()));
    const sinceLink = (now.getTime() - linkAt) / HOUR;
    const kinds: ("after_link" | "before_pickup")[] = [];
    if (sinceLink >= 24 && !sent(list, PAYMENT_REMINDER, "after_link"))
      kinds.push("after_link");
    if (
      hoursTo(list[0]) <= 48 &&
      sinceLink >= 12 &&
      !sent(list, PAYMENT_REMINDER, "before_pickup")
    )
      kinds.push("before_pickup");
    if (kinds.length) out.push({ type: "payment", kinds, rides: list });
  }
  return out;
}

const RIDE_SELECT = {
  id: true,
  status: true,
  pickupAt: true,
  tripGroupId: true,
  totalCents: true,
  corporateAccountId: true,
  userId: true,
  guestName: true,
  guestEmail: true,
  pickupAddress: true,
  dropoffAddress: true,
  user: { select: { name: true, email: true } },
  corporatePassenger: { select: { name: true, email: true } },
  serviceType: { select: { name: true } },
  vehicle: { select: { name: true } },
  assignment: { select: { driver: { select: { name: true } } } },
  payment: {
    select: { status: true, amountPaidCents: true, checkoutUrl: true },
  },
  tripGroup: { select: { paymentStatus: true, amountPaidCents: true } },
  statusEvents: {
    where: {
      eventType: {
        in: [TRIP_REMINDER, PAYMENT_REMINDER, ADMIN_ALERT, "PAYMENT_LINK_SENT"],
      },
    },
    select: { eventType: true, metadata: true, createdAt: true },
  },
};

async function adminRecipients(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { roles: { has: "ADMIN" } },
    select: { id: true, email: true },
  });
  const settings = await db.adminNotificationSettings.findMany({
    where: { userId: { in: admins.map((a) => a.id) } },
    select: { userId: true, emailEnabled: true, emailTo: true },
  });
  const byUser = new Map(settings.map((s) => [s.userId, s]));
  const emails = admins
    .map((a) => {
      const s = byUser.get(a.id);
      if (s && s.emailEnabled === false) return null;
      return (s?.emailTo || a.email || "").trim().toLowerCase() || null;
    })
    .filter((e): e is string => !!e);
  return [...new Set(emails)];
}

/** Logs first (so overlapping runs don't double-send), sends, and un-logs
 *  if the email fails so it's tried again next run. */
async function logThenSend(
  logs: {
    bookingId: string;
    status: BookingStatus;
    eventType: string;
    metadata: Prisma.InputJsonValue;
  }[],
  send: () => Promise<void>,
): Promise<boolean> {
  const created = await Promise.all(
    logs.map((l) =>
      db.bookingStatusEvent.create({ data: l, select: { id: true } }),
    ),
  );
  try {
    await send();
    return true;
  } catch (e) {
    console.error("Reminder email failed:", e);
    await db.bookingStatusEvent.deleteMany({
      where: { id: { in: created.map((c) => c.id) } },
    });
    return false;
  }
}

export async function processRideReminders(now = new Date()) {
  const rides = (await db.booking.findMany({
    where: {
      OR: [
        {
          status: { in: [...TRIP_STATUSES, ...ALERT_STATUSES] },
          pickupAt: { gt: now, lte: new Date(now.getTime() + 49 * HOUR) },
        },
        { status: "PENDING_PAYMENT", pickupAt: { gt: now } },
      ],
    },
    select: RIDE_SELECT,
    take: 1000,
  })) as unknown as ReminderRide[];
  const plan = planReminders(rides, now);
  if (plan.length === 0)
    return { trip: 0, payment: 0, adminRides: 0, failed: 0 };

  const settings = await getCompanySettings();
  const company = companyDisplayName(settings);
  const timeZone = settings.timezone;
  const supportEmail =
    (settings as { supportEmail?: string | null }).supportEmail ?? null;
  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const trip = (r: ReminderRide) => ({
    pickupAt: r.pickupAt,
    pickupAddress: r.pickupAddress,
    dropoffAddress: r.dropoffAddress,
    serviceName: r.serviceType?.name ?? null,
    vehicleName: r.vehicle?.name ?? null,
    driverName: r.assignment?.driver?.name ?? null,
  });
  const counts = { trip: 0, payment: 0, adminRides: 0, failed: 0 };

  for (const p of plan) {
    if (p.type === "trip") {
      const c = customerOf(p.ride);
      const ok = await logThenSend(
        [
          {
            bookingId: p.ride.id,
            status: p.ride.status,
            eventType: TRIP_REMINDER,
            metadata: { kind: p.kind, to: c.email, auto: true },
          },
        ],
        () =>
          sendEmail(
            c.email!,
            tripReminderEmail({
              company,
              supportEmail,
              name: c.name,
              kind: p.kind,
              trip: trip(p.ride),
              timeZone,
              tripUrl: p.ride.userId
                ? `${APP_URL}/dashboard/trips/${p.ride.id}`
                : null,
            }),
          ),
      );
      if (ok) counts.trip += 1;
      else counts.failed += 1;
    } else if (p.type === "payment") {
      const first = p.rides[0];
      const c = customerOf(first);
      const total = p.rides.reduce((s, r) => s + r.totalCents, 0);
      const paid = first.tripGroup
        ? first.tripGroup.amountPaidCents
        : p.rides.reduce((s, r) => s + (r.payment?.amountPaidCents ?? 0), 0);
      const amountDueCents = Math.max(0, total - paid);
      const payUrl = first.payment?.checkoutUrl ?? `${APP_URL}/pay/${first.id}`;
      const ok = await logThenSend(
        p.rides.map((r) => ({
          bookingId: r.id,
          status: r.status,
          eventType: PAYMENT_REMINDER,
          metadata: { kind: p.kinds, to: c.email, amountDueCents, auto: true },
        })),
        () =>
          sendEmail(
            c.email!,
            paymentReminderEmail({
              company,
              supportEmail,
              name: c.name,
              amountDueCents,
              payUrl,
              trips: p.rides.map(trip),
              timeZone,
            }),
          ),
      );
      if (ok) counts.payment += 1;
      else counts.failed += 1;
    }
  }

  const alerts = plan.filter(
    (p): p is Extract<PlannedReminder, { type: "admin" }> => p.type === "admin",
  );
  if (alerts.length) {
    const to = await adminRecipients();
    if (to.length) {
      const ok = await logThenSend(
        alerts.map((a) => ({
          bookingId: a.ride.id,
          status: a.ride.status,
          eventType: ADMIN_ALERT,
          metadata: { reasons: a.reasons, to },
        })),
        () =>
          sendEmail(
            to,
            adminRideAlertEmail({
              company,
              timeZone,
              rides: alerts.map((a) => ({
                pickupAt: a.ride.pickupAt,
                customer: customerOf(a.ride).name ?? "Customer",
                serviceName: a.ride.serviceType?.name ?? null,
                reasons: a.reasons,
                url: `${APP_URL}/admin/bookings/${a.ride.id}`,
              })),
            }),
          ),
      );
      if (ok) counts.adminRides += alerts.length;
      else counts.failed += 1;
    }
  }
  return counts;
}
