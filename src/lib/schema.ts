import { SITE_URL } from "@/lib/site";

/**
 * The one Nier Transportation business entity.
 *
 * Rendered once, site-wide, from the root layout. Every other schema block
 * (Service, Article, ItemList…) points at it with `provider: BUSINESS_REF`
 * or `publisher: BUSINESS_REF` instead of re-declaring the name, phone and
 * address. Google then sees one business, the same one as the Google
 * Business Profile, instead of a dozen slightly different copies.
 *
 * Name, address and phone here must match the Google Business Profile, the
 * footer, Yelp and every other listing character for character.
 */

export const BUSINESS_ID = `${SITE_URL}/#business`;

/** Use as `provider`, `publisher` or `worksFor` in page-level schema. */
export const BUSINESS_REF = { "@id": BUSINESS_ID } as const;

/**
 * Profiles that always belong in `sameAs`. Everything else (Google Business
 * Profile, Yelp, LinkedIn…) is read from Admin → Company Settings, the same
 * fields that drive the footer icons, so adding a URL there updates both.
 */
const BASE_SAME_AS = [
  "https://www.instagram.com/niertransportation",
  "https://www.facebook.com/niertransportation",
];

export type BusinessProfileUrls = {
  googleBusinessUrl?: string | null;
  yelpUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
};

const AREA_SERVED = [
  "Phoenix",
  "Scottsdale",
  "Tempe",
  "Mesa",
  "Chandler",
  "Gilbert",
  "Peoria",
  "Glendale",
  "Paradise Valley",
  "Cave Creek",
  "Fountain Hills",
  "Surprise",
  "Goodyear",
  "Avondale",
  "Buckeye",
  "Litchfield Park",
  "Tolleson",
  "El Mirage",
  "Youngtown",
  "Sun City",
  "Sun City West",
  "Anthem",
  "New River",
  "Carefree",
  "Rio Verde",
  "Ahwatukee",
  "Laveen",
  "Queen Creek",
  "San Tan Valley",
  "Maricopa",
  "Casa Grande",
  "Coolidge",
  "Florence",
  "Apache Junction",
  "Gold Canyon",
  "Sedona",
  "Prescott",
  "Wickenburg",
  "Payson",
  "Tucson",
].map((name) => ({
  "@type": "City",
  name,
  containedInPlace: { "@type": "State", name: "Arizona" },
}));

const BASE_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "LimousineBusService",
  "@id": BUSINESS_ID,
  name: "Nier Transportation",
  url: SITE_URL,
  logo: `${SITE_URL}/nierLogo.png`,
  image: `${SITE_URL}/og-image.png`,
  telephone: "+1-480-300-6003",
  email: "info@niertransportation.com",
  description:
    "Family-owned luxury black car and limousine service serving Phoenix, Scottsdale, and greater Metro Phoenix since 2004.",
  foundingDate: "2004",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "10105 E Via Linda, Ste A-105",
    addressLocality: "Scottsdale",
    addressRegion: "AZ",
    postalCode: "85258",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 33.5611,
    longitude: -111.8896,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "00:00",
    closes: "23:59",
  },
  areaServed: AREA_SERVED,
};

const clean = (u?: string | null) => (u ?? "").trim();

/**
 * The full business entity for the root layout. `hasMap` and the Google
 * entry in `sameAs` appear only once a Google Business URL is saved in
 * Company Settings, so nothing half-finished ships in the markup.
 */
export function buildBusinessSchema(urls: BusinessProfileUrls = {}) {
  const gbp = clean(urls.googleBusinessUrl);
  const sameAs = Array.from(
    new Set(
      [
        gbp,
        clean(urls.yelpUrl),
        ...BASE_SAME_AS,
        clean(urls.instagramUrl),
        clean(urls.facebookUrl),
        clean(urls.linkedinUrl),
        clean(urls.twitterUrl),
        clean(urls.tiktokUrl),
        clean(urls.youtubeUrl),
      ]
        .filter((u) => /^https?:\/\//.test(u))
        .map((u) => u.replace(/\/+$/, "")),
    ),
  );

  return {
    ...BASE_BUSINESS,
    ...(gbp && { hasMap: gbp }),
    sameAs,
  };
}
