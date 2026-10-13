import { db } from "@/lib/db";
import { PUBLIC_VEHICLE_WHERE } from "@/lib/booking/partnerVehicles";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import type {
  WidgetServiceTypeDTO,
  WidgetVehicleDTO,
} from "@/components/HomePage/HomeBookingWidget/HomeBookingWidget";

/**
 * Everything HomeBookingWidget needs, loaded once on the server.
 * Shared by the homepage hero and the in-article RideBox on blog posts so
 * both quote from the same active services, airports, fees and vehicles.
 */

const TIMEZONE_SHORT_LABELS: Record<string, string> = {
  "America/Phoenix": "Phoenix, AZ (MST)",
  "America/New_York": "Eastern (ET)",
  "America/Chicago": "Central (CT)",
  "America/Denver": "Mountain (MT)",
  "America/Los_Angeles": "Pacific (PT)",
  "America/Anchorage": "Alaska (AKT)",
  "Pacific/Honolulu": "Hawaii (HST)",
};

export type BookingWidgetData = {
  serviceTypes: WidgetServiceTypeDTO[];
  vehicles: WidgetVehicleDTO[];
  companyTimezone: string;
  companyTimezoneLabel: string;
};

export async function getBookingWidgetData(): Promise<BookingWidgetData> {
  const companySettings = await getCompanySettings();
  const companyTimezoneLabel =
    TIMEZONE_SHORT_LABELS[companySettings.timezone] ?? companySettings.timezone;

  // ── Service types ─────────────────────────────────────────────────────────
  const serviceTypesRaw = await db.serviceType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      pricingStrategy: true,
      minFareCents: true,
      baseFeeCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,
      minHours: true,
      active: true,
      airportLeg: true,

      // ── NEW: airports for airport service dropdowns in the widget ──
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
        select: {
          id: true,
          label: true,
          amountCents: true,
        },
      },
    },
  });

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const vehicles = await db.vehicle.findMany({
    where: PUBLIC_VEHICLE_WHERE,
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      capacity: true,
      minHours: true,
      baseFareCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,
      active: true,
      callForPricing: true,
    },
  });

  // Prisma Decimals can't cross into Client Components — convert to numbers.
  const serviceTypes = serviceTypesRaw.map((s) => ({
    ...s,
    airports: s.airports.map((a) => ({
      ...a,
      lat: a.lat == null ? null : Number(a.lat),
      lng: a.lng == null ? null : Number(a.lng),
    })),
  }));

  return {
    serviceTypes: serviceTypes as unknown as WidgetServiceTypeDTO[],
    vehicles: vehicles as unknown as WidgetVehicleDTO[],
    companyTimezone: companySettings.timezone,
    companyTimezoneLabel,
  };
}
