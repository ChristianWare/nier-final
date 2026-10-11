// src/lib/airportGuides.ts
//
// Sky Harbor terminal guides: /airports/phx-sky-harbor/<slug>.
// Each page answers a big informational search ("phoenix airport terminal 3",
// "sky harbor terminal 4", "phx sky train") and turns it into a booking.
//
// FACTS: every airline, level, door, station and date below comes from
// skyharbor.com (or the cited news source) and was checked on CHECKED_ON.
// Airlines move between terminals: re-check the airline list each spring
// and fall, update CHECKED_ON, and bump the sitemap date.

export const CHECKED_ON = "2026-10-11";

export type GuideFact = { label: string; value: string };
export type GuideTable = {
  caption?: string;
  head: readonly string[];
  rows: readonly (readonly string[])[];
};
export type GuideSection = {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  table?: GuideTable;
};

export type AirportGuide = {
  airportSlug: "phx-sky-harbor";
  slug: string;
  /** Short name for breadcrumbs and links. */
  shortName: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  facts: readonly GuideFact[];
  /** Hero video (under /public). Pages without one fall back to the
   *  Sky Harbor clip in the page file. */
  hero?: { video: string; poster: string; alt: string };
  sections: readonly GuideSection[];
  /** Booking box words, shown mid-page. */
  rideBox: { title: string; copy: string };
  faqs: readonly { q: string; a: string }[];

  sources: readonly { label: string; href: string }[];
};

const T3_AIRLINES = [
  "Advanced Airlines",
  "Air Canada",
  "Alaska Airlines",
  "Allegiant",
  "Breeze Airways",
  "Delta Air Lines",
  "Denver Air Connection",
  "Frontier Airlines",
  "Hawaiian Airlines",
  "JetBlue Airways",
  "Porter Airlines",
  "Southern Airways Express",
  "Sun Country Airlines",
  "United Airlines",
] as const;

const T4_AIRLINES = [
  "Aeroméxico",
  "Air France",
  "American Airlines",
  "British Airways",
  "China Airlines",
  "Contour Airlines",
  "Southwest Airlines",
  "STARLUX Airlines",
  "Volaris",
  "WestJet",
] as const;

const SRC_AIRLINES = {
  label: "Phoenix Sky Harbor: Airlines",
  href: "https://www.skyharbor.com/flights/airlines",
};
const SRC_SKYTRAIN = {
  label: "Phoenix Sky Harbor: PHX Sky Train",
  href: "https://www.skyharbor.com/PHXSkyTrain",
};
const SRC_RIDESHARE = {
  label: "Phoenix Sky Harbor: Rideshare pickup",
  href: "https://www.skyharbor.com/ground-transportation/ride-share/",
};
const SRC_CELL_LOTS = {
  label: "Phoenix Sky Harbor: three free cell phone waiting lots",
  href: "https://www.skyharbor.com/about-phx/news-media/phx-check-in/2024/december-2024/have-you-heard-phx-has-three-free-cell-phone-waiting-lots/",
};

/** The three free cell phone lots, shared by every guide. */
const CELL_LOT_SECTION: GuideSection = {
  heading: "Free cell phone waiting lots",
  paragraphs: [
    "Sky Harbor has three free cell phone waiting lots, all open 24 hours. Anyone picking you up should wait there until you're outside with your bags; the terminal curbs are enforced and drivers who circle get moved along. The airport asks drivers to stay with their vehicle and keep waits to 30 minutes or less.",
  ],
  table: {
    head: ["Lot", "Spaces", "Amenities"],
    rows: [
      [
        "East Cell Phone Lot",
        "90",
        "Flight information displays, portable restrooms",
      ],
      [
        "West Cell Phone Lot",
        "90",
        "Flight information displays, portable restrooms",
      ],
      [
        "44th Street PHX Sky Train Station",
        "25",
        "Restrooms inside the station",
      ],
    ],
  },
};

export const airportGuides: readonly AirportGuide[] = [
  {
    airportSlug: "phx-sky-harbor",
    slug: "terminal-3",
    shortName: "Terminal 3",
    metaTitle:
      "Phoenix Airport Terminal 3: Airlines, Pickup & Sky Train | Nier",
    metaDescription:
      "Phoenix Sky Harbor Terminal 3 guide: all 14 airlines, where rideshare and private cars pick up, the Sky Train on Level 5, cell phone lots and the 2027 North Concourse expansion.",
    h1: "Phoenix Sky Harbor Terminal 3: Airlines, Pickup & Getting Around",
    lead: "Terminal 3 is Sky Harbor's second terminal, home to Delta, United, Alaska, Frontier and ten other airlines. Here's which airlines fly from it, where pickups happen, how to reach the Sky Train, and what the construction means for your trip.",
    facts: [
      {
        label: "Airlines",
        value: `${T3_AIRLINES.length}, including Delta, United and Alaska`,
      },
      { label: "Concourses", value: "North and South" },
      { label: "Sky Train", value: "Level 5 (via Ticketing, Level 4)" },
      {
        label: "Under construction",
        value: "Second North Concourse, 6 gates, 2027",
      },
    ],
    sections: [
      {
        heading: "Which airlines fly from Terminal 3?",
        paragraphs: [
          "Fourteen airlines operate from Terminal 3. If you're flying American or Southwest, you want Terminal 4 instead.",
        ],
        table: {
          caption: "Terminal 3 airlines (from skyharbor.com)",
          head: ["Airline"],
          rows: T3_AIRLINES.map((a) => [a]),
        },
      },
      {
        heading: "Where pickups happen at Terminal 3",
        paragraphs: [
          "Rideshare pickups (Uber, Lyft) use the south outer curb, except its far east end, and the far east end of the north outer curb. Order your ride once you have your bags and are ready to walk out; the airport asks riders not to request early.",
          "A private car works differently. With Nier, your chauffeur tracks your flight and either meets you inside at baggage claim with a name sign or texts you a door number at the curb, timed to when you actually walk out. There's no app queue and the fare was set when you booked.",
        ],
      },
      {
        heading: "Getting to the Sky Train from Terminal 3",
        paragraphs: [
          "The Terminal 3 Sky Train platform is on Level 5. From Ticketing on Level 4, take the escalators up into the station, then up again to the platform. The train is free, runs 24 hours, and connects Terminal 3 to Terminal 4, the 24th Street station, the Rental Car Center, East Economy parking and the 44th Street light rail station.",
        ],
      },
      {
        heading: "Terminal 3 construction (2026–2027)",
        paragraphs: [
          "Sky Harbor is building a second North Concourse at Terminal 3: about 173,000 square feet with six new gates, a mezzanine lounge and an outdoor terrace. The airport puts the budget at $368 million and expects completion in 2027. Until then, check the airport's roadway restrictions page before driving in, and leave a little extra time.",
        ],
      },
      CELL_LOT_SECTION,
    ],
    rideBox: {
      title: "Flying in or out of Terminal 3?",
      copy: "Book a flat-rate ride to or from Terminal 3, from $55. We track your flight and wait up to 60 minutes after landing.",
    },
    faqs: [
      {
        q: "What airlines are in Terminal 3 at Phoenix Sky Harbor?",
        a: `Fourteen: ${T3_AIRLINES.join(", ")}. American and Southwest are in Terminal 4.`,
      },
      {
        q: "Is Delta in Terminal 3 or Terminal 4 at PHX?",
        a: "Delta flies from Terminal 3, as do United, Alaska, Frontier, JetBlue and Hawaiian.",
      },
      {
        q: "How do I get from Terminal 3 to Terminal 4?",
        a: "Take the free PHX Sky Train. In Terminal 3 the platform is on Level 5, reached by escalator from Ticketing on Level 4. Trains run 24 hours, every 3½ to 7 minutes from 5 am to 10 pm.",
      },
      {
        q: "Where do Uber and Lyft pick up at Terminal 3?",
        a: "On the south outer curb (except its far east end) and the far east end of the north outer curb.",
      },
      {
        q: "Where should someone wait to pick me up at Terminal 3?",
        a: "At one of Sky Harbor's three free cell phone waiting lots, until you're outside with your bags. The curb is enforced and circling drivers are moved along.",
      },
    ],
    hero: {
      video: "/videos/terminal3.mp4",
      poster: "/images/other/skyHarborii.jpg",
      alt: "PHX Sky Train car arriving at a Sky Harbor station",
    },
    sources: [
      SRC_AIRLINES,
      SRC_SKYTRAIN,
      SRC_RIDESHARE,
      SRC_CELL_LOTS,
      {
        label: "Phoenix Sky Harbor: Terminal 3 North Concourse construction",
        href: "https://www.skyharbor.com/terminal3construction",
      },
    ],
  },
  {
    airportSlug: "phx-sky-harbor",
    slug: "terminal-4",
    shortName: "Terminal 4",
    metaTitle: "Phoenix Sky Harbor Terminal 4: Airlines, Pickup & Doors | Nier",
    metaDescription:
      "Phoenix Sky Harbor Terminal 4 guide: American, Southwest and 8 more airlines, rideshare pickup doors on Level 1, the Sky Train on Level 3, cell phone lots and the future West Terminal.",
    h1: "Phoenix Sky Harbor Terminal 4: Airlines, Pickup Doors & Getting Around",
    lead: "Terminal 4 is Sky Harbor's largest terminal: American, Southwest and most international flights. Here's which airlines use it, the exact pickup doors, how the Sky Train connects, and what's coming next.",
    facts: [
      {
        label: "Airlines",
        value: `${T4_AIRLINES.length}, including American and Southwest`,
      },
      { label: "Rideshare pickup", value: "Level 1, doors 1, 2, 6 and 8" },
      { label: "Sky Train", value: "Level 3, walk straight to security" },
      { label: "Opened", value: "1990; eighth concourse added 2022" },
    ],
    hero: {
      video: "/videos/terminal4.mp4",
      poster: "/images/other/skyHarbor.png",
      alt: "PHX Sky Train car arriving at a Sky Harbor station",
    },
    sections: [
      {
        heading: "Which airlines fly from Terminal 4?",
        paragraphs: [
          "Ten airlines operate from Terminal 4, including the two biggest at Phoenix, American and Southwest, plus most of the international carriers. Delta, United and Alaska are in Terminal 3.",
        ],
        table: {
          caption: "Terminal 4 airlines (from skyharbor.com)",
          head: ["Airline"],
          rows: T4_AIRLINES.map((a) => [a]),
        },
      },
      {
        heading: "Where pickups happen at Terminal 4",
        paragraphs: [
          "Arrivals and the pickup curbs are on Level 1. Rideshare pickups use the north outer curb at the far west end, outside door 1, and the south outer curb outside doors 2, 6 and 8. Request your ride once you have your bags.",
          "With a private car you skip the rideshare line. Your Nier chauffeur tracks your flight, then meets you inside at baggage claim with a name sign or texts you a Level 1 door number, timed to when you actually walk out.",
        ],
      },
      {
        heading: "The Sky Train at Terminal 4",
        paragraphs: [
          "Terminal 4's Sky Train station is on Level 3, and you can walk from the train directly to the security checkpoint. The train is free and runs 24 hours, connecting to Terminal 3, the Rental Car Center, East Economy parking and the 44th Street light rail station.",
        ],
      },
      {
        heading: "The newest concourse, and the next terminal",
        paragraphs: [
          "Terminal 4 opened in 1990. Its eighth concourse opened on June 20, 2022: eight gates used only by Southwest, built for $310 million.",
          "In September 2026 the city named American Airlines the primary carrier for a future West Terminal, west of Terminal 3. Construction is scheduled to start in 2029, with opening expected in 2033. For now, American stays in Terminal 4.",
        ],
      },
      CELL_LOT_SECTION,
    ],
    rideBox: {
      title: "Flying American or Southwest out of PHX?",
      copy: "Book a flat-rate ride to or from Terminal 4, from $55. We track your flight and wait up to 60 minutes after landing.",
    },
    faqs: [
      {
        q: "What airlines are in Terminal 4 at Phoenix Sky Harbor?",
        a: `Ten: ${T4_AIRLINES.join(", ")}. Delta, United, Alaska and the rest are in Terminal 3.`,
      },
      {
        q: "Is Southwest in Terminal 4?",
        a: "Yes. Southwest and American both fly from Terminal 4, and Southwest is the only airline in the eight-gate concourse that opened in 2022.",
      },
      {
        q: "What door is rideshare pickup at Terminal 4?",
        a: "Level 1: the north outer curb outside door 1, and the south outer curb outside doors 2, 6 and 8.",
      },
      {
        q: "Where is the Sky Train in Terminal 4?",
        a: "On Level 3. From the train you can walk straight to the security checkpoint.",
      },
      {
        q: "Do international flights arrive at Terminal 4?",
        a: "Most international airlines at PHX, including British Airways, Air France, Aeroméxico, Volaris, STARLUX and China Airlines, operate from Terminal 4. Air Canada and Porter use Terminal 3.",
      },
    ],
    sources: [
      SRC_AIRLINES,
      SRC_SKYTRAIN,
      SRC_RIDESHARE,
      SRC_CELL_LOTS,
      {
        label:
          "Aviation Pros: Sky Harbor opens Terminal 4 Eighth Concourse (2022)",
        href: "https://www.aviationpros.com/airports/press-release/21271558/phoenix-sky-harbor-international-airport-opens-new-eighth-concourse-at-terminal-4",
      },
      {
        label:
          "KJZZ: American named primary carrier for future terminal (Sept 2026)",
        href: "https://www.kjzz.org/business/2026-09-22/phoenix-sky-harbor-names-american-airlines-as-primary-carrier-for-future-terminal",
      },
    ],
  },
  {
    airportSlug: "phx-sky-harbor",
    slug: "sky-train",
    shortName: "PHX Sky Train",
    metaTitle: "PHX Sky Train: Stations, Hours & Map Guide (2026) | Nier",
    metaDescription:
      "The PHX Sky Train is free and runs 24/7. All six stations in order, how often trains run, where to board in Terminals 3 and 4, the light rail connection, and the Rental Car Center.",
    h1: "PHX Sky Train: Stations, Hours & How to Use It",
    lead: "The PHX Sky Train is Sky Harbor's free automated train. It runs 24 hours a day and links both terminals, the Rental Car Center, parking and Valley Metro light rail. Here's every station and when to use it.",
    facts: [
      { label: "Cost", value: "Free" },
      { label: "Hours", value: "24/7" },
      { label: "Frequency", value: "Every 3½–7 min, 5 am–10 pm" },
      { label: "Stations", value: "6" },
    ],
    hero: {
      video: "/videos/skyTram.mp4",
      poster: "/images/other/skytram.jpg",
      alt: "PHX Sky Train car arriving at a Sky Harbor station",
    },
    sections: [
      {
        heading: "Sky Train stations",
        paragraphs: [
          "Trains run in both directions, so check the lighted display for the destination before you board.",
        ],
        table: {
          head: ["Station", "What's there"],
          rows: [
            [
              "44th Street & Washington",
              "Valley Metro light rail connection, boarding-pass kiosks, light rail ticket machines (Level 2), a cell phone waiting lot and four-hour parking meters",
            ],
            [
              "East Economy",
              "Economy parking; circulator vehicles bring you from the uncovered lots to the station",
            ],
            [
              "Terminal 4",
              "Level 3, with a direct walk to the security checkpoint",
            ],
            [
              "Terminal 3",
              "Level 5, reached by escalator from Ticketing on Level 4",
            ],
            [
              "24th Street",
              "South of Buckeye Road, next to about 1,600 parking spaces on the airport's west side",
            ],
            [
              "Rental Car Center",
              "All rental car companies, connected east to both terminals",
            ],
          ],
        },
      },
      {
        heading: "Hours and how often trains run",
        paragraphs: [
          "The Sky Train runs 24 hours a day, 7 days a week, and costs nothing to ride. Between 5 am and 10 pm, trains come about every 3½ to 7 minutes. From 10 pm to 5 am, nightly maintenance can stretch waits to 15 minutes or more; overnight buses also run between the 44th Street station and both terminals.",
        ],
      },
      {
        heading: "When the Sky Train makes sense, and when it doesn't",
        bullets: [
          "Switching between Terminal 3 and Terminal 4: yes.",
          "Picking up a rental car: yes, it runs straight to the Rental Car Center.",
          "Arriving by Valley Metro light rail: yes, transfer at 44th Street.",
          "Parked in East Economy or at 24th Street: yes.",
          "Heading to a Scottsdale resort or home with luggage: a private car meeting you at the terminal is simpler, with no transfers and one flat fare.",
        ],
      },
      CELL_LOT_SECTION,
    ],
    rideBox: {
      title: "Skip the train and the rental car",
      copy: "A chauffeur meets you at your terminal and drives you door to door. Flat-rate Sky Harbor rides from $55.",
    },
    faqs: [
      {
        q: "Is the PHX Sky Train free?",
        a: "Yes. The Sky Train is free to ride for everyone.",
      },
      {
        q: "Does the PHX Sky Train run 24 hours?",
        a: "Yes, every day. Trains come every 3½ to 7 minutes from 5 am to 10 pm. Overnight maintenance can stretch waits to 15 minutes or more.",
      },
      {
        q: "What stops does the Sky Train make?",
        a: "Six: 44th Street & Washington (light rail), East Economy, Terminal 4, Terminal 3, 24th Street, and the Rental Car Center.",
      },
      {
        q: "How do I get from the airport to the light rail?",
        a: "Ride the Sky Train to the 44th Street & Washington station, which connects directly to Valley Metro light rail.",
      },
      {
        q: "Where do I catch the Sky Train in each terminal?",
        a: "Terminal 4: Level 3. Terminal 3: Level 5, by escalator from Ticketing on Level 4.",
      },
    ],
    sources: [SRC_SKYTRAIN, SRC_CELL_LOTS],
  },
];

export function getAirportGuide(airportSlug: string, slug: string) {
  return airportGuides.find(
    (g) => g.airportSlug === airportSlug && g.slug === slug,
  );
}

export function guidesForAirport(airportSlug: string) {
  return airportGuides.filter((g) => g.airportSlug === airportSlug);
}
