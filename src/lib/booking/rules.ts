// src/lib/booking/rules.ts
//
// The booking rules, in ONE place. Every booking form (main booking page,
// homepage widget, We-Ko-Pa, Denū, corporate) and the server actions that
// save bookings read these values, so a rule can't drift between forms again
// (the main page once allowed 1-hour charters while the homepage required 2).
//
// Safe to import from client components: no server-only imports.
//
// What this file does NOT decide: which vehicles a form shows. Each form keeps
// its own vehicle list (partner forms only show their partner vehicles, see
// partnerVehicles.ts). Prices come from the rates in Admin → Vehicle
// Categories and Admin → Services, calculated by src/lib/pricing/calcQuote.ts.

import { EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";

export { EXTRA_STOP_FEE_CENTS };

// ─── Lead time ──────────────────────────────────────────────────────────────

/** How far ahead an online booking must be made. */
export const BOOKING_LEAD_HOURS = 36;
export const BOOKING_LEAD_MINUTES = BOOKING_LEAD_HOURS * 60;

export const LEAD_TIME_MESSAGE = `Bookings must be made at least ${BOOKING_LEAD_HOURS} hours in advance.`;
export const LEAD_TIME_MESSAGE_WITH_CALL = `${LEAD_TIME_MESSAGE} Please select a later date/time, or call for bookings.`;

/** True when a pickup is sooner than the lead time allows. */
export function isTooSoonForOnlineBooking(pickupAt: Date, now = new Date()) {
  return pickupAt.getTime() - now.getTime() < BOOKING_LEAD_MINUTES * 60_000;
}

// ─── Hourly (charter / "by the hour") ──────────────────────────────────────

/** Minimum hours for any hourly booking. A vehicle can require more. */
export const HOURLY_MIN_HOURS = 2;

export const HOURLY_MIN_LABEL = `${HOURLY_MIN_HOURS} hour minimum`;

/** Validation message for the hours field, or null when it's fine. */
export function hoursRequestedError(hours: number): string | null {
  if (!Number.isFinite(hours)) return "Please enter hours.";
  if (hours < HOURLY_MIN_HOURS)
    return `Hourly bookings have a ${HOURLY_MIN_HOURS}-hour minimum.`;
  return null;
}

/** Hours that will be billed: at least the hourly and vehicle minimums. */
export function billableHours(requested: number, vehicleMinHours = 0) {
  return Math.max(
    Math.ceil(requested || 0),
    Math.ceil(vehicleMinHours || 0),
    HOURLY_MIN_HOURS,
  );
}

// ─── Stops ──────────────────────────────────────────────────────────────────

export function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Dollars for page copy: 9500 → "$95", 9550 → "$95.50". */
export function usdShort(cents: number) {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "+$15.00 per stop" */
export const EXTRA_STOP_FEE_LABEL = `+${formatUsd(EXTRA_STOP_FEE_CENTS)} per stop`;

export function stopSurchargeCents(stopCount: number) {
  return Math.max(0, stopCount) * EXTRA_STOP_FEE_CENTS;
}

// ─── Policies shown to customers ────────────────────────────────────────────

/** Free wait time on airport pickups, counted from when the flight lands. */
export const AIRPORT_FREE_WAIT_MINUTES = 60;

/** Free wait time at any other pickup (hotel, home, office). */
export const PICKUP_GRACE_MINUTES = 15;

/** Free cancellation window. */
export const CANCELLATION_FREE_HOURS = 72;

export const CANCELLATION_POLICY = `Free cancellation up to ${CANCELLATION_FREE_HOURS} hours before pickup.`;
export const CANCELLATION_POLICY_DETAIL = `Within ${CANCELLATION_FREE_HOURS} hours of pickup, a cancellation fee may apply.`;

/** Meet & greet inside baggage claim is free on airport pickups. */
export const MEET_AND_GREET_FREE = true;
export const MEET_AND_GREET_NOTE = "Meet & greet requested (free).";

// ─── Ride kinds ─────────────────────────────────────────────────────────────

export type RideKind = "airportPickup" | "airportDropoff" | "oneWay" | "hourly";

type ServiceLike = {
  id: string;
  pricingStrategy: string;
  airportLeg: string;
  active?: boolean;
  sortOrder?: number;
};

export function rideKindOf(service: ServiceLike | null | undefined): RideKind {
  if (!service) return "oneWay";
  if (service.pricingStrategy === "HOURLY") return "hourly";
  if (service.airportLeg === "PICKUP") return "airportPickup";
  if (service.airportLeg === "DROPOFF") return "airportDropoff";
  return "oneWay";
}

/**
 * The service to use for each kind of ride, picked from the active services
 * (lowest sort order wins when two qualify). A kind is null when no service
 * fits it. Used for the return ride (airport pickup → airport drop-off) and
 * the website prices.
 */
export function classifyServices<S extends ServiceLike>(services: S[]) {
  const sorted = [...services]
    .filter((s) => s.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const pick = (fn: (s: S) => boolean) => sorted.find(fn) ?? null;
  return {
    hourly: pick((s) => s.pricingStrategy === "HOURLY"),
    airportPickup: pick(
      (s) => s.pricingStrategy !== "HOURLY" && s.airportLeg === "PICKUP",
    ),
    airportDropoff: pick(
      (s) => s.pricingStrategy !== "HOURLY" && s.airportLeg === "DROPOFF",
    ),
    oneWay: pick(
      (s) => s.pricingStrategy === "POINT_TO_POINT" && s.airportLeg === "NONE",
    ),
  };
}

export type ClassifiedServices<S extends ServiceLike> = ReturnType<
  typeof classifyServices<S>
>;

/** The ride kind for the trip back: an airport pickup returns as a drop-off. */
export function returnKindOf(kind: RideKind): RideKind {
  if (kind === "airportPickup") return "airportDropoff";
  if (kind === "airportDropoff") return "airportPickup";
  return kind;
}

// ─── "Included with your ride" ──────────────────────────────────────────────

export function includedFor(kind: RideKind): string[] {
  const common = [
    "A professional, background-checked chauffeur",
    "No surge pricing",
    "The driver tip is optional",
  ];
  switch (kind) {
    case "airportPickup":
      return [
        "Flight tracking: your pickup adjusts to your actual landing time",
        `Up to ${AIRPORT_FREE_WAIT_MINUTES} minutes of free wait time after your flight lands`,
        "Curbside pickup, or free meet & greet inside baggage claim",
        ...common,
      ];
    case "airportDropoff":
      return [
        "Pickup timed around traffic and your terminal's security lines",
        `${PICKUP_GRACE_MINUTES} minutes of free wait time at pickup`,
        "Help with your luggage",
        ...common,
      ];
    case "hourly":
      return [
        "Your chauffeur stays with you and waits between stops",
        `A ${HOURLY_MIN_HOURS}-hour minimum`,
        ...common,
      ];
    default:
      return [
        `${PICKUP_GRACE_MINUTES} minutes of free wait time at pickup`,
        "Door-to-door, with help with your luggage",
        ...common,
      ];
  }
}
