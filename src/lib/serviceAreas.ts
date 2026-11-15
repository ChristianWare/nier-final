// The cities on the home page's service area map, and the map's settings.
//
// The outlines are the cities' limits from the US Census (TIGER places),
// simplified, in public/geo/service-areas.json. Each feature's properties
// carry its slug, name, a point to pin its label to and its bounding box.

export type ServiceAreaCity = { slug: string; name: string };

/** In the order the pills show them. Each has a /locations/[slug] page. */
export const SERVICE_AREA_CITIES: readonly ServiceAreaCity[] = [
  { slug: "scottsdale", name: "Scottsdale" },
  { slug: "mesa", name: "Mesa" },
  { slug: "tempe", name: "Tempe" },
  { slug: "chandler", name: "Chandler" },
  { slug: "gilbert", name: "Gilbert" },
  { slug: "peoria", name: "Peoria" },
  { slug: "glendale", name: "Glendale" },
  { slug: "surprise", name: "Surprise" },
  { slug: "avondale", name: "Avondale" },
  { slug: "goodyear", name: "Goodyear" },
];

/** Home base on the map: the airport most rides start or end at. */
export const SKY_HARBOR = {
  slug: "phx",
  name: "Sky Harbor",
  sub: "Phoenix, AZ (PHX)",
  lng: -112.0078,
  lat: 33.4343,
} as const;

export const SERVICE_AREAS_GEOJSON = "/geo/service-areas.json";

/** Free vector tiles, no key needed. Credit is shown on the map. */
export const SERVICE_AREA_MAP_STYLE =
  "https://tiles.openfreemap.org/styles/positron";

/** All ten cities, west/south/east/north. */
export const SERVICE_AREA_BOUNDS: [number, number, number, number] = [
  -112.6085, 33.0146, -111.5806, 33.9571,
];
