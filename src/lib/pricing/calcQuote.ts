/**
 * Pricing calculation for booking quotes
 * Location: lib/pricing/calcQuote.ts
 */

import { ServicePricingStrategy } from "@prisma/client";

export interface CalcQuoteInput {
  pricingStrategy: ServicePricingStrategy;

  // Trip details
  distanceMiles: number | null;
  durationMinutes: number | null;
  hoursRequested: number | null;

  // Vehicle constraints
  vehicleMinHours: number;

  // Service pricing (in cents)
  serviceMinFareCents: number;
  serviceBaseFeeCents: number;
  servicePerMileCents: number;
  servicePerMinuteCents: number;
  servicePerHourCents: number;

  // Vehicle pricing (in cents) - these ADD to service pricing
  vehicleBaseFareCents: number;
  vehiclePerMileCents: number;
  vehiclePerMinuteCents: number;
  vehiclePerHourCents: number;
}

export interface CalcQuoteResult {
  totalCents: number;
  breakdown: {
    baseChargeCents: number;
    distanceChargeCents: number;
    timeChargeCents: number;
    subtotalCents: number;
    minFareCents: number;
    minFareApplied: boolean;
  };
}

/**
 * Calculate quote for a booking
 *
 * ✅ CRITICAL FIX: This properly applies minimum fare AFTER calculating base + distance/time charges
 */
export function calcQuoteCents(input: CalcQuoteInput): CalcQuoteResult {
  const {
    pricingStrategy,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    vehicleMinHours,
    serviceMinFareCents,
    serviceBaseFeeCents,
    servicePerMileCents,
    servicePerMinuteCents,
    servicePerHourCents,
    vehicleBaseFareCents,
    vehiclePerMileCents,
    vehiclePerMinuteCents,
    vehiclePerHourCents,
  } = input;

  // Combine service + vehicle pricing
  const minFareCents = serviceMinFareCents;
  const baseFeeCents = serviceBaseFeeCents + vehicleBaseFareCents;
  const perMileCents = servicePerMileCents + vehiclePerMileCents;
  const perMinuteCents = servicePerMinuteCents + vehiclePerMinuteCents;
  const perHourCents = servicePerHourCents + vehiclePerHourCents;

  let baseCharge = 0;
  let distanceCharge = 0;
  let timeCharge = 0;

  switch (pricingStrategy) {
    case ServicePricingStrategy.POINT_TO_POINT: {
      // Base fee + (distance × per mile rate) + (time × per minute rate)
      baseCharge = baseFeeCents;

      if (distanceMiles != null && distanceMiles > 0) {
        distanceCharge = Math.round(distanceMiles * perMileCents);
      }

      if (durationMinutes != null && durationMinutes > 0) {
        timeCharge = Math.round(durationMinutes * perMinuteCents);
      }

      break;
    }

    case ServicePricingStrategy.HOURLY: {
      // Base fee + (billable hours × per hour rate)
      baseCharge = baseFeeCents;

      const requestedHours = hoursRequested ?? 0;
      const minHours = vehicleMinHours ?? 0;
      const billableHours = Math.max(
        Math.ceil(requestedHours),
        Math.ceil(minHours),
      );

      if (billableHours > 0) {
        timeCharge = Math.round(billableHours * perHourCents);
      }

      break;
    }

    case ServicePricingStrategy.FLAT: {
      // Just the base fee (flat rate)
      baseCharge = baseFeeCents;
      break;
    }
  }

  // Calculate subtotal: base + distance + time
  let subtotalCents = baseCharge + distanceCharge + timeCharge;

  // ✅ CRITICAL: Apply minimum fare if calculated amount is less than minimum
  // This is the key fix - min fare is applied AFTER calculating base + distance/time
  let minFareApplied = false;
  if (subtotalCents < minFareCents) {
    subtotalCents = minFareCents;
    minFareApplied = true;
  }

  return {
    totalCents: subtotalCents,
    breakdown: {
      baseChargeCents: baseCharge,
      distanceChargeCents: distanceCharge,
      timeChargeCents: timeCharge,
      subtotalCents,
      minFareCents,
      minFareApplied,
    },
  };
}

/**
 * Format cents as dollar string
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
