"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

// Default hours structure
const DEFAULT_HOURS = {
  monday: { enabled: true, open: "08:00", close: "18:00" },
  tuesday: { enabled: true, open: "08:00", close: "18:00" },
  wednesday: { enabled: true, open: "08:00", close: "18:00" },
  thursday: { enabled: true, open: "08:00", close: "18:00" },
  friday: { enabled: true, open: "08:00", close: "18:00" },
  saturday: { enabled: true, open: "09:00", close: "14:00" },
  sunday: { enabled: false, open: "09:00", close: "17:00" },
};

// Default values shown when no settings exist yet
const DEFAULTS = {
  dispatchPhone: "(480) 555-0123",
  dispatchPhoneRaw: "4805550123",
  emergencyPhone: "(480) 555-0911",
  emergencyPhoneRaw: "4805550911",
  supportEmail: "support@yourcompany.com",
  officeName: "",
  officeAddress: "",
  officeCity: "",
  officeHours: JSON.stringify(DEFAULT_HOURS),
  smsFromNumber: "", // Will fall back to env if empty
};

export type DayHours = {
  enabled: boolean;
  open: string;
  close: string;
};

export type WeekHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

export type CompanySettingsData = {
  dispatchPhone: string;
  dispatchPhoneRaw: string;
  emergencyPhone: string;
  emergencyPhoneRaw: string;
  supportEmail: string;
  officeName: string;
  officeAddress: string;
  officeCity: string;
  officeHours: string;
  officeHoursParsed: WeekHours;
  smsFromNumber: string;
};

/**
 * Get company settings - accessible by anyone (drivers need this for support page)
 */
export async function getCompanySettings(): Promise<CompanySettingsData> {
  const row = await db.companySettings.findUnique({
    where: { id: "default" },
  });

  const officeHours = row?.officeHours ?? DEFAULTS.officeHours;
  let officeHoursParsed: WeekHours;

  try {
    officeHoursParsed = JSON.parse(officeHours);
  } catch {
    officeHoursParsed = DEFAULT_HOURS;
  }

  return {
    dispatchPhone: row?.dispatchPhone ?? DEFAULTS.dispatchPhone,
    dispatchPhoneRaw: row?.dispatchPhoneRaw ?? DEFAULTS.dispatchPhoneRaw,
    emergencyPhone: row?.emergencyPhone ?? DEFAULTS.emergencyPhone,
    emergencyPhoneRaw: row?.emergencyPhoneRaw ?? DEFAULTS.emergencyPhoneRaw,
    supportEmail: row?.supportEmail ?? DEFAULTS.supportEmail,
    officeName: row?.officeName ?? DEFAULTS.officeName,
    officeAddress: row?.officeAddress ?? DEFAULTS.officeAddress,
    officeCity: row?.officeCity ?? DEFAULTS.officeCity,
    officeHours,
    officeHoursParsed,
    smsFromNumber: row?.smsFromNumber ?? DEFAULTS.smsFromNumber,
  };
}

/**
 * Get SMS from number for notifications
 * Returns the client's configured number, or falls back to env default
 */
export async function getSmsFromNumber(): Promise<string | null> {
  const row = await db.companySettings.findUnique({
    where: { id: "default" },
    select: { smsFromNumber: true },
  });

  // Return client's number if set, otherwise return null (caller will use env default)
  return row?.smsFromNumber?.trim() || null;
}

const SaveSchema = z.object({
  dispatchPhone: z.string().trim().min(1, "Dispatch phone is required"),
  dispatchPhoneRaw: z
    .string()
    .trim()
    .min(1, "Dispatch phone (raw) is required"),
  emergencyPhone: z.string().trim().min(1, "Emergency phone is required"),
  emergencyPhoneRaw: z
    .string()
    .trim()
    .min(1, "Emergency phone (raw) is required"),
  supportEmail: z.string().trim().email("Invalid email format"),
  officeName: z.string().trim().optional(),
  officeAddress: z.string().trim().optional(),
  officeCity: z.string().trim().optional(),
  officeHours: z.string().trim(),
  smsFromNumber: z.string().trim().optional(),
});

/**
 * Save company settings - admin only
 */
export async function saveCompanySettings(formData: FormData) {
  const { actorId } = await requireAdmin();

  const data = {
    dispatchPhone: String(formData.get("dispatchPhone") ?? "").trim(),
    dispatchPhoneRaw: String(formData.get("dispatchPhoneRaw") ?? "").trim(),
    emergencyPhone: String(formData.get("emergencyPhone") ?? "").trim(),
    emergencyPhoneRaw: String(formData.get("emergencyPhoneRaw") ?? "").trim(),
    supportEmail: String(formData.get("supportEmail") ?? "").trim(),
    officeName: String(formData.get("officeName") ?? "").trim(),
    officeAddress: String(formData.get("officeAddress") ?? "").trim(),
    officeCity: String(formData.get("officeCity") ?? "").trim(),
    officeHours:
      String(formData.get("officeHours") ?? "").trim() ||
      JSON.stringify(DEFAULT_HOURS),
    smsFromNumber: String(formData.get("smsFromNumber") ?? "").trim(),
  };

  const parsed = SaveSchema.safeParse(data);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid settings";
    return { error: firstError };
  }

  const d = parsed.data;

  await db.companySettings.upsert({
    where: { id: "default" },
    update: {
      dispatchPhone: d.dispatchPhone,
      dispatchPhoneRaw: d.dispatchPhoneRaw,
      emergencyPhone: d.emergencyPhone,
      emergencyPhoneRaw: d.emergencyPhoneRaw,
      supportEmail: d.supportEmail.toLowerCase(),
      officeName: d.officeName || null,
      officeAddress: d.officeAddress || null,
      officeCity: d.officeCity || null,
      officeHours: d.officeHours,
      smsFromNumber: d.smsFromNumber || null,
      updatedBy: actorId,
    },
    create: {
      id: "default",
      dispatchPhone: d.dispatchPhone,
      dispatchPhoneRaw: d.dispatchPhoneRaw,
      emergencyPhone: d.emergencyPhone,
      emergencyPhoneRaw: d.emergencyPhoneRaw,
      supportEmail: d.supportEmail.toLowerCase(),
      officeName: d.officeName || null,
      officeAddress: d.officeAddress || null,
      officeCity: d.officeCity || null,
      officeHours: d.officeHours,
      smsFromNumber: d.smsFromNumber || null,
      updatedBy: actorId,
    },
  });

  revalidatePath("/driver-dashboard/support");

  return { success: true };
}
