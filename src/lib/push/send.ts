// lib/push/send.ts
// Core push notification sending logic.
// Wraps web-push and handles subscription cleanup on expired endpoints.

import webpush from "web-push";
import { db } from "@/lib/db";
import { getVapidConfig } from "./vapid";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  urgent?: boolean;
};

// Map NotificationEventType → push payload builder
export type PushEvent =
  | "NEW_BOOKING"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_LINK_SENT"
  | "BOOKING_CANCELLED"
  | "BOOKING_DECLINED"
  | "DRIVER_ASSIGNED"
  | "RIDE_REMINDER"
  | "TRIP_UPDATED"
  | "TRIP_COMPLETED"
  | "DRIVER_EN_ROUTE"
  | "DRIVER_ARRIVED";

// ─── Send to a single userId ────────────────────────────────────────────────
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const { publicKey, privateKey, subject } = getVapidConfig();

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSub, JSON.stringify(payload));
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 410 Gone / 404 Not Found = subscription expired, clean it up
        if (statusCode === 410 || statusCode === 404) {
          await db.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => null);
        }
        console.error(`[Push] Failed for sub ${sub.id}:`, err);
        failed++;
      }
    }),
  );

  return { sent, failed };
}

// ─── Send to all users with a given role ────────────────────────────────────
export async function sendPushToRole(
  role: "ADMIN" | "DRIVER",
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const users = await db.user.findMany({
    where: { roles: { has: role } },
    select: { id: true },
  });

  let totalSent = 0;
  let totalFailed = 0;

  for (const user of users) {
    const result = await sendPushToUser(user.id, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { sent: totalSent, failed: totalFailed };
}

// ─── Check user push prefs before sending ───────────────────────────────────
export async function sendPushToUserIfEnabled(
  userId: string,
  event: PushEvent,
  payload: PushPayload,
): Promise<void> {
  // Check if user has push preferences and if this event type is enabled
  const prefs = await db.userPushPreferences.findUnique({
    where: { userId },
  });

  // If no prefs row, default to sending everything
  if (prefs) {
    if (!prefs.pushEnabled) return;

    const prefMap: Record<PushEvent, keyof typeof prefs> = {
      NEW_BOOKING: "pushNewBooking",
      PAYMENT_RECEIVED: "pushPaymentReceived",
      PAYMENT_LINK_SENT: "pushPaymentLinkSent",
      BOOKING_CANCELLED: "pushBookingCancelled",
      BOOKING_DECLINED: "pushBookingDeclined",
      DRIVER_ASSIGNED: "pushRideAssigned",
      RIDE_REMINDER: "pushRideReminder",
      TRIP_UPDATED: "pushTripUpdated",
      TRIP_COMPLETED: "pushTripCompleted",
      DRIVER_EN_ROUTE: "pushTripUpdated",
      DRIVER_ARRIVED: "pushTripUpdated",
    };

    const prefKey = prefMap[event];
    if (prefKey && prefs[prefKey] === false) return;
  }

  await sendPushToUser(userId, payload);
}

// ─── Send to all admins (respecting per-admin prefs) ────────────────────────
export async function sendPushToAllAdmins(
  event: PushEvent,
  payload: PushPayload,
): Promise<void> {
  const admins = await db.user.findMany({
    where: { roles: { has: "ADMIN" } },
    select: { id: true },
  });

  await Promise.allSettled(
    admins.map((admin) => sendPushToUserIfEnabled(admin.id, event, payload)),
  );
}
