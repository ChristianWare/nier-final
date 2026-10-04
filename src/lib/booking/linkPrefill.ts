// src/lib/booking/linkPrefill.ts
//
// Links from other pages can open the booking tool already filled in:
//   /book?trip=from-airport&airport=PHX  → an airport pickup at PHX
//   /book?trip=to-airport&airport=PHX    → an airport drop-off at PHX
// Anything the link can't match (unknown airport, no airport service) is
// ignored, so the tool simply opens empty.

export type LinkPrefill = {
  serviceTypeId: string;
  pickupAirportId?: string;
  dropoffAirportId?: string;
};

export type LinkTrip = "from-airport" | "to-airport";

type ServiceLite = {
  id: string;
  airportLeg: string;
  airports?: readonly { id: string; iata: string }[] | null;
};

export function bookingLink(trip: LinkTrip, airportCode: string): string {
  return `/book?trip=${trip}&airport=${encodeURIComponent(airportCode.toUpperCase())}`;
}

export function bookingLinkPrefill(
  sp: Record<string, string | string[] | undefined>,
  serviceTypes: readonly ServiceLite[],
): LinkPrefill | undefined {
  const trip = typeof sp.trip === "string" ? sp.trip : "";
  const code =
    typeof sp.airport === "string"
      ? sp.airport.trim().toUpperCase().slice(0, 4)
      : "";
  if (!code || (trip !== "from-airport" && trip !== "to-airport"))
    return undefined;

  const leg = trip === "from-airport" ? "PICKUP" : "DROPOFF";
  for (const s of serviceTypes) {
    if (s.airportLeg !== leg) continue;
    const airport = (s.airports ?? []).find(
      (a) => a.iata.toUpperCase() === code,
    );
    if (!airport) continue;
    return leg === "PICKUP"
      ? { serviceTypeId: s.id, pickupAirportId: airport.id }
      : { serviceTypeId: s.id, dropoffAirportId: airport.id };
  }
  return undefined;
}
