/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import {
  NotificationEvent,
  DEFAULT_EMAIL_EVENTS,
  DEFAULT_SMS_EVENTS,
} from "./events";
import { buildAdminNotification } from "./templates";
import { sendSms } from "../sms/sendSms";
import { sendAdminNotificationEmail } from "../email/sendAdminNotificationEmail";

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

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const customerName =
    booking.user?.name?.trim() || booking.guestName?.trim() || "—";

  const tpl = buildAdminNotification({
    event,
    appUrl,
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
          subject: `[Nier] ${tpl.subject}`,
          body: tpl.emailBody,
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
 * Queue notifications for later processing by a worker/cron
 * Use this if you want to decouple notification sending from the main request
 */
export async function queueAdminNotificationsForBookingEvent(args: {
  event: NotificationEvent;
  bookingId: string;
}) {
  const jobs = await buildNotificationJobs(args);

  if (jobs.length === 0) return;

  // Create jobs idempotently
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
      payload: j.payload,
    })),
    skipDuplicates: true,
  });
}

/**
 * Send notifications IMMEDIATELY (no queue)
 * Use this for time-sensitive notifications where you want instant delivery
 *
 * Note: This will slow down the request slightly but ensures immediate delivery
 */
export async function sendAdminNotificationsForBookingEvent(args: {
  event: NotificationEvent;
  bookingId: string;
}) {
  const jobs = await buildNotificationJobs(args);

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
          payload: job.payload,
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
          payload: job.payload,
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
