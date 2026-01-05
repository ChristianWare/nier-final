import type { ServicePricingStrategy } from "@prisma/client";

type PricingInputs = {
  pricingStrategy: ServicePricingStrategy;

  // route
  distanceMiles?: number | null;
  durationMinutes?: number | null;

  // hourly
  hoursRequested?: number | null;
  vehicleMinHours?: number | null;

  // service knobs (cents)
  serviceMinFareCents: number;
  serviceBaseFeeCents: number;
  servicePerMileCents: number;
  servicePerMinuteCents: number;
  servicePerHourCents: number;

  // vehicle knobs (cents) (optional: allows “vehicle-specific pricing”)
  vehicleBaseFareCents?: number | null;
  vehiclePerMileCents?: number | null;
  vehiclePerMinuteCents?: number | null;
  vehiclePerHourCents?: number | null;
};

export function calcQuoteCents(input: PricingInputs) {
  const strategy = input.pricingStrategy;

  const distanceMiles = Math.max(0, Number(input.distanceMiles ?? 0));
  const durationMinutes = Math.max(0, Number(input.durationMinutes ?? 0));

  const serviceMin = input.serviceMinFareCents ?? 0;

  // Prefer vehicle rates if set (>0), else fall back to service rates.
  const base =
    (input.vehicleBaseFareCents ?? 0) > 0
      ? (input.vehicleBaseFareCents ?? 0)
      : input.serviceBaseFeeCents;

  const perMile =
    (input.vehiclePerMileCents ?? 0) > 0
      ? (input.vehiclePerMileCents ?? 0)
      : input.servicePerMileCents;

  const perMinute =
    (input.vehiclePerMinuteCents ?? 0) > 0
      ? (input.vehiclePerMinuteCents ?? 0)
      : input.servicePerMinuteCents;

  const perHour =
    (input.vehiclePerHourCents ?? 0) > 0
      ? (input.vehiclePerHourCents ?? 0)
      : input.servicePerHourCents;

  if (strategy === "HOURLY") {
    const requested = Math.max(
      0,
      Math.floor(Number(input.hoursRequested ?? 0))
    );
    const minHours = Math.max(
      0,
      Math.floor(Number(input.vehicleMinHours ?? 0))
    );
    const billedHours = Math.max(requested, minHours);

    const raw = base + billedHours * perHour;
    const subtotalCents = Math.max(serviceMin, raw);

    return {
      subtotalCents,
      totalCents: subtotalCents, // phase 1: no taxes/fees yet
      billedHours,
      requestedHours: requested,
    };
  }

  // POINT_TO_POINT or FLAT (we’ll treat FLAT like point-to-point unless you want separate flat logic)
  const raw =
    base +
    Math.round(distanceMiles * perMile) +
    Math.round(durationMinutes * perMinute);
  const subtotalCents = Math.max(serviceMin, raw);

  return {
    subtotalCents,
    totalCents: subtotalCents,
    billedHours: null,
    requestedHours: null,
  };
}
