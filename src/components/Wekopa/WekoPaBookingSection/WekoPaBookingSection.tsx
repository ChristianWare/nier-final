/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { auth } from "../../../../auth";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import WekoPaBookingWizard from "@/components/Wekopa/WekoPaBookingWizard/WekoPaBookingWizard";
import LayoutWrapper from "@/components/shared/LayoutWrapper";

const TIMEZONE_SHORT_LABELS: Record<string, string> = {
  "America/Phoenix": "Phoenix, AZ (MST)",
  "America/New_York": "Eastern (ET)",
  "America/Chicago": "Central (CT)",
  "America/Denver": "Mountain (MT)",
  "America/Los_Angeles": "Pacific (PT)",
  "America/Anchorage": "Alaska (AKT)",
  "Pacific/Honolulu": "Hawaii (HST)",
};

const SERVICE_SLUG = "airport-pickups";
const VEHICLE_NAMES = ["WeKoPa SUV", "WeKoPa Van"];
// WeKoPa SUV capacity = 7, Van capacity = 14
const SUV_MAX_CAPACITY = 7;

export default async function WekoPaBookingSection() {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const session = await auth();
  const userId = (session?.user as { id?: string } | null)?.id ?? null;

  let userPhone: string | null = null;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    userPhone = user?.phone ?? null;
  }

  // ─── Company settings ────────────────────────────────────────────────────
  const companySettings = await getCompanySettings();
  const companyTimezoneLabel =
    TIMEZONE_SHORT_LABELS[companySettings.timezone] ?? companySettings.timezone;

  // ─── Service type ────────────────────────────────────────────────────────
  const serviceTypeRaw = await db.serviceType.findFirst({
    where: { slug: SERVICE_SLUG, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      pricingStrategy: true,
      minFareCents: true,
      baseFeeCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,
      minHours: true,
      active: true,
      sortOrder: true,
      airportLeg: true,
      airports: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          iata: true,
          address: true,
          placeId: true,
          lat: true,
          lng: true,
        },
      },
      fees: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, amountCents: true },
      },
    },
  });

  // ─── Vehicles ────────────────────────────────────────────────────────────
  const vehiclesRaw = await db.vehicle.findMany({
    where: { name: { in: VEHICLE_NAMES } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      luggageCapacity: true,
      imageUrl: true,
      minHours: true,
      baseFareCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,
      active: true,
      sortOrder: true,
      callForPricing: true,
      callForPricingMessage: true,
    },
  });

  const suvVehicle = vehiclesRaw.find((v) => v.capacity <= SUV_MAX_CAPACITY);
  const vanVehicle = vehiclesRaw.find((v) => v.capacity > SUV_MAX_CAPACITY);

  // ─── Fallback if misconfigured ────────────────────────────────────────────
  if (!serviceTypeRaw || !suvVehicle || !vanVehicle) {
    return (
      <section
        id='wekopa-booking'
        style={{
          background: "var(--cream)",
          padding: "8rem 0",
          textAlign: "center",
        }}
      >
        <LayoutWrapper>
          <p style={{ fontSize: "1.6rem", color: "var(--paragraph)" }}>
            Online booking is temporarily unavailable. Please call us to reserve
            your We-Ko-Pa transfer:{" "}
            <a
              href='tel:+14803004885'
              style={{ color: "var(--accent)", fontWeight: 700 }}
            >
              (480) 300-4885
            </a>
          </p>
        </LayoutWrapper>
      </section>
    );
  }

  const serviceType = {
    ...serviceTypeRaw,
    airports: (serviceTypeRaw.airports ?? []).map((a) => ({
      ...a,
      lat: a.lat == null ? null : Number(a.lat),
      lng: a.lng == null ? null : Number(a.lng),
    })),
    fees: serviceTypeRaw.fees ?? [],
  };

  return (
    <DirtyFormProvider>
      <WekoPaBookingWizard
        serviceType={serviceType as any}
        suvVehicle={suvVehicle as any}
        vanVehicle={vanVehicle as any}
        userPhone={userPhone}
        companyTimezone={companySettings.timezone}
        companyTimezoneLabel={companyTimezoneLabel}
      />
    </DirtyFormProvider>
  );
}
