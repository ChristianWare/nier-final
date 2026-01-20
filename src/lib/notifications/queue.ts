/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import {
  NotificationEvent,
  DEFAULT_EMAIL_EVENTS,
  DEFAULT_SMS_EVENTS,
} from "./events";
import { buildAdminNotification } from "./templates";

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
  // If admin hasn’t chosen any events yet, give them good defaults
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

export async function queueAdminNotificationsForBookingEvent(args: {
  event: NotificationEvent;
  bookingId: string;
}) {
  const { event, bookingId } = args;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, serviceType: true },
  });

  if (!booking) return;

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

  if (admins.length === 0) return;

  const jobs: Array<{
    channel: "EMAIL" | "SMS";
    event: NotificationEvent;
    to: string;
    subject?: string | null;
    body: string;
    bookingId: string;
    userId: string;
    dedupeKey: string;
    payload: any;
  }> = [];

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
