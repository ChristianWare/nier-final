// src/lib/airports.ts
// Per-airport money pages. Same discipline as routes.ts: facts (drive
// times, corridors, carriers) mirror the copy in cities.ts — if a number
// changes there, change it here too.

export type AirportData = {
  slug: string;
  code: string; // IATA
  name: string; // full official name
  shortName: string; // how riders say it
  h1: string;
  metaTitle: string;
  metaDescription: string;
  heroLine: string;
  terminals: string;
  driveTime: string;
  vehicles: string;
  overview: readonly string[];
  pickupHighlights: readonly string[];
  bookCardCopy: string;
  faqs: readonly { q: string; a: string }[];
};

export const airportsData: readonly AirportData[] = [
  {
    slug: "phx-sky-harbor",
    code: "PHX",
    name: "Phoenix Sky Harbor International Airport",
    shortName: "Sky Harbor",
    h1: "PHX Sky Harbor Airport Car Service",
    metaTitle: "PHX Sky Harbor Airport Car Service | Nier Transportation",
    metaDescription:
      "Private car service to and from Phoenix Sky Harbor (PHX) — flight-tracked pickups at Terminals 3 & 4, meet & greet or curbside, flat rates, available 24/7. Serving Scottsdale, Paradise Valley, and the entire Valley since 2004.",
    heroLine:
      "Flight-tracked, flat-rate car service to and from Sky Harbor — meet & greet at baggage claim or curbside pickup timed to the minute you land. Available 24/7 across the entire Valley.",
    terminals: "Terminals 3 & 4",
    driveTime: "15–30 min from most of the Valley",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "Sky Harbor is the busiest airport in Arizona, and it's the run we've made more than any other since 2004. We serve both passenger terminals — Terminal 4 for American, Southwest, and most international arrivals, Terminal 3 for Delta, United, and the rest — with chauffeurs who stage by terminal, not by the cell phone lot.",
      "Arrivals are simple: we track your flight from wheels-up, so a delay never strands you and an early landing never catches us off guard. Choose meet & greet — your chauffeur inside baggage claim with a name sign — or curbside, where we coordinate by text and pull to your terminal's passenger pickup curb the moment you're out the door. No circling, no confusion about which level you're on.",
      "Departures get the same treatment in reverse. We build your pickup time around live traffic and your terminal's security lines, which matters most for the 4am and 5am departures rideshare drivers routinely decline. Early flights, red-eyes, corporate accounts, and full flight-crew transfers — all covered, every day of the year.",
    ],
    pickupHighlights: [
      "Flight tracking on every pickup — delays and early arrivals handled automatically",
      "Meet & greet inside baggage claim, or curbside coordinated by text",
      "Chauffeurs staged by terminal: T4 and T3 covered",
      "4am departures confirmed the night before — never declined",
      "Flat rates to and from anywhere in the Valley",
      "Corporate accounts, group, and crew transfers under one booking",
    ],
    bookCardCopy:
      "Lock in a flat-rate Sky Harbor transfer — book online in minutes or call (480) 300-6003 for an instant quote, any terminal, any hour.",
    faqs: [
      {
        q: "Which terminals do you pick up from at Sky Harbor?",
        a: "Both passenger terminals — Terminal 4 (American, Southwest, most international) and Terminal 3 (Delta, United, and others). Your chauffeur stages by your specific terminal and adjusts automatically if your airline or gate changes.",
      },
      {
        q: "How does pickup work after I land?",
        a: "Your choice: meet & greet, where your chauffeur waits inside baggage claim with a name sign, or curbside, where we text as you land and pull to your terminal's passenger pickup curb when you walk out. Either way, your flight is tracked the whole way in.",
      },
      {
        q: "What happens if my flight is delayed?",
        a: "Nothing you need to manage — we track the flight, not the clock. Your chauffeur's arrival adjusts to the actual wheels-down time at no extra charge, whether you land early or hours late.",
      },
      {
        q: "How early should I book a pickup for a 6am flight?",
        a: "Book the night before at the latest, and we'll confirm your pickup time built around live traffic and terminal security lines. Early departures are a specialty — it's the ride rideshare apps are least reliable for.",
      },
      {
        q: "How much does a car service to Sky Harbor cost?",
        a: "It's a flat rate based on your exact pickup point — no surge pricing, no meter running in traffic. Book online or call (480) 300-6003 for an instant quote from anywhere in the Valley.",
      },
      {
        q: "Do you handle group or flight-crew pickups?",
        a: "Yes — executive Sprinters carry up to 14 passengers, and for larger groups or recurring crew transfers we coordinate multiple vehicles under one booking and one invoice.",
      },
    ],
  },
  {
    slug: "mesa-gateway",
    code: "AZA",
    name: "Phoenix–Mesa Gateway Airport",
    shortName: "Mesa Gateway",
    h1: "Phoenix–Mesa Gateway Airport Car Service",
    metaTitle: "Mesa Gateway Airport (AZA) Car Service | Nier Transportation",
    metaDescription:
      "Private car service to and from Phoenix–Mesa Gateway Airport (AZA) — flat rates, flight-tracked pickups, single-terminal simplicity. Serving Mesa, Gilbert, Chandler, Queen Creek, and the entire Valley.",
    heroLine:
      "Flat-rate private transfers to and from Mesa Gateway — the East Valley's fast-growing alternative to Sky Harbor, with single-terminal pickups that take minutes, not laps.",
    terminals: "Single terminal",
    driveTime: "20–45 min depending on pickup point",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "Phoenix–Mesa Gateway (AZA) is the Valley's growing alternative to Sky Harbor, serving Allegiant, Southwest, and several charter carriers from a single, easy terminal on the East Valley side. For travelers in Mesa, Gilbert, Chandler, and Queen Creek, it's often the faster door-to-gate option — and we cover it daily in both directions.",
      "Pickups at Gateway are refreshingly simple: one terminal, one curb. We track your flight, text as you land, and meet you at the curb or inside the terminal — whichever you prefer. No terminal confusion, no long walk, no waiting.",
      "We also handle the cross-airport cases Gateway travelers run into: AZA arrivals connecting to Sky Harbor departures, East Valley residents choosing between the two airports, and snowbird season's heavy Allegiant schedule. One call covers either airport at a flat rate.",
    ],
    pickupHighlights: [
      "Single-terminal pickups — at the curb minutes after you land",
      "Flight tracking on every arrival, including delays",
      "Flat rates across Mesa, Gilbert, Chandler, and Queen Creek",
      "Sky Harbor ↔ Gateway cross-airport transfers covered",
      "Early-morning Allegiant departures confirmed the night before",
      "Sedans, SUVs, and Sprinters for families and groups",
    ],
    bookCardCopy:
      "Flat-rate transfers to and from Mesa Gateway — book online or call (480) 300-6003 for an instant quote anywhere in the East Valley and beyond.",
    faqs: [
      {
        q: "Where do you meet me at Mesa Gateway?",
        a: "Gateway has a single terminal, which keeps it simple: we track your flight, text when you land, and meet you at the passenger pickup curb — or inside the terminal if you'd prefer a meet & greet.",
      },
      {
        q: "Is Gateway easier than Sky Harbor for East Valley travelers?",
        a: "Often, yes — if your route flies from AZA, the drive is shorter from Mesa, Gilbert, Chandler, and Queen Creek, and the single terminal makes both drop-off and pickup faster. We serve both airports, so you can choose by flight, not by ride logistics.",
      },
      {
        q: "How much is a car service to Mesa Gateway?",
        a: "It's a flat rate based on your exact pickup point — no surge, no meter. Book online or call (480) 300-6003 for an instant quote from anywhere in the Valley.",
      },
      {
        q: "Can you take me from a Gateway arrival to Sky Harbor?",
        a: "Yes — cross-airport transfers between AZA and PHX are a regular run for us, with your second flight's timing built into the pickup plan.",
      },
      {
        q: "Do you cover early Allegiant departures?",
        a: "Every day. Early flights are confirmed the night before with a pickup time built around live traffic — the exact scenario where a scheduled chauffeur beats hoping a rideshare accepts.",
      },
    ],
  },
  {
    slug: "scottsdale-airport",
    code: "SDL",
    name: "Scottsdale Airport",
    shortName: "Scottsdale Airport",
    h1: "Scottsdale Airport (SDL) Car Service",
    metaTitle:
      "Scottsdale Airport (SDL) Car Service | Private Aviation | Nier Transportation",
    metaDescription:
      "Discreet car service for Scottsdale Airport (SDL) private aviation — FBO and planeside coordination, unmarked vehicle options, corporate accounts. Serving the Scottsdale Airpark and all of Metro Phoenix.",
    heroLine:
      "Discreet, planeside-coordinated car service for Scottsdale Airport's private aviation traffic — timed to your tail number, staged at your FBO, with unmarked vehicle options for low-profile arrivals.",
    terminals: "FBO / private aviation",
    driveTime: "Minutes from North Scottsdale & Paradise Valley",
    vehicles: "Sedans, SUVs & Sprinters",
    overview: [
      "Scottsdale Airport (SDL) is general aviation only — no commercial airlines, just private jets, charters, and corporate flight departments moving through the FBOs at the heart of the Scottsdale Airpark. It's a different kind of airport run, and we've built the service to match it.",
      "We coordinate directly with your flight crew or broker around your tail number and ETA, stage at your FBO before wheels-down, and load planeside or at the FBO lobby — whichever the ramp allows. For clients who prefer a low-profile arrival, unmarked vehicle options are available, a courtesy our Paradise Valley clients use constantly.",
      "From SDL, most of our drop-offs are minutes away: North Scottsdale resorts, Paradise Valley estates, Airpark offices, and TPC Scottsdale. And when a commercial connection is part of the itinerary, we run the SDL ↔ Sky Harbor transfer with the same timing discipline.",
    ],
    pickupHighlights: [
      "FBO staging and planeside loading, coordinated with your crew",
      "Timed to your tail number's actual ETA — not a guess",
      "Unmarked vehicle options for discreet arrivals",
      "Minutes from North Scottsdale, Paradise Valley, and the Airpark",
      "SDL ↔ Sky Harbor connections for mixed itineraries",
      "Corporate accounts with consolidated billing",
    ],
    bookCardCopy:
      "Arrange FBO pickup or drop-off at Scottsdale Airport — book online or call (480) 300-6003 and we'll coordinate directly with your flight crew.",
    faqs: [
      {
        q: "Can you meet the aircraft planeside at SDL?",
        a: "Where the FBO and ramp rules allow, yes — otherwise your chauffeur is staged at the FBO lobby before wheels-down. Either way, we coordinate with your crew or broker around the tail number's actual ETA.",
      },
      {
        q: "Do commercial airlines fly into Scottsdale Airport?",
        a: "No — SDL is general aviation only. Commercial flights use Sky Harbor (PHX) or Mesa Gateway (AZA), and we serve all three, including transfers between them on mixed itineraries.",
      },
      {
        q: "Do you offer unmarked vehicles?",
        a: "Yes — low-profile, unmarked vehicle options are available on request for clients who prefer a discreet arrival, at no change to the flat rate.",
      },
      {
        q: "Can my company set up an account for recurring SDL trips?",
        a: "Yes — corporate accounts get consolidated billing, saved preferences, and priority scheduling, which is how most of our Airpark and flight-department clients run it.",
      },
      {
        q: "How much notice do you need for an SDL pickup?",
        a: "As much as your schedule allows, but private aviation moves — call (480) 300-6003 for short-notice coordination and we'll work to your revised ETA, not the original plan.",
      },
    ],
  },
];
