/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import {
  DEFAULT_EMAIL_EVENTS,
  DEFAULT_SMS_EVENTS,
} from "@/lib/notifications/events";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getActorId(session: any) {
  return (
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined)
  );
}

function getSessionRoles(session: any): AppRole[] {
  const roles = session?.user?.roles;
  return Array.isArray(roles) && roles.length > 0 ? (roles as AppRole[]) : [];
}

async function requireAdmin() {
  const session = await auth();
  const roles = getSessionRoles(session);
  const actorId = getActorId(session);

  if (!session?.user || !actorId || !roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }
  return { session, actorId, roles };
}

export async function getMyAdminNotificationSettings() {
  const { actorId } = await requireAdmin();

  const row = await db.adminNotificationSettings.findUnique({
    where: { userId: actorId },
  });

  // Provide sensible defaults for UI even if row doesn't exist yet
  return {
    emailEnabled: row?.emailEnabled ?? true,
    smsEnabled: row?.smsEnabled ?? false,
    emailTo: row?.emailTo ?? null,
    smsTo: row?.smsTo ?? null,
    emailEvents: (row?.emailEvents as any as string[] | undefined)?.length
      ? (row?.emailEvents as any as string[])
      : DEFAULT_EMAIL_EVENTS,
    smsEvents: (row?.smsEvents as any as string[] | undefined)?.length
      ? (row?.smsEvents as any as string[])
      : DEFAULT_SMS_EVENTS,
  };
}

const SaveSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  emailTo: z.string().trim().email().optional().or(z.literal("")),
  smsTo: z.string().trim().optional().or(z.literal("")),
  emailEvents: z.array(z.string()).default([]),
  smsEvents: z.array(z.string()).default([]),
});

export async function saveMyAdminNotificationSettings(formData: FormData) {
  const { actorId } = await requireAdmin();

  const emailEnabled = formData.get("emailEnabled") === "on";
  const smsEnabled = formData.get("smsEnabled") === "on";

  const emailTo = String(formData.get("emailTo") ?? "").trim();
  const smsTo = String(formData.get("smsTo") ?? "").trim();

  const emailEvents = formData.getAll("emailEvents").map(String);
  const smsEvents = formData.getAll("smsEvents").map(String);

  const parsed = SaveSchema.safeParse({
    emailEnabled,
    smsEnabled,
    emailTo,
    smsTo,
    emailEvents,
    smsEvents,
  });

  if (!parsed.success) {
    return {
      error:
        "Invalid settings. Check email/phone format and try again." as const,
    };
  }

  const d = parsed.data;

  await db.adminNotificationSettings.upsert({
    where: { userId: actorId },
    update: {
      emailEnabled: d.emailEnabled,
      smsEnabled: d.smsEnabled,
      emailTo: d.emailTo ? d.emailTo.trim().toLowerCase() : null,
      smsTo: d.smsTo ? d.smsTo.trim() : null,
      emailEvents: d.emailEvents as any,
      smsEvents: d.smsEvents as any,
    },
    create: {
      userId: actorId,
      emailEnabled: d.emailEnabled,
      smsEnabled: d.smsEnabled,
      emailTo: d.emailTo ? d.emailTo.trim().toLowerCase() : null,
      smsTo: d.smsTo ? d.smsTo.trim() : null,
      emailEvents: d.emailEvents as any,
      smsEvents: d.smsEvents as any,
    },
  });

  return { success: true as const };
}
