import { ServicePricingStrategy, type ServiceType } from "@prisma/client";

type QuoteInput = {
  distanceMiles?: number | null;
  durationMinutes?: number | null;
  hoursRequested?: number | null;
};

export type ServiceQuote = {
  subtotalCents: number;
  breakdown: {
    mileageCents: number;
    timeCents: number;
    baseCents: number;
    floorCents: number;
    floorApplied: boolean;
  };
};

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * IMPORTANT:
 * For POINT_TO_POINT we implement EXACTLY what you asked for:
 *   subtotal = max(minFare, distance * perMile)
 * We intentionally do NOT add baseFeeCents in this strategy.
 *
 * If you ever want a "flag drop" fee, add it back in as:
 *   baseCents + mileageCents
 */
export function quoteServiceType(
  service: Pick<
    ServiceType,
    | "pricingStrategy"
    | "minFareCents"
    | "baseFeeCents"
    | "perMileCents"
    | "perMinuteCents"
    | "perHourCents"
  >,
  input: QuoteInput,
): ServiceQuote {
  const minFareCents = safeNum(service.minFareCents);

  if (service.pricingStrategy === ServicePricingStrategy.POINT_TO_POINT) {
    const miles = Math.max(0, safeNum(input.distanceMiles));
    const minutes = Math.max(0, safeNum(input.durationMinutes));

    const mileageCents = Math.round(miles * safeNum(service.perMileCents));
    const timeCents = Math.round(minutes * safeNum(service.perMinuteCents));

    // ✅ your requested behavior (distance-based, then floor)
    const computed = mileageCents + timeCents; // timeCents will be 0 if perMinuteCents is 0
    const subtotalCents = Math.max(minFareCents, computed);

    return {
      subtotalCents,
      breakdown: {
        mileageCents,
        timeCents,
        baseCents: 0, // intentionally not used here
        floorCents: minFareCents,
        floorApplied: computed < minFareCents,
      },
    };
  }

  if (service.pricingStrategy === ServicePricingStrategy.HOURLY) {
    const hours = Math.max(0, safeNum(input.hoursRequested));
    const computed = Math.round(hours * safeNum(service.perHourCents));
    const subtotalCents = Math.max(minFareCents, computed);

    return {
      subtotalCents,
      breakdown: {
        mileageCents: 0,
        timeCents: 0,
        baseCents: 0,
        floorCents: minFareCents,
        floorApplied: computed < minFareCents,
      },
    };
  }

  // FLAT
  {
    const computed = safeNum(service.baseFeeCents);
    const subtotalCents = Math.max(minFareCents, computed);

    return {
      subtotalCents,
      breakdown: {
        mileageCents: 0,
        timeCents: 0,
        baseCents: computed,
        floorCents: minFareCents,
        floorApplied: computed < minFareCents,
      },
    };
  }
}
