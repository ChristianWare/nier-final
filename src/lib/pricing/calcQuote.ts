/**
 * Pricing calculation for booking quotes
 * Location: lib/pricing/calcQuote.ts
 *
 * ✅ UPDATED: Vehicle base fare now acts as a minimum floor, not additive.
 * ✅ Includes support for extra stops AND service fees.
 */

import { ServicePricingStrategy } from "@prisma/client";

// ✅ Flat fee per extra stop (in cents)
export const EXTRA_STOP_FEE_CENTS = 1500; // $15.00 per stop

// ✅ Estimated wait time per stop (in minutes) - for display purposes
export const STOP_WAIT_TIME_MINUTES = 5;

// ✅ Fee input type
export interface FeeInput {
  label: string;
  amountCents: number;
}

export interface CalcQuoteInput {
  pricingStrategy: ServicePricingStrategy;

  // Trip details
  distanceMiles: number | null;
  durationMinutes: number | null;
  hoursRequested: number | null;

  // Extra stops
  stopCount?: number; // Number of extra stops (0 = direct route)

  // ✅ Service fees
  fees?: FeeInput[];

  // Vehicle constraints
  vehicleMinHours: number;

  // Service-level minimum hours (for HOURLY services)
  serviceMinHours?: number;

  // Service pricing (in cents)
  serviceMinFareCents: number;
  serviceBaseFeeCents: number;
  servicePerMileCents: number;
  servicePerMinuteCents: number;
  servicePerHourCents: number;

  // Vehicle pricing (in cents)
  // baseFareCents = minimum fare floor for this vehicle
  // perMile/perMinute/perHour ADD to service rates
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
    // Stop surcharges
    stopCount: number;
    stopSurchargeCents: number;
    stopWaitTimeMinutes: number;
    // Service fees
    fees: FeeInput[];
    totalFeesCents: number;
    // Totals
    subtotalCents: number;
    minFareCents: number;
    minFareApplied: boolean;
  };
}

/**
 * Calculate quote for a booking
 *
 * Vehicle base fare is treated as a MINIMUM FLOOR for the trip portion,
 * not an additive charge. For example:
 *   - SUV base fare = $55, per mile = $5
 *   - 2 mile trip: 2 × $5 = $10 → below $55 floor → charge $55
 *   - 38 mile trip: 38 × $5 = $190 → above $55 floor → charge $190
 */
export function calcQuoteCents(input: CalcQuoteInput): CalcQuoteResult {
  const {
    pricingStrategy,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    stopCount = 0,
    fees = [],
    vehicleMinHours,
    serviceMinHours = 0,
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

  // Service-level base fee (additive — e.g. airport fee)
  const baseFeeCents = serviceBaseFeeCents;

  // Combine service + vehicle per-unit rates
  const perMileCents = servicePerMileCents + vehiclePerMileCents;
  const perMinuteCents = servicePerMinuteCents + vehiclePerMinuteCents;
  const perHourCents = servicePerHourCents + vehiclePerHourCents;

  // Service-level minimum fare
  const minFareCents = serviceMinFareCents;

  let baseCharge = 0;
  let distanceCharge = 0;
  let timeCharge = 0;
  let requestedHrs: number | undefined;
  let billedHrs: number | undefined;

  // Calculate stop surcharge (flat fee per stop)
  const stopSurchargeCents = stopCount * EXTRA_STOP_FEE_CENTS;
  const stopWaitTimeMinutes = stopCount * STOP_WAIT_TIME_MINUTES;

  // Calculate total service fees
  const totalFeesCents = fees.reduce((sum, fee) => sum + fee.amountCents, 0);

  switch (pricingStrategy) {
    case ServicePricingStrategy.POINT_TO_POINT: {
      // Service base fee (e.g. airport surcharge)
      baseCharge = baseFeeCents;

      if (distanceMiles != null && distanceMiles > 0) {
        distanceCharge = Math.round(distanceMiles * perMileCents);
      }

      if (durationMinutes != null && durationMinutes > 0) {
        // Add stop wait time to duration charge
        const totalMinutes = durationMinutes + stopWaitTimeMinutes;
        timeCharge = Math.round(totalMinutes * perMinuteCents);
      }

      // Vehicle base fare acts as a minimum floor for the trip portion
      // (distance + time). If the calculated trip cost is below the
      // vehicle's base fare, bump it up to the base fare.
      const tripCharge = distanceCharge + timeCharge;
      if (tripCharge < vehicleBaseFareCents) {
        distanceCharge = vehicleBaseFareCents;
        timeCharge = 0;
      }

      break;
    }

    case ServicePricingStrategy.HOURLY: {
      // Service base fee
      baseCharge = baseFeeCents;

      const requested = hoursRequested ?? 0;
      // Use max of service minHours and vehicle minHours
      const effectiveMinHours = Math.max(serviceMinHours, vehicleMinHours);
      const billable = Math.max(
        Math.ceil(requested),
        Math.ceil(effectiveMinHours),
      );

      requestedHrs = requested;
      billedHrs = billable;

      if (billable > 0) {
        timeCharge = Math.round(billable * perHourCents);
      }

      // Vehicle base fare acts as a minimum floor for the time charge
      if (timeCharge < vehicleBaseFareCents) {
        timeCharge = vehicleBaseFareCents;
      }

      break;
    }

    case ServicePricingStrategy.FLAT: {
      // Service base fee
      baseCharge = baseFeeCents;
      // For flat rate, vehicle base fare IS the charge
      timeCharge = vehicleBaseFareCents;
      break;
    }
  }

  // Calculate subtotal: base + distance + time + stop surcharge + fees
  let subtotalCents =
    baseCharge +
    distanceCharge +
    timeCharge +
    stopSurchargeCents +
    totalFeesCents;

  // Apply service-level minimum fare if calculated amount is less
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
      fees,
      totalFeesCents,
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
