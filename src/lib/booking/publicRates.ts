// src/lib/booking/publicRates.ts
//
// Website prices for the fleet and charter pages, read from the same rates
// the booking tool uses (Admin → Vehicle Categories and Admin → Services).
// Change a rate in the admin and these pages follow, so the website can't
// advertise a different price than the booking tool quotes.
//
// A vehicle category shows up here once its "Website fleet page" is set in
// Admin → Vehicle Categories. Partner vehicles (We-Ko-Pa, Denū) are never
// included: this reads PUBLIC_VEHICLE_WHERE, same as the public booking tool.

import "server-only";
import { db } from "@/lib/db";
import { calcQuoteCents } from "@/lib/pricing/calcQuote";
import { PUBLIC_VEHICLE_WHERE } from "@/lib/booking/partnerVehicles";
import { classifyServices, HOURLY_MIN_HOURS } from "@/lib/booking/rules";

export type FleetRates = {
  /** Per-hour rate on an hourly booking (service + vehicle rate). */
  hourlyRateCents: number | null;
  /** Hours an hourly booking bills at least. */
  hourlyMinHours: number;
  /** Lowest hourly booking total: the minimum hours, with fees. */
  hourlyMinimumCents: number | null;
  /** Lowest one-way fare (the vehicle's minimum fare, with fees). */
  oneWayFromCents: number | null;
  /** Lowest airport transfer fare (with the airport service's fees). */
  airportFromCents: number | null;
  callForPricing: boolean;
  callForPricingMessage: string | null;
};

type Svc = {
  id: string;
  pricingStrategy: "POINT_TO_POINT" | "HOURLY" | "FLAT";
  airportLeg: "NONE" | "PICKUP" | "DROPOFF";
  active: boolean;
  sortOrder: number;
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  minHours: number;
  fees: { label: string; amountCents: number }[];
};

type Veh = {
  fleetSlug: string | null;
  minHours: number;
  baseFareCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  callForPricing: boolean;
  callForPricingMessage: string | null;
};

function quote(svc: Svc, v: Veh, hours: number | null): number | null {
  const res = calcQuoteCents({
    pricingStrategy: svc.pricingStrategy,
    // Zero miles: the lowest fare the trip can cost (the minimum fare).
    distanceMiles: svc.pricingStrategy === "POINT_TO_POINT" ? 0 : null,
    durationMinutes: svc.pricingStrategy === "POINT_TO_POINT" ? 0 : null,
    hoursRequested: svc.pricingStrategy === "HOURLY" ? hours : null,
    stopCount: 0,
    fees: svc.fees,
    vehicleMinHours: v.minHours ?? 0,
    serviceMinHours: svc.minHours ?? 0,
    serviceMinFareCents: svc.minFareCents,
    serviceBaseFeeCents: svc.baseFeeCents,
    servicePerMileCents: svc.perMileCents,
    servicePerMinuteCents: svc.perMinuteCents,
    servicePerHourCents: svc.perHourCents,
    vehicleBaseFareCents: v.baseFareCents ?? 0,
    vehiclePerMileCents: v.perMileCents ?? 0,
    vehiclePerMinuteCents: v.perMinuteCents ?? 0,
    vehiclePerHourCents: v.perHourCents ?? 0,
  });
  return res.totalCents > 0 ? res.totalCents : null;
}

function minOf(a: number | null, b: number | null) {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

function ratesFor(v: Veh, c: ReturnType<typeof classifyServices<Svc>>) {
  const hourlyMinHours = Math.max(
    HOURLY_MIN_HOURS,
    v.minHours ?? 0,
    c.hourly?.minHours ?? 0,
  );
  const hourlyRate = c.hourly ? c.hourly.perHourCents + v.perHourCents : 0;
  const airportA = c.airportPickup ? quote(c.airportPickup, v, null) : null;
  const airportB = c.airportDropoff ? quote(c.airportDropoff, v, null) : null;
  return {
    hourlyRateCents: hourlyRate > 0 ? hourlyRate : null,
    hourlyMinHours,
    hourlyMinimumCents: c.hourly ? quote(c.hourly, v, hourlyMinHours) : null,
    oneWayFromCents: c.oneWay ? quote(c.oneWay, v, null) : null,
    airportFromCents: minOf(airportA, airportB),
    callForPricing: v.callForPricing,
    callForPricingMessage: v.callForPricingMessage,
  } satisfies FleetRates;
}

/**
 * Rates for every fleet page that has a vehicle category linked to it, keyed
 * by fleet page slug. When two categories link to one page, the lower price
 * wins ("from"). Returns an empty map if the database can't be reached, so a
 * page still renders (without prices) instead of failing.
 */
export async function getFleetRatesBySlug(): Promise<Map<string, FleetRates>> {
  const out = new Map<string, FleetRates>();
  try {
    const [vehicles, servicesRaw] = await Promise.all([
      db.vehicle.findMany({
        where: { ...PUBLIC_VEHICLE_WHERE, fleetSlug: { not: null } },
        orderBy: { sortOrder: "asc" },
        select: {
          fleetSlug: true,
          minHours: true,
          baseFareCents: true,
          perMileCents: true,
          perMinuteCents: true,
          perHourCents: true,
          callForPricing: true,
          callForPricingMessage: true,
        },
      }),
      db.serviceType.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          pricingStrategy: true,
          airportLeg: true,
          active: true,
          sortOrder: true,
          minFareCents: true,
          baseFeeCents: true,
          perMileCents: true,
          perMinuteCents: true,
          perHourCents: true,
          minHours: true,
          fees: {
            where: { active: true },
            select: { label: true, amountCents: true },
          },
        },
      }),
    ]);

    const c = classifyServices(servicesRaw as Svc[]);

    for (const v of vehicles) {
      if (!v.fleetSlug) continue;
      const r = ratesFor(v, c);
      const prev = out.get(v.fleetSlug);
      if (!prev) {
        out.set(v.fleetSlug, r);
        continue;
      }
      // Two categories on one page: show the lower price of each kind. Only
      // "call for pricing" when every category on the page is.
      out.set(v.fleetSlug, {
        hourlyRateCents: minOf(prev.hourlyRateCents, r.hourlyRateCents),
        hourlyMinHours: Math.min(prev.hourlyMinHours, r.hourlyMinHours),
        hourlyMinimumCents: minOf(
          prev.hourlyMinimumCents,
          r.hourlyMinimumCents,
        ),
        oneWayFromCents: minOf(prev.oneWayFromCents, r.oneWayFromCents),
        airportFromCents: minOf(prev.airportFromCents, r.airportFromCents),
        callForPricing: prev.callForPricing && r.callForPricing,
        callForPricingMessage:
          prev.callForPricingMessage ?? r.callForPricingMessage,
      });
    }
  } catch (e) {
    console.error("[publicRates] could not load fleet rates:", e);
  }
  return out;
}

export async function getFleetRates(slug: string): Promise<FleetRates | null> {
  const all = await getFleetRatesBySlug();
  return all.get(slug) ?? null;
}
