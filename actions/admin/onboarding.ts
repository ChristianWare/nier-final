"use server";

import { db } from "@/lib/db";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

export type OnboardingStep = {
  key: string;
  label: string;
  description: string;
  complete: boolean;
  path: string;
};

export type OnboardingStatus = {
  steps: OnboardingStep[];
  allComplete: boolean;
  completedCount: number;
  totalCount: number;
};

/* ─────────────────────────────────────────────
   Derive onboarding status from existing data
   — no extra tables needed
   ───────────────────────────────────────────── */

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const [
    settings,
    activeServiceCount,
    activeVehicleCount,
    airportServiceCount,
    activeAirportCount,
  ] = await Promise.all([
    db.companySettings.findUnique({
      where: { id: "default" },
      select: {
        companyName: true,
        logoUrl: true,
        dispatchPhone: true,
        supportEmail: true,
        timezone: true,
        emailSenderName: true,
        emailReplyTo: true,
        stripeSecretKeyEncrypted: true,
        stripePublishableKey: true,
      },
    }),
    db.serviceType.count({ where: { active: true } }),
    db.vehicle.count({ where: { active: true } }),
    db.serviceType.count({
      where: { active: true, airportLeg: { not: "NONE" } },
    }),
    db.airport.count({ where: { active: true } }),
  ]);

  // ── Individual checks ──

  const hasCompanyName = !!settings?.companyName?.trim();

  const hasContactInfo =
    !!settings?.dispatchPhone?.trim() && !!settings?.supportEmail?.trim();

  const hasTimezone = !!settings?.timezone?.trim();

  const hasService = activeServiceCount > 0;

  const hasVehicle = activeVehicleCount > 0;

  // Airport step is conditional — only required if they have airport services
  const airportRequired = airportServiceCount > 0;
  const hasAirport = !airportRequired || activeAirportCount > 0;

  // Stripe: check DB keys first, fall back to env
  const hasStripe =
    !!settings?.stripeSecretKeyEncrypted ||
    !!settings?.stripePublishableKey ||
    !!process.env.STRIPE_SECRET_KEY;

  const hasEmail =
    !!settings?.emailSenderName?.trim() && !!settings?.emailReplyTo?.trim();

  // ── Build steps array ──

  const steps: OnboardingStep[] = [
    {
      key: "company",
      label: "Company Name",
      description:
        "Set your company name — it appears on emails, invoices, and your booking site",
      complete: hasCompanyName,
      path: "/admin/company",
    },
    {
      key: "contact",
      label: "Contact Information",
      description:
        "Add your dispatch phone and support email for customer communications",
      complete: hasContactInfo,
      path: "/admin/company",
    },
    {
      key: "timezone",
      label: "Default Timezone",
      description: "Confirm your timezone so booking times display correctly",
      complete: hasTimezone,
      path: "/admin/company",
    },
    {
      key: "service",
      label: "Create Your First Service",
      description:
        "Add at least one service type like airport pickup, hourly, or point-to-point",
      complete: hasService,
      path: "/admin/services",
    },
    {
      key: "vehicle",
      label: "Create Your First Vehicle",
      description:
        "Add a vehicle category with pricing so customers can select it during booking",
      complete: hasVehicle,
      path: "/admin/vehicles",
    },
    // Conditional: only show airport step if they have airport services
    ...(airportRequired
      ? [
          {
            key: "airport",
            label: "Add Your First Airport",
            description:
              "You have airport services — add at least one airport so customers can select it",
            complete: hasAirport,
            path: "/admin/airports",
          },
        ]
      : []),
    {
      key: "stripe",
      label: "Connect Stripe",
      description: "Add your Stripe API keys to accept online payments",
      complete: hasStripe,
      path: "/admin/earnings",
    },
    {
      key: "email",
      label: "Email Configuration",
      description:
        "Set your sender name and reply-to address for booking notifications",
      complete: hasEmail,
      path: "/admin/company",
    },
  ];

  const completedCount = steps.filter((s) => s.complete).length;
  const totalCount = steps.length;
  const allComplete = completedCount === totalCount;

  return { steps, allComplete, completedCount, totalCount };
}
