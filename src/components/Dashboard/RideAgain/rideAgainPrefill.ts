// What "Ride again" hands the booking tool: a past ride's route, service,
// vehicle and party size, in the shape the tool's prefill reads
// (BookWizard, sessionStorage "booking_prefill"). The date and time are
// left for the customer to pick.

export type RideAgainPlace = {
  address: string;
  placeId: string;
  location: { lat: number; lng: number };
};

export type RideAgainPrefill = {
  serviceTypeId: string;
  vehicleId?: string;
  passengers?: number;
  luggage?: number;
  hoursRequested?: number;
  pickupAirportId?: string;
  dropoffAirportId?: string;
  route?: {
    pickup: RideAgainPlace | null;
    dropoff: RideAgainPlace | null;
    stops: [];
    miles: number | null;
    minutes: number | null;
    distanceMiles: number | null;
    durationMinutes: number | null;
  };
};

export type RideAgainSource = {
  pickupAddress: string;
  pickupPlaceId: string | null;
  pickupLat: unknown;
  pickupLng: unknown;
  dropoffAddress: string;
  dropoffPlaceId: string | null;
  dropoffLat: unknown;
  dropoffLng: unknown;
  distanceMiles: unknown;
  durationMinutes: number | null;
  hoursRequested: number | null;
  passengers: number;
  luggage: number;
  serviceTypeId: string;
  vehicleId: string | null;
  serviceType?: { airportLeg?: string | null } | null;
};

/** Prisma Decimal, number or null → number or null. */
function toNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function place(
  address: string,
  placeId: string | null,
  lat: unknown,
  lng: unknown,
): RideAgainPlace | null {
  const la = toNumber(lat);
  const ln = toNumber(lng);
  if (la == null || ln == null) return null;
  return {
    address,
    placeId: placeId ?? address,
    location: { lat: la, lng: ln },
  };
}

/**
 * @param airportIdByAddress Active airports by address, so an airport ride
 *   picks the same airport again.
 */
export function rideAgainPrefill(
  b: RideAgainSource,
  airportIdByAddress: Map<string, string>,
): RideAgainPrefill {
  const leg = b.serviceType?.airportLeg ?? "NONE";
  const pickup = place(
    b.pickupAddress,
    b.pickupPlaceId,
    b.pickupLat,
    b.pickupLng,
  );
  const dropoff = place(
    b.dropoffAddress,
    b.dropoffPlaceId,
    b.dropoffLat,
    b.dropoffLng,
  );
  const miles = toNumber(b.distanceMiles);

  return {
    serviceTypeId: b.serviceTypeId,
    vehicleId: b.vehicleId ?? undefined,
    passengers: b.passengers,
    luggage: b.luggage,
    hoursRequested: b.hoursRequested ?? undefined,
    pickupAirportId:
      leg === "PICKUP" ? airportIdByAddress.get(b.pickupAddress) : undefined,
    dropoffAirportId:
      leg === "DROPOFF" ? airportIdByAddress.get(b.dropoffAddress) : undefined,
    route:
      pickup || dropoff
        ? {
            pickup,
            dropoff,
            stops: [],
            miles,
            minutes: b.durationMinutes,
            distanceMiles: miles,
            durationMinutes: b.durationMinutes,
          }
        : undefined,
  };
}

/** The fields to select for rideAgainPrefill. */
export const RIDE_AGAIN_SELECT = {
  pickupAddress: true,
  pickupPlaceId: true,
  pickupLat: true,
  pickupLng: true,
  dropoffAddress: true,
  dropoffPlaceId: true,
  dropoffLat: true,
  dropoffLng: true,
  distanceMiles: true,
  durationMinutes: true,
  hoursRequested: true,
  passengers: true,
  luggage: true,
  serviceTypeId: true,
  vehicleId: true,
} as const;
