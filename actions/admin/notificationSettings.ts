/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { DEFAULT_EMAIL_EVENTS } from "@/lib/notifications/events";
import { SMS_CARRIERS, toTenDigits } from "@/lib/sms/carriers";

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

  return {
    emailEnabled: row?.emailEnabled ?? true,
    // Text alerts are opt-in per admin — never defaulted on.
    smsEnabled: row?.smsEnabled ?? false,
    emailTo: row?.emailTo ?? null,
    smsTo: row?.smsTo ?? null,
    smsCarrier: row?.smsCarrier ?? null,
    emailEvents: (row?.emailEvents as any as string[] | undefined)?.length
      ? (row?.emailEvents as any as string[])
      : DEFAULT_EMAIL_EVENTS,
    smsEvents: (row?.smsEvents as any as string[] | undefined) ?? [],
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   EMAIL EVENT TOGGLES
   Unchanged behaviour, except it no longer stomps the SMS columns.
   ───────────────────────────────────────────────────────────────────────── */

const SaveSchema = z.object({
  emailEnabled: z.boolean(),
  emailTo: z.string().trim().email().optional().or(z.literal("")),
  emailEvents: z.array(z.string()).default([]),
});

export async function saveMyAdminNotificationSettings(formData: FormData) {
  const { actorId } = await requireAdmin();

  // emailEnabled is not in the form currently (channel toggle is hidden)
  // default to true so email always sends
  const emailEnabled = true;
  const emailTo = String(formData.get("emailTo") ?? "").trim();
  const emailEvents = formData.getAll("emailEvents").map(String);

  const parsed = SaveSchema.safeParse({
    emailEnabled,
    emailTo,
    emailEvents,
  });

  if (!parsed.success) {
    return {
      error: "Invalid settings. Check email format and try again." as const,
    };
  }

  const d = parsed.data;

  await db.adminNotificationSettings.upsert({
    where: { userId: actorId },
    update: {
      emailEnabled: d.emailEnabled,
      emailTo: d.emailTo ? d.emailTo.trim().toLowerCase() : null,
      emailEvents: d.emailEvents as any,
    },
    create: {
      userId: actorId,
      emailEnabled: d.emailEnabled,
      emailTo: d.emailTo ? d.emailTo.trim().toLowerCase() : null,
      emailEvents: d.emailEvents as any,
      // SMS stays off until the admin opts in via the Text alerts form.
      smsEnabled: false,
      smsTo: null,
      smsCarrier: null,
      smsEvents: [] as any,
    },
  });

  return { success: true as const };
}

/* ─────────────────────────────────────────────────────────────────────────
   TEXT ALERTS (email-to-SMS gateway)
   ───────────────────────────────────────────────────────────────────────── */

const CARRIER_VALUES = SMS_CARRIERS.map((c) => c.value);

export async function saveMyAdminTextAlertSettings(formData: FormData) {
  const { actorId } = await requireAdmin();

  const smsEnabled = String(formData.get("smsEnabled") ?? "") === "true";
  const rawPhone = String(formData.get("smsTo") ?? "").trim();
  const carrier = String(formData.get("smsCarrier") ?? "").trim();
  const smsEvents = formData.getAll("smsEvents").map(String);

  // Turning it off: clear the switch, keep the number/carrier on file so
  // re-enabling doesn't mean re-typing it.
  if (!smsEnabled) {
    await db.adminNotificationSettings.upsert({
      where: { userId: actorId },
      update: { smsEnabled: false },
      create: {
        userId: actorId,
        emailEnabled: true,
        emailEvents: DEFAULT_EMAIL_EVENTS as any,
        smsEnabled: false,
        smsTo: rawPhone ? rawPhone : null,
        smsCarrier: carrier || null,
        smsEvents: smsEvents as any,
      },
    });
    return { success: true as const };
  }

  // Turning it on: phone + carrier are both required, or texts silently
  // never fire — which is the exact failure mode we're trying to avoid.
  const tenDigits = toTenDigits(rawPhone);
  if (!tenDigits) {
    return {
      error: "Enter a valid 10-digit US mobile number." as const,
    };
  }
  if (!CARRIER_VALUES.includes(carrier)) {
    return { error: "Select your mobile carrier." as const };
  }
  if (smsEvents.length === 0) {
    return {
      error: "Pick at least one event to be texted about." as const,
    };
  }

  await db.adminNotificationSettings.upsert({
    where: { userId: actorId },
    update: {
      smsEnabled: true,
      smsTo: tenDigits,
      smsCarrier: carrier,
      smsEvents: smsEvents as any,
    },
    create: {
      userId: actorId,
      emailEnabled: true,
      emailEvents: DEFAULT_EMAIL_EVENTS as any,
      smsEnabled: true,
      smsTo: tenDigits,
      smsCarrier: carrier,
      smsEvents: smsEvents as any,
    },
  });

  return { success: true as const };
}
