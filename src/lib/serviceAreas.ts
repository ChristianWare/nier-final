// The home page's airport map: the airports we serve, and the map's
// settings.
//
// Each airport's grounds (public/geo/airports.json) are drawn around its
// runways: the runway ends from OurAirports (runways.csv), widened and
// wrapped in one outline, so the terminals between them are inside it.
// The selected airport's grounds are filled in red.

export type ServiceAirport = {
  slug: string;
  /** IATA / FAA code. */
  code: string;
  /** The short name on the pill and the map. */
  name: string;
  /** Where it is, under the name on the map. */
  place: string;
  kind: "commercial" | "private";
  /** Its page on the site. */
  href: string;
  lng: number;
  lat: number;
};

/** In the order the pills show them: commercial, then private aviation. */
export const SERVICE_AIRPORTS: readonly ServiceAirport[] = [
  {
    slug: "phx",
    code: "PHX",
    name: "Sky Harbor",
    place: "Phoenix",
    kind: "commercial",
    href: "/airports/phx-sky-harbor",
    lng: -112.0078,
    lat: 33.4343,
  },
  {
    slug: "aza",
    code: "AZA",
    name: "Mesa Gateway",
    place: "Mesa",
    kind: "commercial",
    href: "/airports/mesa-gateway",
    lng: -111.6555,
    lat: 33.3078,
  },
  {
    slug: "sdl",
    code: "SDL",
    name: "Scottsdale Airport",
    place: "Scottsdale",
    kind: "commercial",
    href: "/airports/scottsdale-airport",
    lng: -111.9105,
    lat: 33.6229,
  },
  {
    slug: "dvt",
    code: "DVT",
    name: "Deer Valley",
    place: "North Phoenix",
    kind: "private",
    href: "/airports/private-aviation",
    lng: -112.0825,
    lat: 33.6883,
  },
  {
    slug: "ffz",
    code: "FFZ",
    name: "Falcon Field",
    place: "Mesa",
    kind: "private",
    href: "/airports/private-aviation",
    lng: -111.7283,
    lat: 33.4608,
  },
  {
    slug: "gyr",
    code: "GYR",
    name: "Phoenix Goodyear",
    place: "Goodyear",
    kind: "private",
    href: "/airports/private-aviation",
    lng: -112.376,
    lat: 33.4225,
  },
];

/** Selected when the page loads. */
export const DEFAULT_AIRPORT = "phx";

export const AIRPORT_GROUNDS_GEOJSON = "/geo/airports.json";

/** Free vector tiles, no key needed. Credit is shown on the map. */
export const SERVICE_AREA_MAP_STYLE =
  "https://tiles.openfreemap.org/styles/positron";

/** Every airport, with room around, west/south/east/north. */
export const SERVICE_AREA_BOUNDS: [number, number, number, number] = [
  -112.45, 33.26, -111.58, 33.73,
];
