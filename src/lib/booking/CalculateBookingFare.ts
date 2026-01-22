/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { ServicePricingStrategy } from "@prisma/client";

export interface CalculateFareInput {
  serviceTypeId: string;
  vehicleId: string;
  distanceMiles: number;
  durationMinutes: number;
  hoursRequested?: number;
}

export interface CalculateFareResult {
  success: boolean;
  subtotalCents: number;
  totalCents: number;
  breakdown: {
    serviceName: string;
    vehicleName: string;
    pricingStrategy: ServicePricingStrategy;
    baseFeeCents: number;
    distanceChargeCents: number;
    timeChargeCents: number;
    subtotalCents: number;
    minFareCents: number;
    minFareApplied: boolean;
    totalCents: number;
  };
  displayBreakdown: string;
  error?: string;
}

/**
 * Calculate fare for a booking based on service type, vehicle, and trip details
 */
export async function calculateBookingFare(
  input: CalculateFareInput,
): Promise<CalculateFareResult> {
  try {
    const {
      serviceTypeId,
      vehicleId,
      distanceMiles,
      durationMinutes,
      hoursRequested = 0,
    } = input;

    // Fetch service type and vehicle pricing
    const [service, vehicle] = await Promise.all([
      db.serviceType.findUnique({
        where: { id: serviceTypeId },
        select: {
          name: true,
          pricingStrategy: true,
          minFareCents: true,
          baseFeeCents: true,
          perMileCents: true,
          perMinuteCents: true,
          perHourCents: true,
        },
      }),
      db.vehicle.findUnique({
        where: { id: vehicleId },
        select: {
          name: true,
          baseFareCents: true,
          perMileCents: true,
          perMinuteCents: true,
          perHourCents: true,
        },
      }),
    ]);

    if (!service || !vehicle) {
      return {
        success: false,
        subtotalCents: 0,
        totalCents: 0,
        breakdown: {} as any,
        displayBreakdown: "",
        error: "Service or vehicle not found",
      };
    }

    // Combine service and vehicle pricing (vehicle pricing can override/add to service pricing)
    const minFareCents = service.minFareCents;
    const baseFeeCents = service.baseFeeCents + vehicle.baseFareCents;
    const perMileCents = service.perMileCents + vehicle.perMileCents;
    const perMinuteCents = service.perMinuteCents + vehicle.perMinuteCents;
    const perHourCents = service.perHourCents + vehicle.perHourCents;

    let subtotalCents = 0;
    let baseCharge = 0;
    let distanceCharge = 0;
    let timeCharge = 0;
    const displayParts: string[] = [];

    // Calculate based on pricing strategy
    switch (service.pricingStrategy) {
      case "POINT_TO_POINT": {
        // Base fee + (distance × per mile rate)
        baseCharge = baseFeeCents;
        distanceCharge = Math.round(distanceMiles * perMileCents);

        if (baseCharge > 0) {
          displayParts.push(`Base: $${(baseCharge / 100).toFixed(2)}`);
        }

        if (distanceCharge > 0) {
          displayParts.push(
            `Distance: ${distanceMiles.toFixed(1)} mi × $${(perMileCents / 100).toFixed(2)}/mi = $${(distanceCharge / 100).toFixed(2)}`,
          );
        }

        subtotalCents = baseCharge + distanceCharge;
        break;
      }

      case "HOURLY": {
        // Base fee + (hours × hourly rate)
        baseCharge = baseFeeCents;
        timeCharge = Math.round(hoursRequested * perHourCents);

        if (baseCharge > 0) {
          displayParts.push(`Base: $${(baseCharge / 100).toFixed(2)}`);
        }

        if (timeCharge > 0) {
          displayParts.push(
            `Time: ${hoursRequested} hrs × $${(perHourCents / 100).toFixed(2)}/hr = $${(timeCharge / 100).toFixed(2)}`,
          );
        }

        subtotalCents = baseCharge + timeCharge;
        break;
      }

      case "FLAT": {
        // Just the base fee (flat rate)
        baseCharge = baseFeeCents;
        subtotalCents = baseCharge;
        displayParts.push(`Flat rate: $${(baseCharge / 100).toFixed(2)}`);
        break;
      }
    }

    // ✅ CRITICAL: Apply minimum fare if calculated amount is less than minimum
    let minFareApplied = false;
    if (subtotalCents < minFareCents) {
      subtotalCents = minFareCents;
      minFareApplied = true;
      displayParts.push(
        `Minimum fare applied: $${(minFareCents / 100).toFixed(2)}`,
      );
    }

    const totalCents = subtotalCents; // Can add fees/taxes here later

    return {
      success: true,
      subtotalCents,
      totalCents,
      breakdown: {
        serviceName: service.name,
        vehicleName: vehicle.name,
        pricingStrategy: service.pricingStrategy,
        baseFeeCents: baseCharge,
        distanceChargeCents: distanceCharge,
        timeChargeCents: timeCharge,
        subtotalCents,
        minFareCents,
        minFareApplied,
        totalCents,
      },
      displayBreakdown: displayParts.join(" + "),
    };
  } catch (error) {
    console.error("Fare calculation error:", error);
    return {
      success: false,
      subtotalCents: 0,
      totalCents: 0,
      breakdown: {} as any,
      displayBreakdown: "",
      error: "Failed to calculate fare",
    };
  }
}

/**
 * Helper to format currency
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
