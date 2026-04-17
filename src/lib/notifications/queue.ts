/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import {
  NotificationEvent,
  DEFAULT_EMAIL_EVENTS,
  DEFAULT_SMS_EVENTS,
} from "./events";
import { buildAdminNotification } from "./templates";
import { sendSms } from "@/lib/sms/sendSms";
import { sendAdminNotificationEmail } from "@/lib/email/sendAdminNotificationEmail";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { notifyAdminsPush } from "@/lib/push/notifyUser";
import type { PushEvent } from "@/lib/push/send";

// ─── Map NotificationEvent → PushEvent ───────────────────────────────────────
//
// Only events that have a matching payload in notifyAdminsPush are included.
// Any NotificationEvent not listed here simply won't trigger a push.

const NOTIFICATION_TO_PUSH_EVENT: Partial<
  Record<NotificationEvent, PushEvent>
> = {
  BOOKING_REQUESTED: "NEW_BOOKING",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_DECLINED: "BOOKING_DECLINED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PAYMENT_LINK_SENT: "PAYMENT_LINK_SENT",
  TRIP_COMPLETED: "TRIP_COMPLETED",
  NO_SHOW: "NO_SHOW",
  REFUND_ISSUED: "REFUND_ISSUED",
  DRIVER_EN_ROUTE: "DRIVER_EN_ROUTE",
  DRIVER_ARRIVED: "DRIVER_ARRIVED",
  // DRIVER_ASSIGNED, DRIVER_PICKED_UP → no admin push payload defined
};

/**
 * Internal helper — resolves a NotificationEvent + bookingId into a
 * notifyAdminsPush() call. Silently no-ops for events with no push mapping.
 */
async function fireAdminPush(
  event: NotificationEvent,
  bookingId: string,
): Promise<void> {
  const pushEvent = NOTIFICATION_TO_PUSH_EVENT[event];
  if (!pushEvent) return; // no push payload defined for this event

  // AFTER
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      pickupAddress: true,
      dropoffAddress: true,
      pickupAt: true,
      totalCents: true,
      currency: true,
      tripGroupId: true,
      user: { select: { name: true } },
      guestName: true,
    },
  });

  if (!booking) return;

  // For group bookings, use the group total instead of individual booking total
  let effectiveTotalCents = booking.totalCents;
  if (booking.tripGroupId) {
    const siblings = await db.booking.findMany({
      where: { tripGroupId: booking.tripGroupId },
      select: { totalCents: true },
    });
    effectiveTotalCents = siblings.reduce((sum, s) => sum + s.totalCents, 0);
  }

  await notifyAdminsPush(pushEvent, {
    id: booking.id,
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    pickupAt: booking.pickupAt,
    totalCents: effectiveTotalCents,
    currency: booking.currency,
    customerName: booking.user?.name ?? null,
    guestName: booking.guestName ?? null,
  });
}

// ─── Existing types ───────────────────────────────────────────────────────────

type AdminSettings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailTo: string | null;
  smsTo: string | null;
  emailEvents: NotificationEvent[];
  smsEvents: NotificationEvent[];
};

function normalizeEmail(v: string) {
  return (v ?? "").trim().toLowerCase();
}

function normalizePhoneE164(v: string) {
  return (v ?? "").trim();
}

async function getAdminSettings(userId: string): Promise<AdminSettings> {
  const s = await db.adminNotificationSettings.findUnique({
    where: { userId },
    select: {
      emailEnabled: true,
      smsEnabled: true,
      emailTo: true,
      smsTo: true,
      emailEvents: true,
      smsEvents: true,
    },
  });

  // defaults if no row yet
  return {
    emailEnabled: s?.emailEnabled ?? true,
    smsEnabled: s?.smsEnabled ?? false,
    emailTo: s?.emailTo ?? null,
    smsTo: s?.smsTo ?? null,
    emailEvents: (s?.emailEvents as any as NotificationEvent[]) ?? [],
    smsEvents: (s?.smsEvents as any as NotificationEvent[]) ?? [],
  };
}

function applyDefaultsIfEmpty(settings: AdminSettings): AdminSettings {
  // If admin hasn't chosen any events yet, give them good defaults
  const emailEvents =
    settings.emailEvents && settings.emailEvents.length > 0
      ? settings.emailEvents
      : DEFAULT_EMAIL_EVENTS;

  const smsEvents =
    settings.smsEvents && settings.smsEvents.length > 0
      ? settings.smsEvents
      : DEFAULT_SMS_EVENTS;

  return { ...settings, emailEvents, smsEvents };
}

type NotificationJob = {
  channel: "EMAIL" | "SMS";
  event: NotificationEvent;
  to: string;
  subject?: string | null;
  body: string;
  htmlBody?: string | null;
  bookingId: string;
  userId: string;
  dedupeKey: string;
  payload: any;
};

/**
 * Build notification jobs for all admins based on their settings
 */
async function buildNotificationJobs(args: {
  event: NotificationEvent;
  bookingId: string;
}): Promise<NotificationJob[]> {
  const { event, bookingId } = args;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, serviceType: true },
  });

  if (!booking) return [];

  const { timezone: companyTz } = await getCompanySettings();
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const customerName =
    booking.user?.name?.trim() || booking.guestName?.trim() || "—";

  const tpl = buildAdminNotification({
    event,
    appUrl,
    timeZone: companyTz,
    booking: {
      id: booking.id,
      pickupAt: booking.pickupAt,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      serviceName: booking.serviceType?.name ?? "Trip",
      customerName,
    },
  });

  // find all admins
  const admins = await db.user.findMany({
    where: { roles: { has: "ADMIN" } },
    select: { id: true, email: true, name: true },
    take: 500,
  });

  if (admins.length === 0) return [];

  const jobs: NotificationJob[] = [];

  for (const a of admins) {
    const rawEmail = normalizeEmail(a.email ?? "");
    const settings = applyDefaultsIfEmpty(await getAdminSettings(a.id));

    // EMAIL
    if (settings.emailEnabled && settings.emailEvents.includes(event)) {
      const to = normalizeEmail(settings.emailTo ?? rawEmail);
      if (to) {
        const dedupeKey = `${event}:${bookingId}:EMAIL:${to}`;
        jobs.push({
          channel: "EMAIL",
          event,
          to,
          subject: tpl.subject,
          body: tpl.emailBody,
          htmlBody: tpl.htmlBody,
          bookingId,
          userId: a.id,
          dedupeKey,
          payload: { adminUserId: a.id },
        });
      }
    }

    // SMS
    if (settings.smsEnabled && settings.smsEvents.includes(event)) {
      const to = normalizePhoneE164(settings.smsTo ?? "");
      if (to) {
        const dedupeKey = `${event}:${bookingId}:SMS:${to}`;
        jobs.push({
          channel: "SMS",
          event,
          to,
          subject: null,
          body: tpl.smsBody,
          bookingId,
          userId: a.id,
          dedupeKey,
          payload: { adminUserId: a.id },
        });
      }
    }
  }

  return jobs;
}

/**
 * Queue notifications for later processing by a worker/cron.
 * Also fires push notifications immediately — push is stateless and
 * doesn't need a queue since it's a fire-and-forget call.
 */
export async function queueAdminNotificationsForBookingEvent(args: {
  event: NotificationEvent;
  bookingId: string;
}) {
  const jobs = await buildNotificationJobs(args);

  if (jobs.length > 0) {
    // Create email/SMS jobs idempotently
    await db.notificationJob.createMany({
      data: jobs.map((j) => ({
        channel: j.channel as any,
        event: j.event as any,
        to: j.to,
        subject: j.subject ?? null,
        body: j.body,
        bookingId: j.bookingId,
        userId: j.userId,
        dedupeKey: j.dedupeKey,
        payload: { ...j.payload, htmlBody: j.htmlBody },
      })),
      skipDuplicates: true,
    });
  }

  // Push is fire-and-forget — always attempt regardless of email/SMS jobs
  fireAdminPush(args.event, args.bookingId).catch((e) => {
    console.error("[push] queueAdminNotificationsForBookingEvent failed:", e);
  });
}

/**
 * Send notifications IMMEDIATELY (no queue).
 * Also fires push notifications alongside email/SMS.
 */
export async function sendAdminNotificationsForBookingEvent(args: {
  event: NotificationEvent;
  bookingId: string;
}) {
  const jobs = await buildNotificationJobs(args);

  // Push is fire-and-forget — runs in parallel with email/SMS, never blocks
  fireAdminPush(args.event, args.bookingId).catch((e) => {
    console.error("[push] sendAdminNotificationsForBookingEvent failed:", e);
  });

  if (jobs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      // Check for duplicate (already sent)
      const existing = await db.notificationJob.findUnique({
        where: { dedupeKey: job.dedupeKey },
      });

      if (existing?.status === "SENT") {
        // Already sent, skip
        continue;
      }

      // Send immediately
      if (job.channel === "EMAIL") {
        await sendAdminNotificationEmail({
          to: job.to,
          subject: job.subject || "Notification",
          text: job.body,
          html: job.htmlBody || undefined,
        });
      } else if (job.channel === "SMS") {
        await sendSms({
          to: job.to,
          body: job.body,
        });
      }

      // Record as sent (for deduplication)
      await db.notificationJob.upsert({
        where: { dedupeKey: job.dedupeKey },
        create: {
          channel: job.channel as any,
          event: job.event as any,
          to: job.to,
          subject: job.subject ?? null,
          body: job.body,
          bookingId: job.bookingId,
          userId: job.userId,
          dedupeKey: job.dedupeKey,
          payload: { ...job.payload, htmlBody: job.htmlBody },
          status: "SENT",
          sentAt: new Date(),
        },
        update: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
        },
      });

      sent++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `Failed to send ${job.channel} to ${job.to}:`,
        errorMessage,
      );

      // Record failure
      await db.notificationJob.upsert({
        where: { dedupeKey: job.dedupeKey },
        create: {
          channel: job.channel as any,
          event: job.event as any,
          to: job.to,
          subject: job.subject ?? null,
          body: job.body,
          bookingId: job.bookingId,
          userId: job.userId,
          dedupeKey: job.dedupeKey,
          payload: { ...job.payload, htmlBody: job.htmlBody },
          status: "FAILED",
          lastError: errorMessage,
          attempts: 1,
        },
        update: {
          status: "FAILED",
          lastError: errorMessage,
          attempts: { increment: 1 },
        },
      });

      failed++;
    }
  }

  return { sent, failed };
}
