// src/lib/routes.ts
// Route ("A to B") money pages. Each entry covers BOTH directions of the
// pair on one canonical page — never create a separate reverse-direction
// page, or the two will compete as near-duplicates.
// Facts (miles, drive times, corridors) mirror the copy already used in
// cities.ts — if a number changes there, change it here too.

export type RouteData = {
  slug: string;
  origin: string;
  destination: string;
  metaTitle: string;
  metaDescription: string;
  heroLine: string;
  distance: string;
  driveTime: string;
  vehicles: string;
  overview: readonly string[];
  whyPrivate: readonly string[];
  bookCardCopy: string;
  faqs: readonly { q: string; a: string }[];
};

export const routesData: readonly RouteData[] = [
  {
    slug: "phoenix-to-scottsdale",
    origin: "Phoenix",
    destination: "Scottsdale",
    metaTitle: "Phoenix to Scottsdale Car Service | Nier Transportation",
    metaDescription:
      "Private car service between Phoenix and Scottsdale — flat rates, no surge pricing, door-to-door in 20–30 minutes. Sky Harbor pickups, resort and Old Town drop-offs, available 24/7.",
    heroLine:
      "Private, door-to-door car service between Phoenix and Scottsdale — flat rates, professional chauffeurs, and no surge pricing. Available 24/7 in both directions.",
    distance: "10–20 miles",
    driveTime: "20–30 minutes",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "The Phoenix–Scottsdale corridor is the busiest route we run. Via the Loop 101, Loop 202, and SR-51, most trips take 20–30 minutes depending on your pickup point — and our chauffeurs know which corridor is moving at any hour of the day.",
      "We handle Sky Harbor arrivals heading to Scottsdale resorts, Old Town dinner runs, Kierland and Fashion Square shopping trips, golf outings to TPC Scottsdale, and daily corporate rides between downtown Phoenix and the Scottsdale business corridor. Every ride is private: your vehicle, your schedule, no shared stops.",
      "Both directions are covered at the same flat rate — Phoenix to Scottsdale or Scottsdale to Phoenix, day or night, with real-time traffic monitoring so your pickup time is built around when you actually need to arrive.",
    ],
    whyPrivate: [
      "Flat rate booked in advance — no surge pricing on event nights",
      "Door-to-door: your exact pickup and drop-off, not a zone",
      "Professional chauffeur who knows resort entrances and valet lanes",
      "Flight tracking for every Sky Harbor pickup",
      "Sedans, SUVs, and sprinters for groups",
      "Available 24/7, both directions",
    ],
    bookCardCopy:
      "Lock in a flat rate between Phoenix and Scottsdale — book online in minutes or call (480) 300-6003 for an instant quote.",
    faqs: [
      {
        q: "How much is a car service from Phoenix to Scottsdale?",
        a: "It's a flat rate based on your exact pickup and drop-off points — no surge pricing, no meter. Book online or call (480) 300-6003 for an instant quote in both directions.",
      },
      {
        q: "How long is the drive from Phoenix to Scottsdale?",
        a: "Typically 20–30 minutes via the Loop 101, Loop 202, or SR-51, depending on where in each city you're starting and ending. We monitor live traffic and time your pickup accordingly.",
      },
      {
        q: "Do you pick up from Sky Harbor and take me to Scottsdale?",
        a: "Constantly — it's one of our most common rides. We track your flight, stage your chauffeur by terminal, and take you straight to your Scottsdale resort, home, or office.",
      },
      {
        q: "Do you also run Scottsdale to Phoenix?",
        a: "Yes — this page covers both directions at the same flat rate. Scottsdale to downtown Phoenix, Chase Field, Footprint Center, or Sky Harbor, any time of day.",
      },
      {
        q: "Is this better than a rideshare for this route?",
        a: "For a scheduled trip, yes: your rate is locked when you book, a professional chauffeur is assigned in advance, and there's no surge pricing when a game or concert lets out. You ride in a clean, private vehicle on your schedule.",
      },
      {
        q: "Can a group ride together?",
        a: "Yes — executive sprinters carry up to 14 passengers, and for larger groups we coordinate multiple vehicles under one booking and one invoice.",
      },
    ],
  },
  {
    slug: "tucson-to-phoenix",
    origin: "Tucson",
    destination: "Phoenix",
    metaTitle: "Tucson to Phoenix Car Service | Nier Transportation",
    metaDescription:
      "Private car service between Tucson and Phoenix — 115 miles door-to-door in about 90 minutes. The comfortable alternative to shared shuttles: flat rates, no stops, no strangers. Sky Harbor transfers included.",
    heroLine:
      "Direct, private car service between Tucson and Phoenix — about 115 miles and 90 minutes on I-10, door to door. No shared shuttles, no stops, no strangers.",
    distance: "About 115 miles",
    driveTime: "About 90 minutes",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "The Tucson–Phoenix run is one of the most traveled corridors in Arizona, and we cover it daily in both directions. Your chauffeur picks you up at your door — home, hotel, the University of Arizona, or Tucson International — and takes you straight through on I-10 with no shared stops.",
      "Business travelers use this route to connect between the two metros without flying; families use it for UA games, graduations, and Sky Harbor connections when a Tucson flight doesn't line up. Either way, you get a quiet cabin, Wi-Fi-friendly ride time, and a flat intercity rate quoted before you book.",
      "Heading to a flight? We build in the right buffer for Sky Harbor security lines and monitor I-10 conditions in real time, so an early departure never turns into a stressful sprint.",
    ],
    whyPrivate: [
      "Private door-to-door — not a shared shuttle with multiple stops",
      "Flat intercity rate quoted before you book",
      "About 90 minutes of quiet, productive cabin time",
      "Sky Harbor and Tucson International transfers with flight tracking",
      "Sedans, SUVs, and sprinters for groups",
      "Both directions, any day, any hour",
    ],
    bookCardCopy:
      "Skip the shared shuttle — ride private between Tucson and Phoenix at a flat rate. Book online or call (480) 300-6003 for an instant quote.",
    faqs: [
      {
        q: "Do you run a shared shuttle from Tucson to Phoenix?",
        a: "No — and that's the point. Every ride is a private vehicle, door to door, with no shared stops and no strangers. You leave on your schedule and ride straight through.",
      },
      {
        q: "How much does a car service from Tucson to Phoenix cost?",
        a: "It's a flat intercity rate based on your exact pickup and drop-off — no meter, no surge. Call (480) 300-6003 or book online for an instant quote in either direction.",
      },
      {
        q: "How long does the drive take?",
        a: "About 90 minutes for the 115-mile run on I-10, depending on your exact endpoints and traffic. We monitor conditions in real time and plan your departure around your arrival time.",
      },
      {
        q: "Can you take me straight to Sky Harbor for a flight?",
        a: "Yes — Tucson-to-Sky-Harbor transfers are a core part of this route. We build in an appropriate buffer for check-in and security, and adjust your pickup if I-10 conditions change.",
      },
      {
        q: "Do you also run Phoenix to Tucson?",
        a: "Yes — both directions at the same flat rate, including pickups anywhere in the Valley and drop-offs at the University of Arizona, downtown Tucson, or Tucson International (TUS).",
      },
      {
        q: "Can a group travel together?",
        a: "Yes — executive sprinters seat up to 14, and multi-vehicle bookings run under one coordinator and one invoice for larger groups.",
      },
    ],
  },
  {
    slug: "phoenix-to-sedona",
    origin: "Phoenix",
    destination: "Sedona",
    metaTitle: "Phoenix to Sedona Car Service | Nier Transportation",
    metaDescription:
      "Private door-to-door car service from Phoenix to Sedona — about two hours through Oak Creek Canyon country without renting a car. Flat rates, resort drop-offs, photo stops on request.",
    heroLine:
      "Private, door-to-door transfers between Phoenix and Sedona — about 115 miles and two hours via I-17 and SR-89A, with a chauffeur who knows every switchback and scenic pull-off.",
    distance: "About 115 miles",
    driveTime: "About 2 hours",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "Sedona is one of the most beautiful drives in the Southwest — and the easiest way to enjoy it is from the back seat. We pick you up anywhere in the Valley, including straight off your flight at Sky Harbor, and take you door-to-door to your Sedona resort or rental with no shuttle vans and no shared stops.",
      "Our chauffeurs run this route regularly and know when the first red rock views appear near Oak Creek Canyon — and where to stop if you want a photo on the way in. Guests headed to Enchantment, L'Auberge, and the uptown resorts ride this route with us year-round.",
      "Corporate retreats and group trips are common on this corridor too: we coordinate multi-vehicle transfers from PHX for groups of any size, all under one booking.",
    ],
    whyPrivate: [
      "Door-to-door from anywhere in the Valley — no rental car needed",
      "Flat rate quoted before you book",
      "Chauffeurs experienced on the mountain switchback routes",
      "Photo stops on request on the way in",
      "Resort drop-offs: Enchantment, L'Auberge, and uptown Sedona",
      "Group transfers via sprinter or multiple vehicles",
    ],
    bookCardCopy:
      "Ride to the red rocks without the drive — flat-rate private transfers between Phoenix and Sedona. Book online or call (480) 300-6003.",
    faqs: [
      {
        q: "How much is a private car from Phoenix to Sedona?",
        a: "It's a flat rate for the route, quoted before you book — no meter running for two hours. Call (480) 300-6003 or book online for an instant quote, one-way or round trip.",
      },
      {
        q: "How long is the drive from Phoenix to Sedona?",
        a: "About two hours for the 115-mile trip via I-17 and SR-89A, depending on your Valley pickup point and traffic. The final stretch through Oak Creek Canyon country is the scenic payoff.",
      },
      {
        q: "Can we stop for photos on the way?",
        a: "Yes — just ask. Our chauffeurs know the best pull-offs for that first red rock view and are happy to build a quick stop into the trip.",
      },
      {
        q: "Do you pick up at Sky Harbor and go straight to Sedona?",
        a: "Yes — we track your flight, meet you at the terminal, and drive straight through to your Sedona resort or rental. It's the simplest way to start a Sedona trip without renting a car.",
      },
      {
        q: "Do you do round trips or day trips?",
        a: "Both. We can run a one-way transfer, a same-day round trip, or a multi-day return — tell us your dates and we'll quote the whole itinerary as a flat rate.",
      },
      {
        q: "Do you also run Sedona back to Phoenix?",
        a: "Yes — both directions at the same flat rate, including early departures timed to Sky Harbor flights.",
      },
    ],
  },
  {
    slug: "flagstaff-to-phoenix",
    origin: "Flagstaff",
    destination: "Phoenix",
    metaTitle: "Flagstaff to Phoenix Airport Car Service | Nier Transportation",
    metaDescription:
      "Private car service between Flagstaff and Phoenix Sky Harbor — about 145 miles and two hours on I-17, door to door. Flat rates, flight-timed departures, chauffeurs comfortable on mountain grades in all conditions.",
    heroLine:
      "Direct, private transfers between Flagstaff and Phoenix — about 145 miles and two hours on I-17, with departures timed to your Sky Harbor flight and chauffeurs comfortable on mountain grades in all conditions.",
    distance: "About 145 miles",
    driveTime: "About 2 hours",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "Flagstaff sits at 7,000 feet, two hours north of the Valley — and for most travelers, a private car to Sky Harbor beats the small local airport or a long-term parking gamble. We pick you up at your door in Flagstaff and time the departure around your flight, with buffer built in for I-17 conditions.",
      "This corridor runs year-round: NAU students and parents, Grand Canyon visitors connecting through Phoenix, ski-season travelers headed to Arizona Snowbowl, and executives traveling between the two cities. Our chauffeurs run I-17's mountain grades in all conditions, including winter weather.",
      "Both directions are covered at a flat intercity rate — Phoenix to Flagstaff for a mountain weekend, or Flagstaff to Sky Harbor for a 6 a.m. departure.",
    ],
    whyPrivate: [
      "Departures timed to your Sky Harbor flight, with weather buffer",
      "Chauffeurs comfortable on I-17 mountain grades in all conditions",
      "Flat intercity rate — no meter for the two-hour run",
      "Door-to-door from anywhere in Flagstaff or the Valley",
      "NAU, Snowbowl, and Grand Canyon traveler friendly",
      "Both directions, year-round",
    ],
    bookCardCopy:
      "Make the mountain run easy — flat-rate private transfers between Flagstaff and Phoenix, timed to your flight. Book online or call (480) 300-6003.",
    faqs: [
      {
        q: "How much is a car from Flagstaff to Phoenix Sky Harbor?",
        a: "It's a flat intercity rate quoted before you book — no meter for the two-hour drive. Call (480) 300-6003 or book online for an instant quote in either direction.",
      },
      {
        q: "How early should we leave Flagstaff for a Sky Harbor flight?",
        a: "We plan that for you: the drive is about two hours, and we add buffer for I-17 conditions, security lines, and your airline's check-in window, then confirm the pickup time with you the day before.",
      },
      {
        q: "Do you drive in winter weather?",
        a: "Yes — our chauffeurs are comfortable on I-17's mountain grades in all conditions, and we monitor weather and road status in real time. If conditions require extra time, we build it in.",
      },
      {
        q: "Do you serve NAU students and parents?",
        a: "Constantly — move-in weekends, breaks, and graduation are some of our busiest Flagstaff dates. Book early for those windows.",
      },
      {
        q: "Do you also run Phoenix to Flagstaff?",
        a: "Yes — both directions at the same flat rate, including Valley pickups straight off a Sky Harbor arrival.",
      },
      {
        q: "Can you take a group?",
        a: "Yes — executive sprinters seat up to 14, and larger groups run as multi-vehicle bookings under one coordinator and one invoice.",
      },
    ],
  },
  {
    slug: "phoenix-to-prescott",
    origin: "Phoenix",
    destination: "Prescott",
    metaTitle: "Phoenix to Prescott Car Service | Nier Transportation",
    metaDescription:
      "Private door-to-door car service between Phoenix and Prescott — about 100 miles and 90 minutes via I-17 and SR-69. Flat rates, Embry-Riddle and Whiskey Row drop-offs, scenic route on request.",
    heroLine:
      "Private, flat-rate transfers between Phoenix and Prescott — about 100 miles and 90 minutes via I-17 and SR-69, door to door in both directions.",
    distance: "About 100 miles",
    driveTime: "About 90 minutes",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "Prescott gives you mountain elevation without the full Flagstaff drive — which makes it one of the Valley's favorite escapes, and one of our most consistent long-distance routes. We pick you up anywhere in the metro, including Sky Harbor, and take you door-to-door to Whiskey Row, Courthouse Plaza, or your Prescott address.",
      "The corridor also runs on business: Embry-Riddle Aeronautical University, the healthcare network, and a steady flow of executives moving between the two cities. We serve it all at a flat intercity rate, both directions.",
      "Not in a rush? Ask about the SR-89 scenic route — our chauffeurs know it well and are happy to make the drive part of the trip.",
    ],
    whyPrivate: [
      "Flat intercity rate quoted before you book",
      "Door-to-door: Whiskey Row, Courthouse Plaza, Embry-Riddle, or home",
      "About 90 minutes of comfortable, private cabin time",
      "SR-89 scenic route available on request",
      "Sky Harbor pickups with flight tracking",
      "Both directions, any day",
    ],
    bookCardCopy:
      "Head for the mountain air without the drive — flat-rate private transfers between Phoenix and Prescott. Book online or call (480) 300-6003.",
    faqs: [
      {
        q: "How much is a car service from Phoenix to Prescott?",
        a: "It's a flat intercity rate based on your exact pickup and drop-off — quoted before you book, no meter. Call (480) 300-6003 or book online for an instant quote.",
      },
      {
        q: "How long is the drive?",
        a: "About 90 minutes for the 100-mile run via I-17 and SR-69, depending on your Valley starting point. We monitor traffic and time your pickup around your arrival.",
      },
      {
        q: "Can we take the scenic route?",
        a: "Yes — if you're not in a rush, ask about SR-89. Our chauffeurs know the corridor well and can make the drive part of the experience.",
      },
      {
        q: "Do you drop off at Embry-Riddle?",
        a: "Yes — Embry-Riddle Aeronautical University runs are common on this route, including move-ins, visits, and graduation weekends.",
      },
      {
        q: "Do you also run Prescott to Phoenix?",
        a: "Yes — both directions at the same flat rate, including early departures timed to Sky Harbor flights.",
      },
    ],
  },
] as const;

// Guard: fail fast if a route slug is ever duplicated.
const seenRouteSlugs = new Set<string>();
for (const r of routesData) {
  if (seenRouteSlugs.has(r.slug)) {
    throw new Error(`Duplicate route slug in routesData: "${r.slug}"`);
  }
  seenRouteSlugs.add(r.slug);
}