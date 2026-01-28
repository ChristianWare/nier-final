"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";

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

// Default values shown when no settings exist yet
const DEFAULTS = {
  dispatchPhone: "(480) 555-0123",
  dispatchPhoneRaw: "4805550123",
  emergencyPhone: "(480) 555-0911",
  emergencyPhoneRaw: "4805550911",
  supportEmail: "support@yourcompany.com",
  officeName: "Main Office",
  officeAddress: "123 Main Street",
  officeCity: "Phoenix, AZ 85001",
  officeHoursMon: "8:00 AM - 6:00 PM",
  officeHoursSat: "9:00 AM - 2:00 PM",
  officeHoursSun: "Closed",
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
  officeHoursMon: string;
  officeHoursSat: string;
  officeHoursSun: string;
};

/**
 * Get company settings - accessible by anyone (drivers need this for support page)
 */
export async function getCompanySettings(): Promise<CompanySettingsData> {
  const row = await db.companySettings.findUnique({
    where: { id: "default" },
  });

  return {
    dispatchPhone: row?.dispatchPhone ?? DEFAULTS.dispatchPhone,
    dispatchPhoneRaw: row?.dispatchPhoneRaw ?? DEFAULTS.dispatchPhoneRaw,
    emergencyPhone: row?.emergencyPhone ?? DEFAULTS.emergencyPhone,
    emergencyPhoneRaw: row?.emergencyPhoneRaw ?? DEFAULTS.emergencyPhoneRaw,
    supportEmail: row?.supportEmail ?? DEFAULTS.supportEmail,
    officeName: row?.officeName ?? DEFAULTS.officeName,
    officeAddress: row?.officeAddress ?? DEFAULTS.officeAddress,
    officeCity: row?.officeCity ?? DEFAULTS.officeCity,
    officeHoursMon: row?.officeHoursMon ?? DEFAULTS.officeHoursMon,
    officeHoursSat: row?.officeHoursSat ?? DEFAULTS.officeHoursSat,
    officeHoursSun: row?.officeHoursSun ?? DEFAULTS.officeHoursSun,
  };
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
  officeName: z.string().trim().min(1, "Office name is required"),
  officeAddress: z.string().trim().min(1, "Office address is required"),
  officeCity: z.string().trim().min(1, "Office city is required"),
  officeHoursMon: z.string().trim(),
  officeHoursSat: z.string().trim(),
  officeHoursSun: z.string().trim(),
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
    officeHoursMon: String(formData.get("officeHoursMon") ?? "").trim(),
    officeHoursSat: String(formData.get("officeHoursSat") ?? "").trim(),
    officeHoursSun: String(formData.get("officeHoursSun") ?? "").trim(),
  };

  const parsed = SaveSchema.safeParse(data);

  if (!parsed.success) {
const firstError = parsed.error.issues[0]?.message ?? "Invalid settings";    return { error: firstError };
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
      officeName: d.officeName,
      officeAddress: d.officeAddress,
      officeCity: d.officeCity,
      officeHoursMon: d.officeHoursMon,
      officeHoursSat: d.officeHoursSat,
      officeHoursSun: d.officeHoursSun,
      updatedBy: actorId,
    },
    create: {
      id: "default",
      dispatchPhone: d.dispatchPhone,
      dispatchPhoneRaw: d.dispatchPhoneRaw,
      emergencyPhone: d.emergencyPhone,
      emergencyPhoneRaw: d.emergencyPhoneRaw,
      supportEmail: d.supportEmail.toLowerCase(),
      officeName: d.officeName,
      officeAddress: d.officeAddress,
      officeCity: d.officeCity,
      officeHoursMon: d.officeHoursMon,
      officeHoursSat: d.officeHoursSat,
      officeHoursSun: d.officeHoursSun,
      updatedBy: actorId,
    },
  });

  return { success: true };
}
