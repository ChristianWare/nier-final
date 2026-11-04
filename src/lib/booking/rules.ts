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

/** Free wait time at pickup, including after an airport flight lands. */
export const FREE_WAIT_MINUTES = 15;

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
 * (lowest sort order wins when two qualify). A kind is missing when no
 * service fits it, in which case the form falls back to the service list.
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

/** True when every kind the simple first step needs has a service. */
export function canAutoPickService<S extends ServiceLike>(
  c: ClassifiedServices<S>,
) {
  return Boolean(c.oneWay && c.hourly);
}

// ─── Airport detection ──────────────────────────────────────────────────────

export type PlaceLike = {
  address?: string | null;
  placeId?: string | null;
  location?: { lat: number; lng: number } | null;
};

export type AirportLike = {
  id: string;
  name: string;
  iata: string;
  address: string;
  placeId: string | null;
  lat: unknown;
  lng: unknown;
};

/** Within this distance of an airport's saved location counts as that airport. */
export const AIRPORT_MATCH_MILES = 0.75;

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return v == null || !Number.isFinite(n) ? null : n;
}

export function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** First line of an address, normalized: "3400 E Sky Harbor Blvd". */
function streetLine(address: string | null | undefined) {
  return (address ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * The airport a picked address is at, or null. Matches the airport's Google
 * place, its street address, or anything within AIRPORT_MATCH_MILES of its
 * saved location (terminals, rental car center).
 */
export function matchAirport<A extends AirportLike>(
  place: PlaceLike | null | undefined,
  airports: readonly A[],
): A | null {
  if (!place) return null;
  for (const a of airports) {
    if (place.placeId && a.placeId && place.placeId === a.placeId) return a;
  }
  const line = streetLine(place.address);
  if (line) {
    for (const a of airports) {
      const aLine = streetLine(a.address);
      if (aLine && aLine === line) return a;
    }
  }
  const loc = place.location;
  if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
    let best: { a: A; d: number } | null = null;
    for (const a of airports) {
      const lat = num(a.lat);
      const lng = num(a.lng);
      if (lat == null || lng == null) continue;
      const d = milesBetween(loc, { lat, lng });
      if (d <= AIRPORT_MATCH_MILES && (!best || d < best.d)) best = { a, d };
    }
    if (best) return best.a;
  }
  return null;
}

/**
 * The service and airport for a one-way ride, worked out from the addresses:
 * an airport pickup when the pickup is an airport, an airport drop-off when
 * the dropoff is, otherwise a regular one-way ride. Only airports assigned to
 * the airport service count.
 */
export function pickOneWayService<
  S extends ServiceLike & { airports?: readonly AirportLike[] },
>(
  c: ClassifiedServices<S>,
  pickup: PlaceLike | null | undefined,
  dropoff: PlaceLike | null | undefined,
): {
  service: S | null;
  kind: RideKind;
  pickupAirportId: string;
  dropoffAirportId: string;
} {
  const pickupAirport = c.airportPickup
    ? matchAirport(pickup, c.airportPickup.airports ?? [])
    : null;
  if (pickupAirport && c.airportPickup) {
    return {
      service: c.airportPickup,
      kind: "airportPickup",
      pickupAirportId: pickupAirport.id,
      dropoffAirportId: "",
    };
  }
  const dropoffAirport = c.airportDropoff
    ? matchAirport(dropoff, c.airportDropoff.airports ?? [])
    : null;
  if (dropoffAirport && c.airportDropoff) {
    return {
      service: c.airportDropoff,
      kind: "airportDropoff",
      pickupAirportId: "",
      dropoffAirportId: dropoffAirport.id,
    };
  }
  return {
    service: c.oneWay,
    kind: "oneWay",
    pickupAirportId: "",
    dropoffAirportId: "",
  };
}

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
        `${FREE_WAIT_MINUTES} minutes of free wait time after your flight lands`,
        "Curbside pickup, or free meet & greet inside baggage claim",
        ...common,
      ];
    case "airportDropoff":
      return [
        "Pickup timed around traffic and your terminal's security lines",
        `${FREE_WAIT_MINUTES} minutes of free wait time at pickup`,
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
        `${FREE_WAIT_MINUTES} minutes of free wait time at pickup`,
        "Door-to-door, with help with your luggage",
        ...common,
      ];
  }
}
