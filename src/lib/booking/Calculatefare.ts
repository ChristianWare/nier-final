/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Fare Calculation Utility
 *
 * This handles all pricing strategies for your transportation service.
 */

export type PricingStrategy = "POINT_TO_POINT" | "HOURLY" | "FLAT";

export interface FareInput {
  // Service pricing configuration (all in cents)
  pricingStrategy: PricingStrategy;
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;

  // Trip details
  distanceMiles?: number;
  durationMinutes?: number;
  hoursRequested?: number;
}

export interface FareBreakdown {
  subtotalCents: number;
  baseFeeCents: number;
  distanceChargeCents: number;
  timeChargeCents: number;
  minFareApplied: boolean;
  breakdown: string;
}

/**
 * Calculate fare based on service type and trip details
 */
export function calculateFare(input: FareInput): FareBreakdown {
  const {
    pricingStrategy,
    minFareCents,
    baseFeeCents,
    perMileCents,
    perMinuteCents,
    perHourCents,
    distanceMiles = 0,
    durationMinutes = 0,
    hoursRequested = 0,
  } = input;

  let subtotalCents = 0;
  let baseCharge = 0;
  let distanceCharge = 0;
  let timeCharge = 0;
  let breakdown = "";

  switch (pricingStrategy) {
    case "POINT_TO_POINT": {
      // Base fee + (distance × per mile rate)
      baseCharge = baseFeeCents;
      distanceCharge = Math.round(distanceMiles * perMileCents);

      subtotalCents = baseCharge + distanceCharge;

      breakdown = `Base: $${(baseCharge / 100).toFixed(2)} + Distance: ${distanceMiles.toFixed(2)} mi × $${(perMileCents / 100).toFixed(2)}/mi = $${(distanceCharge / 100).toFixed(2)}`;
      break;
    }

    case "HOURLY": {
      // Base fee + (hours × hourly rate)
      baseCharge = baseFeeCents;
      timeCharge = Math.round(hoursRequested * perHourCents);

      subtotalCents = baseCharge + timeCharge;

      breakdown = `Base: $${(baseCharge / 100).toFixed(2)} + Time: ${hoursRequested} hrs × $${(perHourCents / 100).toFixed(2)}/hr = $${(timeCharge / 100).toFixed(2)}`;
      break;
    }

    case "FLAT": {
      // Just the base fee
      baseCharge = baseFeeCents;
      subtotalCents = baseCharge;

      breakdown = `Flat rate: $${(baseCharge / 100).toFixed(2)}`;
      break;
    }
  }

  // ✅ CRITICAL: Apply minimum fare if calculated amount is less
  let minFareApplied = false;
  if (subtotalCents < minFareCents) {
    subtotalCents = minFareCents;
    minFareApplied = true;
    breakdown += ` → Minimum fare applied: $${(minFareCents / 100).toFixed(2)}`;
  }

  return {
    subtotalCents,
    baseFeeCents: baseCharge,
    distanceChargeCents: distanceCharge,
    timeChargeCents: timeCharge,
    minFareApplied,
    breakdown,
  };
}

/**
 * Format cents as dollar string
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Example usage for POINT_TO_POINT with airport pickup:
 *
 * const fare = calculateFare({
 *   pricingStrategy: "POINT_TO_POINT",
 *   minFareCents: 5500,      // $55 minimum
 *   baseFeeCents: 5500,      // $55 base fee
 *   perMileCents: 275,       // $2.75 per mile
 *   perMinuteCents: 0,
 *   perHourCents: 0,
 *   distanceMiles: 30,       // 30 mile trip
 *   durationMinutes: 45,
 * });
 *
 * Result:
 * - Base: $55.00
 * - Distance: 30 mi × $2.75 = $82.50
 * - Subtotal: $137.50 (base + distance)
 * - Min fare NOT applied (since $137.50 > $55)
 *
 * For a short 10 mile trip:
 * - Base: $55.00
 * - Distance: 10 mi × $2.75 = $27.50
 * - Calculated: $82.50
 * - Since this exceeds min fare, charge is $82.50
 *
 * For a very short 2 mile trip:
 * - Base: $55.00
 * - Distance: 2 mi × $2.75 = $5.50
 * - Calculated: $60.50
 * - Since this exceeds min fare, charge is $60.50
 */
