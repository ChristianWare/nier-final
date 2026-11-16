// The home page's service area map: the airports we serve, over a faint
// outline of the cities we cover.
//
// The outlines are the cities' limits from the US Census (TIGER places),
// simplified, in public/geo/service-areas.json. Each feature's properties
// carry its slug, name, a point to pin its label to and its bounding box.
// They're background only now: no labels, nothing to click.

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

export const SERVICE_AREAS_GEOJSON = "/geo/service-areas.json";

/** Free vector tiles, no key needed. Credit is shown on the map. */
export const SERVICE_AREA_MAP_STYLE =
  "https://tiles.openfreemap.org/styles/positron";

/** All ten cities (and so every airport), west/south/east/north. */
export const SERVICE_AREA_BOUNDS: [number, number, number, number] = [
  -112.6085, 33.0146, -111.5806, 33.9571,
];
