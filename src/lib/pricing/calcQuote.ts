/**
 * Pricing calculation for booking quotes
 * Location: lib/pricing/calcQuote.ts
 *
 * ✅ UPDATED: Added support for extra stops
 */

import { ServicePricingStrategy } from "@prisma/client";

// ✅ Flat fee per extra stop (in cents)
export const EXTRA_STOP_FEE_CENTS = 1500; // $15.00 per stop

// ✅ Estimated wait time per stop (in minutes) - for display purposes
export const STOP_WAIT_TIME_MINUTES = 5;

export interface CalcQuoteInput {
  pricingStrategy: ServicePricingStrategy;

  // Trip details
  distanceMiles: number | null;
  durationMinutes: number | null;
  hoursRequested: number | null;

  // ✅ NEW: Extra stops
  stopCount?: number; // Number of extra stops (0 = direct route)

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
  requestedHours?: number;
  billedHours?: number;
  breakdown: {
    baseChargeCents: number;
    distanceChargeCents: number;
    timeChargeCents: number;
    // ✅ NEW: Stop surcharges
    stopCount: number;
    stopSurchargeCents: number;
    stopWaitTimeMinutes: number;
    subtotalCents: number;
    minFareCents: number;
    minFareApplied: boolean;
  };
}

/**
 * Calculate quote for a booking
 *
 * ✅ Now includes extra stop surcharges:
 * - Each stop adds a flat $15 fee
 * - Distance/time charges are calculated on the TOTAL route (including detours)
 * - Stop wait time is factored in for display
 */
export function calcQuoteCents(input: CalcQuoteInput): CalcQuoteResult {
  const {
    pricingStrategy,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    stopCount = 0,
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
  let requestedHrs: number | undefined;
  let billedHrs: number | undefined;

  // ✅ Calculate stop surcharge (flat fee per stop)
  const stopSurchargeCents = stopCount * EXTRA_STOP_FEE_CENTS;
  const stopWaitTimeMinutes = stopCount * STOP_WAIT_TIME_MINUTES;

  switch (pricingStrategy) {
    case ServicePricingStrategy.POINT_TO_POINT: {
      // Base fee + (distance × per mile rate) + (time × per minute rate)
      // Note: distanceMiles and durationMinutes should ALREADY include the detour for stops
      baseCharge = baseFeeCents;

      if (distanceMiles != null && distanceMiles > 0) {
        distanceCharge = Math.round(distanceMiles * perMileCents);
      }

      if (durationMinutes != null && durationMinutes > 0) {
        // Add stop wait time to duration charge
        const totalMinutes = durationMinutes + stopWaitTimeMinutes;
        timeCharge = Math.round(totalMinutes * perMinuteCents);
      }

      break;
    }

    case ServicePricingStrategy.HOURLY: {
      // Base fee + (billable hours × per hour rate)
      // For hourly, stops don't affect the hourly rate, but we still charge the stop fee
      baseCharge = baseFeeCents;

      const requested = hoursRequested ?? 0;
      const minHours = vehicleMinHours ?? 0;
      const billable = Math.max(Math.ceil(requested), Math.ceil(minHours));

      requestedHrs = requested;
      billedHrs = billable;

      if (billable > 0) {
        timeCharge = Math.round(billable * perHourCents);
      }

      break;
    }

    case ServicePricingStrategy.FLAT: {
      // Just the base fee (flat rate) + stop surcharges
      baseCharge = baseFeeCents;
      break;
    }
  }

  // Calculate subtotal: base + distance + time + stop surcharge
  let subtotalCents =
    baseCharge + distanceCharge + timeCharge + stopSurchargeCents;

  // Apply minimum fare if calculated amount is less than minimum
  // Note: Stop surcharges are INCLUDED before min fare check
  let minFareApplied = false;
  if (subtotalCents < minFareCents) {
    subtotalCents = minFareCents;
    minFareApplied = true;
  }

  return {
    totalCents: subtotalCents,
    requestedHours: requestedHrs,
    billedHours: billedHrs,
    breakdown: {
      baseChargeCents: baseCharge,
      distanceChargeCents: distanceCharge,
      timeChargeCents: timeCharge,
      stopCount,
      stopSurchargeCents,
      stopWaitTimeMinutes,
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
