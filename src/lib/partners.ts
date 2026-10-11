// src/lib/partners.ts
//
// Businesses with a dedicated Nier guest-transfer page. Used by the
// /partners hub and the nav's Partners menu. When a new partner page goes
// live, add it here and it appears in both places.

export type Partner = {
  name: string;
  href: string;
  /** Short line for the nav dropdown. */
  navCopy: string;
  kind: string;
  location: string;
  blurb: string;
};

export const partners: readonly Partner[] = [
  {
    name: "We-Ko-Pa Golf Club",
    href: "/wekopa",
    navCopy: "Sky Harbor & Mesa Gateway transfers",
    kind: "Golf club & casino resort",
    location: "Fort McDowell",
    blurb:
      "Flat-rate transfers between Sky Harbor and We-Ko-Pa, 38 miles each way: $90 for an SUV, $162 for a van, same price there and back.",
  },
  {
    name: "Denū Hotel & Spa",
    href: "/denu-hotel",
    navCopy: "Downtown Phoenix airport transfers",
    kind: "Hotel & spa",
    location: "Downtown Phoenix",
    blurb:
      "Guest transfers between Denū at 1 E Adams St and Sky Harbor or Mesa Gateway, gratuity included, plus local runs to Old Town Scottsdale and State Farm Stadium.",
  },
];
