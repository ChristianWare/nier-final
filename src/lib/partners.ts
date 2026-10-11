// src/lib/partners.ts
//
// Businesses with a dedicated Nier guest-transfer page. Used by the
// /partners hub and the nav's Partners menu. When a new partner page goes
// live, add it here and it appears in both places.

import type { StaticImageData } from "next/image";
import WekopaImg from "../../public/images/other/Wekopa.jpg";
import DenuImg from "../../public/images/other/Denu.jpeg";

export type Partner = {
  name: string;
  href: string;
  /** Short line for the nav dropdown. */
  navCopy: string;
  kind: string;
  location: string;
  blurb: string;
  /** Photo shown on the partner's card on /partners. */
  image: StaticImageData;
  imageAlt: string;
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
    image: WekopaImg,
    imageAlt: "We-Ko-Pa Golf Club course in Fort McDowell",
  },
  {
    name: "Denū Hotel & Spa",
    href: "/denu-hotel",
    navCopy: "Downtown Phoenix airport transfers",
    kind: "Hotel & spa",
    location: "Downtown Phoenix",
    blurb:
      "Guest transfers between Denū at 1 E Adams St and Sky Harbor or Mesa Gateway, gratuity included, plus local runs to Old Town Scottsdale and State Farm Stadium.",
    image: DenuImg,
    imageAlt: "Denū Hotel & Spa in downtown Phoenix",
  },
];
