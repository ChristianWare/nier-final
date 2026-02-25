// actions/push/pushSubscription.ts
"use server";

import { auth } from "../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getActorId(session: Session | null): string | undefined {
  return (
    (session?.user?.id as string | undefined) ??
    (session?.user as { userId?: string } | undefined)?.userId
  );
}

function getSessionRoles(session: Session | null): AppRole[] {
  const roles = (session?.user as { roles?: AppRole[] })?.roles;
  return Array.isArray(roles) && roles.length > 0 ? roles : [];
}

// ─── Get push prefs for current user ────────────────────────────────────────
export async function getMyPushPreferences() {
  const session = await auth();
  const actorId = getActorId(session);
  const roles = getSessionRoles(session);

  if (!actorId) throw new Error("Unauthorized");

  const isAdmin = roles.includes("ADMIN");

  const prefs = await db.userPushPreferences.findUnique({
    where: { userId: actorId },
  });

  const subCount = await db.pushSubscription.count({
    where: { userId: actorId },
  });

  return {
    isAdmin,
    isSubscribed: subCount > 0,
    pushEnabled: prefs?.pushEnabled ?? true,
    // Admin events
    pushNewBooking: prefs?.pushNewBooking ?? true,
    pushPaymentReceived: prefs?.pushPaymentReceived ?? true,
    pushPaymentLinkSent: prefs?.pushPaymentLinkSent ?? false,
    pushBookingCancelled: prefs?.pushBookingCancelled ?? true,
    pushBookingDeclined: prefs?.pushBookingDeclined ?? true,
    pushNoShow: prefs?.pushNoShow ?? true,
    pushTripCompleted: prefs?.pushTripCompleted ?? true,
    pushRefundIssued: prefs?.pushRefundIssued ?? true,
    // Driver events
    pushRideAssigned: prefs?.pushRideAssigned ?? true,
    pushRideReminder: prefs?.pushRideReminder ?? true,
    pushTripUpdated: prefs?.pushTripUpdated ?? true,
  };
}

// ─── Save push preferences ───────────────────────────────────────────────────
export async function saveMyPushPreferences(formData: FormData) {
  const session = await auth();
  const actorId = getActorId(session);
  const roles = getSessionRoles(session);

  if (!actorId) return { error: "Unauthorized" as const };

  const isAdminOrDriver = roles.includes("ADMIN") || roles.includes("DRIVER");
  if (!isAdminOrDriver) return { error: "Unauthorized" as const };

  const bool = (key: string) => formData.get(key) === "on";

  await db.userPushPreferences.upsert({
    where: { userId: actorId },
    update: {
      pushEnabled: bool("pushEnabled"),
      pushNewBooking: bool("pushNewBooking"),
      pushPaymentReceived: bool("pushPaymentReceived"),
      pushPaymentLinkSent: bool("pushPaymentLinkSent"),
      pushBookingCancelled: bool("pushBookingCancelled"),
      pushBookingDeclined: bool("pushBookingDeclined"),
      pushNoShow: bool("pushNoShow"),
      pushTripCompleted: bool("pushTripCompleted"),
      pushRefundIssued: bool("pushRefundIssued"),
      pushRideAssigned: bool("pushRideAssigned"),
      pushRideReminder: bool("pushRideReminder"),
      pushTripUpdated: bool("pushTripUpdated"),
    },
    create: {
      userId: actorId,
      pushEnabled: bool("pushEnabled"),
      pushNewBooking: bool("pushNewBooking"),
      pushPaymentReceived: bool("pushPaymentReceived"),
      pushPaymentLinkSent: bool("pushPaymentLinkSent"),
      pushBookingCancelled: bool("pushBookingCancelled"),
      pushBookingDeclined: bool("pushBookingDeclined"),
      pushNoShow: bool("pushNoShow"),
      pushTripCompleted: bool("pushTripCompleted"),
      pushRefundIssued: bool("pushRefundIssued"),
      pushRideAssigned: bool("pushRideAssigned"),
      pushRideReminder: bool("pushRideReminder"),
      pushTripUpdated: bool("pushTripUpdated"),
    },
  });

  revalidatePath("/admin/settings/notifications");
  revalidatePath("/driver-dashboard/settings");

  return { success: true as const };
}

// ─── Remove all push subscriptions for current user ─────────────────────────
export async function removeAllMyPushSubscriptions() {
  const session = await auth();
  const actorId = getActorId(session);
  if (!actorId) return { error: "Unauthorized" as const };

  await db.pushSubscription.deleteMany({ where: { userId: actorId } });

  return { success: true as const };
}
