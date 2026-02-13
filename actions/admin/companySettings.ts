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
  smsFromNumber: "",
  // New defaults
  companyName: "",
  companyTagline: "",
  logoUrl: "",
  emailSenderName: "",
  emailReplyTo: "",
  emailFooterText: "",
  timezone: "America/Phoenix",
  websiteUrl: "",
  googleBusinessUrl: "",
  yelpUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  twitterUrl: "",
  linkedinUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  taxId: "",
  businessLicense: "",
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
  // Branding
  companyName: string;
  companyTagline: string;
  logoUrl: string;
  // Email
  emailSenderName: string;
  emailReplyTo: string;
  emailFooterText: string;
  // Timezone
  timezone: string;
  // Social
  websiteUrl: string;
  googleBusinessUrl: string;
  yelpUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  // Legal
  taxId: string;
  businessLicense: string;
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
    // Branding
    companyName: row?.companyName ?? DEFAULTS.companyName,
    companyTagline: row?.companyTagline ?? DEFAULTS.companyTagline,
    logoUrl: row?.logoUrl ?? DEFAULTS.logoUrl,
    // Email
    emailSenderName: row?.emailSenderName ?? DEFAULTS.emailSenderName,
    emailReplyTo: row?.emailReplyTo ?? DEFAULTS.emailReplyTo,
    emailFooterText: row?.emailFooterText ?? DEFAULTS.emailFooterText,
    // Timezone
    timezone: row?.timezone ?? DEFAULTS.timezone,
    // Social
    websiteUrl: row?.websiteUrl ?? DEFAULTS.websiteUrl,
    googleBusinessUrl: row?.googleBusinessUrl ?? DEFAULTS.googleBusinessUrl,
    yelpUrl: row?.yelpUrl ?? DEFAULTS.yelpUrl,
    instagramUrl: row?.instagramUrl ?? DEFAULTS.instagramUrl,
    facebookUrl: row?.facebookUrl ?? DEFAULTS.facebookUrl,
    twitterUrl: row?.twitterUrl ?? DEFAULTS.twitterUrl,
    linkedinUrl: row?.linkedinUrl ?? DEFAULTS.linkedinUrl,
    tiktokUrl: row?.tiktokUrl ?? DEFAULTS.tiktokUrl,
    youtubeUrl: row?.youtubeUrl ?? DEFAULTS.youtubeUrl,
    // Legal
    taxId: row?.taxId ?? DEFAULTS.taxId,
    businessLicense: row?.businessLicense ?? DEFAULTS.businessLicense,
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
  // Branding
  companyName: z.string().trim().optional(),
  companyTagline: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  // Email
  emailSenderName: z.string().trim().optional(),
  emailReplyTo: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      "Invalid reply-to email",
    ),
  emailFooterText: z.string().trim().optional(),
  // Timezone
  timezone: z.string().trim().optional(),
  // Social
  websiteUrl: z.string().trim().optional(),
  googleBusinessUrl: z.string().trim().optional(),
  yelpUrl: z.string().trim().optional(),
  instagramUrl: z.string().trim().optional(),
  facebookUrl: z.string().trim().optional(),
  twitterUrl: z.string().trim().optional(),
  linkedinUrl: z.string().trim().optional(),
  tiktokUrl: z.string().trim().optional(),
  youtubeUrl: z.string().trim().optional(),
  // Legal
  taxId: z.string().trim().optional(),
  businessLicense: z.string().trim().optional(),
});

/**
 * Save company settings - admin only
 */
export async function saveCompanySettings(formData: FormData) {
  const { actorId } = await requireAdmin();

  const str = (key: string) => String(formData.get(key) ?? "").trim();

  const data = {
    dispatchPhone: str("dispatchPhone"),
    dispatchPhoneRaw: str("dispatchPhoneRaw"),
    emergencyPhone: str("emergencyPhone"),
    emergencyPhoneRaw: str("emergencyPhoneRaw"),
    supportEmail: str("supportEmail"),
    officeName: str("officeName"),
    officeAddress: str("officeAddress"),
    officeCity: str("officeCity"),
    officeHours: str("officeHours") || JSON.stringify(DEFAULT_HOURS),
    smsFromNumber: str("smsFromNumber"),
    // Branding
    companyName: str("companyName"),
    companyTagline: str("companyTagline"),
    logoUrl: str("logoUrl"),
    // Email
    emailSenderName: str("emailSenderName"),
    emailReplyTo: str("emailReplyTo"),
    emailFooterText: str("emailFooterText"),
    // Timezone
    timezone: str("timezone"),
    // Social
    websiteUrl: str("websiteUrl"),
    googleBusinessUrl: str("googleBusinessUrl"),
    yelpUrl: str("yelpUrl"),
    instagramUrl: str("instagramUrl"),
    facebookUrl: str("facebookUrl"),
    twitterUrl: str("twitterUrl"),
    linkedinUrl: str("linkedinUrl"),
    tiktokUrl: str("tiktokUrl"),
    youtubeUrl: str("youtubeUrl"),
    // Legal
    taxId: str("taxId"),
    businessLicense: str("businessLicense"),
  };

  const parsed = SaveSchema.safeParse(data);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid settings";
    return { error: firstError };
  }

  const d = parsed.data;

  const payload = {
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
    // Branding
    companyName: d.companyName || null,
    companyTagline: d.companyTagline || null,
    logoUrl: d.logoUrl || null,
    // Email
    emailSenderName: d.emailSenderName || null,
    emailReplyTo: d.emailReplyTo?.toLowerCase() || null,
    emailFooterText: d.emailFooterText || null,
    // Timezone
    timezone: d.timezone || "America/Phoenix",
    // Social
    websiteUrl: d.websiteUrl || null,
    googleBusinessUrl: d.googleBusinessUrl || null,
    yelpUrl: d.yelpUrl || null,
    instagramUrl: d.instagramUrl || null,
    facebookUrl: d.facebookUrl || null,
    twitterUrl: d.twitterUrl || null,
    linkedinUrl: d.linkedinUrl || null,
    tiktokUrl: d.tiktokUrl || null,
    youtubeUrl: d.youtubeUrl || null,
    // Legal
    taxId: d.taxId || null,
    businessLicense: d.businessLicense || null,
    updatedBy: actorId,
  };

  await db.companySettings.upsert({
    where: { id: "default" },
    update: payload,
    create: { id: "default", ...payload },
  });

  revalidatePath("/driver-dashboard/support");
  revalidatePath("/admin/company");

  return { success: true };
}
