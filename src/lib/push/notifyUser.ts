// lib/push/notifyUser.ts
// High-level helpers that translate booking events into push notifications.
// Drop calls to these alongside your existing email calls.
//
// Example — in your booking confirmation action:
//   import { notifyAdminsPush, notifyDriverPush } from "@/lib/push/notifyUser";
//   await notifyAdminsPush("NEW_BOOKING", booking);
//   await notifyDriverPush(driverId, "DRIVER_ASSIGNED", booking);

import { sendPushToAllAdmins, sendPushToUserIfEnabled } from "./send";
import type { PushEvent, PushPayload } from "./send";

type BookingMeta = {
  id: string;
  pickupAddress: string;
  dropoffAddress?: string | null;
  pickupAt?: Date | string | null;
  customerName?: string | null;
  guestName?: string | null;
  totalCents?: number | null;
  currency?: string | null;
};

function fmt(meta: BookingMeta) {
  const name = meta.customerName || meta.guestName || "New booking";
  const code = meta.id.slice(0, 8).toUpperCase();
  const origin = meta.pickupAddress?.slice(0, 40) || "";
  const dest = meta.dropoffAddress?.slice(0, 40) || "";
  const total = meta.totalCents
    ? ` · $${(meta.totalCents / 100).toFixed(0)}`
    : "";
  return { name, code, origin, dest, total };
}

function pickupTime(meta: BookingMeta): string {
  if (!meta.pickupAt) return "";
  const d = new Date(meta.pickupAt);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

// ─── Admin notifications ─────────────────────────────────────────────────────

export async function notifyAdminsPush(
  event: PushEvent,
  booking: BookingMeta,
): Promise<void> {
  const { name, code, origin, dest, total } = fmt(booking);
  const time = pickupTime(booking);
  const bookingUrl = `/admin/bookings/${booking.id}`;

  const payloads: Record<string, PushPayload> = {
    NEW_BOOKING: {
      title: "🆕 New Booking Request",
      body: `${name} – ${origin}${dest ? ` → ${dest}` : ""}${total}`,
      url: bookingUrl,
      tag: `booking-new-${code}`,
      urgent: true,
    },
    PAYMENT_RECEIVED: {
      title: "💵 Payment Received",
      body: `${name} paid${total} · Booking ${code}`,
      url: bookingUrl,
      tag: `booking-paid-${code}`,
      urgent: false,
    },
    PAYMENT_LINK_SENT: {
      title: "🔗 Payment Link Sent",
      body: `${name} · Booking ${code}`,
      url: bookingUrl,
      tag: `booking-link-${code}`,
    },
    BOOKING_CANCELLED: {
      title: "❌ Booking Cancelled",
      body: `${name} · ${time} · ${origin}`,
      url: bookingUrl,
      tag: `booking-cancel-${code}`,
      urgent: true,
    },
    BOOKING_DECLINED: {
      title: "🚫 Booking Declined",
      body: `${name} · Booking ${code}`,
      url: bookingUrl,
      tag: `booking-declined-${code}`,
    },
    DRIVER_EN_ROUTE: {
      title: "🚗 Driver En Route",
      body: `Driver heading to ${origin}`,
      url: bookingUrl,
      tag: `trip-enroute-${code}`,
    },
    DRIVER_ARRIVED: {
      title: "📍 Driver Arrived",
      body: `Driver is at ${origin}`,
      url: bookingUrl,
      tag: `trip-arrived-${code}`,
    },
    TRIP_COMPLETED: {
      title: "✅ Trip Completed",
      body: `${name} · ${origin}${dest ? ` → ${dest}` : ""}`,
      url: bookingUrl,
      tag: `trip-done-${code}`,
    },
  };

  const payload = payloads[event];
  if (!payload) return;

  try {
    await sendPushToAllAdmins(event, payload);
  } catch (err) {
    console.error(`[PushNotify] Admin push failed for ${event}:`, err);
  }
}

// ─── Driver notifications ────────────────────────────────────────────────────

export async function notifyDriverPush(
  driverId: string,
  event: PushEvent,
  booking: BookingMeta,
): Promise<void> {
  const { code, origin, dest } = fmt(booking);
  const time = pickupTime(booking);
  const tripUrl = `/driver-dashboard/trips/${booking.id}`;

  const payloads: Record<string, PushPayload> = {
    DRIVER_ASSIGNED: {
      title: "🚗 New Ride Assigned",
      body: `${time ? `${time} · ` : ""}${origin}${dest ? ` → ${dest}` : ""}`,
      url: tripUrl,
      tag: `driver-assigned-${code}`,
      urgent: true,
    },
    RIDE_REMINDER: {
      title: "⏰ Ride Reminder",
      body: `Pickup in 30 min · ${origin}`,
      url: tripUrl,
      tag: `driver-reminder-${code}`,
      urgent: true,
    },
    TRIP_UPDATED: {
      title: "📝 Trip Updated",
      body: `Booking ${code} has been updated. Tap to review.`,
      url: tripUrl,
      tag: `driver-updated-${code}`,
    },
    BOOKING_CANCELLED: {
      title: "❌ Trip Cancelled",
      body: `Booking ${code} – ${time ? `${time} · ` : ""}${origin} has been cancelled.`,
      url: tripUrl,
      tag: `driver-cancel-${code}`,
      urgent: true,
    },
    TRIP_COMPLETED: {
      title: "✅ Trip Marked Complete",
      body: `Booking ${code} is complete.`,
      url: tripUrl,
      tag: `driver-done-${code}`,
    },
  };

  const payload = payloads[event];
  if (!payload) return;

  try {
    await sendPushToUserIfEnabled(driverId, event, payload);
  } catch (err) {
    console.error(`[PushNotify] Driver push failed for ${event}:`, err);
  }
}
