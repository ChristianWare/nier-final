// actions/driver/notificationSettings.ts
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

export async function getMyDriverNotificationSettings() {
  const session = await auth();
  const actorId = getActorId(session);
  const roles = getSessionRoles(session);

  if (!actorId) throw new Error("Unauthorized");

  const isDriver = roles.includes("DRIVER");
  const isAdmin = roles.includes("ADMIN");
  if (!isDriver && !isAdmin) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: actorId },
    select: { email: true },
  });

  const settings = await db.driverNotificationSettings.findUnique({
    where: { userId: actorId },
  });

  return {
    emailEnabled: settings?.emailEnabled ?? true,
    emailTo: settings?.emailTo ?? user?.email ?? "",
    emailRideAssigned: settings?.emailRideAssigned ?? true,
    emailRideReminder: settings?.emailRideReminder ?? true,
    emailTripUpdated: settings?.emailTripUpdated ?? true,
    emailTripCancelled: settings?.emailTripCancelled ?? true,
  };
}

export async function saveMyDriverNotificationSettings(formData: FormData) {
  const session = await auth();
  const actorId = getActorId(session);
  const roles = getSessionRoles(session);

  if (!actorId) return { error: "Unauthorized" as const };

  const isDriver = roles.includes("DRIVER");
  const isAdmin = roles.includes("ADMIN");
  if (!isDriver && !isAdmin) return { error: "Unauthorized" as const };

  const bool = (key: string) => formData.get(key) === "on";
  const emailTo = (formData.get("emailTo") as string | null)?.trim() || null;

  await db.driverNotificationSettings.upsert({
    where: { userId: actorId },
    update: {
      emailEnabled: bool("emailEnabled"),
      emailTo,
      emailRideAssigned: bool("emailRideAssigned"),
      emailRideReminder: bool("emailRideReminder"),
      emailTripUpdated: bool("emailTripUpdated"),
      emailTripCancelled: bool("emailTripCancelled"),
    },
    create: {
      userId: actorId,
      emailEnabled: bool("emailEnabled"),
      emailTo,
      emailRideAssigned: bool("emailRideAssigned"),
      emailRideReminder: bool("emailRideReminder"),
      emailTripUpdated: bool("emailTripUpdated"),
      emailTripCancelled: bool("emailTripCancelled"),
    },
  });

  revalidatePath("/driver-dashboard/notifications");

  return { success: true as const };
}
