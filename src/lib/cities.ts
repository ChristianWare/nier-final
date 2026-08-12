import Scottsdale from "../../public/images/areas/scottsdale.jpg";
import Phoenix from "../../public/images/areas/phoenix.jpg";
import Tempe from "../../public/images/areas/tempe.jpg";
import Mesa from "../../public/images/areas/mesa.jpg";
import Chandler from "../../public/images/areas/chandler.jpg";
import Gilbert from "../../public/images/areas/gilbert.webp";
import Peoria from "../../public/images/areas/westValleyiii.jpg";
import Glendale from "../../public/images/areas/westValleyii.jpg";
import ParadiseValley from "../../public/images/areas/yuma.jpg";
import type { StaticImageData } from "next/image";

// NOTE: FAQ answers currently describe flat rates without dollar amounts.
// When real pricing is confirmed, add "from $X" figures back into the
// airport/hourly answers — concrete prices improve CTR and conversions.

export const serviceAreaCities = [
  {
    name: "Scottsdale",
    slug: "scottsdale",
    note: "Home to world-class golf courses like TPC Scottsdale and Troon North",
    src: Scottsdale,
    airportNote:
      "Scottsdale sits about 15 minutes from PHX via the 101 and 202 — one of the most efficient airport corridors in the Valley. We also serve Scottsdale Airport (SDL) directly for private aviation and FBO passengers.",
    corporateNote:
      "Scottsdale's corporate corridor runs from SkySong Innovation Center through the Kierland and DC Ranch office parks. We run more executive airport pickups and corporate account rides out of Scottsdale than any other city we serve.",
    localContext:
      "From Old Town dining and nightlife to Kierland Commons and Fashion Square, Scottsdale is one of the most active markets in the Valley for both leisure and corporate ground transportation. Our chauffeurs know the resort entrances, valet lanes, and golf bag drop points across every major property.",
    localLandmarks: [
      "TPC Scottsdale",
      "Troon North Golf Club",
      "Kierland Commons",
      "Old Town Scottsdale",
      "SkySong Innovation Center",
      "Scottsdale Fashion Square",
    ],
    routePromo: {
      href: "/routes/scottsdale-to-sky-harbor",
      anchor: "book a flat-rate Scottsdale to Sky Harbor car service",
      blurb: "Catching a flight out of PHX?",
    },
    faqs: [
      {
        q: "How much is a black car from Scottsdale to Sky Harbor Airport?",
        a: "Scottsdale-to-PHX transfers are a flat rate — no surge pricing, no meter running. Your exact rate depends on pickup location; book online or call (480) 300-6003 for an instant quote. The drive runs roughly 20–30 minutes, and we track your flight so pickup timing adjusts automatically.",
      },
      {
        q: "Do you serve Scottsdale Airport (SDL) and private aviation?",
        a: "Yes. We handle FBO pickups and drop-offs at Scottsdale Airport for private and corporate flyers, with chauffeurs staged to your wheels-down time.",
      },
      {
        q: "Do you provide golf transportation in Scottsdale?",
        a: "Golf outings are one of our core services — TPC Scottsdale, resort courses, and group rounds. During WM Phoenix Open week we run dedicated event logistics; book early, that week fills fast.",
      },
      {
        q: "Can I book an hourly chauffeur for a night in Old Town Scottsdale?",
        a: "Yes — flat hourly service keeps your chauffeur with you all evening: dinner, Old Town, and a safe ride home, with no surge pricing at closing time. Book online or call for current hourly rates.",
      },
      {
        q: "Where is Nier Transportation based?",
        a: "We're headquartered right here in Scottsdale on Via Linda and have served the Valley since 2004 — Scottsdale isn't a service-area checkbox for us, it's home.",
      },
    ],
  },
  {
    name: "Phoenix",
    slug: "phoenix",
    note: "Served by Sky Harbor International Airport (PHX)",
    src: Phoenix,
    airportNote:
      "Black car service to the Phoenix airport is the ride we run most. Sky Harbor International sits at the center of the city — Terminals 3 and 4 handle all commercial flights — and we monitor every inbound flight and adjust pickup timing automatically, so your driver is staged when you land, not when you were scheduled to land.",
    corporateNote:
      "Downtown Phoenix is home to major law firms, financial institutions, and the Phoenix Convention Center. Biltmore and Camelback corridors house dozens of Fortune 500 regional offices. We serve corporate accounts across all of them with centralized billing and consistent chauffeurs.",
    localContext:
      "Phoenix is our home market. We've been running car service in Phoenix since 2004 — black cars, SUVs, and Sprinters — which means our chauffeurs know the city's traffic patterns, event schedules, and venue access points at a level that GPS alone can't replicate. From Footprint Center to the Biltmore, we've run rides everywhere in this city.",
    localLandmarks: [
      "Phoenix Sky Harbor International Airport (PHX)",
      "Footprint Center",
      "Chase Field",
      "Phoenix Convention Center",
      "Biltmore Fashion Park",
      "Arizona State Capitol",
    ],
    routePromo: {
      href: "/airports/phx-sky-harbor",
      anchor: "see how Sky Harbor pickups work, terminal by terminal",
      blurb: "Flying in or out of PHX?",
    },
    faqs: [
      {
        q: "How much does a black car to Sky Harbor cost from Phoenix?",
        a: "Airport transfers are a flat rate with free flight tracking and no surge pricing — book online or call (480) 300-6003 for an instant quote. We stage chauffeurs based on live traffic and departure data, so early flights and late arrivals are never a problem.",
      },
      {
        q: "Do you handle group transportation in Phoenix?",
        a: "Yes — executive sprinters, mini party buses, and full-size motorcoaches for corporate groups, weddings, and events. One coordinator, one invoice, and vehicles matched to your headcount.",
      },
      {
        q: "Can you pick up from downtown Phoenix events?",
        a: "We run Chase Field, Footprint Center, and Phoenix Convention Center pickups constantly. Your chauffeur pre-positions near the venue so you're not waiting in the post-event rideshare scrum.",
      },
      {
        q: "Do you offer corporate accounts in Phoenix?",
        a: "Yes — recurring rides, priority booking, and monthly invoicing for Phoenix-area companies. Many of our corporate clients have been with us for over a decade.",
      },
      {
        q: "How far in advance should I book?",
        a: "We recommend 24 hours for standard rides and 48+ hours for event nights and holiday weekends, but we take last-minute bookings whenever a vehicle is available — call (480) 300-6003 to check.",
      },
    ],
  },
  {
    name: "Tempe",
    slug: "tempe",
    note: "Home to Arizona State University and Tempe Marketplace",
    src: Tempe,
    airportNote:
      "Tempe is one of the closest cities to Sky Harbor — PHX is literally minutes away via the 143. For business travelers flying in and out of ASU or the Tempe corridor, airport transfers from here are some of the most efficient in the entire metro.",
    corporateNote:
      "Tempe's Mill Avenue and Rio Salado corridors have attracted a growing number of tech and financial firms. State Farm, ADP, and other major employers have significant Tempe operations. We serve corporate accounts here with the same billing and profile management available across all our markets.",
    localContext:
      "Tempe sits at the intersection of three of the Valley's busiest freeways — the 10, 60, and 202 — making it a natural hub for ground transportation. Whether it's an early morning flight out of PHX, a corporate event at Tempe Town Lake, or a night out on Mill Avenue, we've covered this market for years.",
    localLandmarks: [
      "Arizona State University",
      "Tempe Town Lake",
      "Mill Avenue District",
      "Tempe Marketplace",
      "Mountain America Stadium (ASU)",
      "Phoenix Sky Harbor Airport (adjacent)",
    ],
  },
  {
    name: "Mesa",
    slug: "mesa",
    note: "Served by Phoenix-Mesa Gateway Airport (AZA)",
    src: Mesa,
    airportNote:
      "Mesa is home to Phoenix-Mesa Gateway Airport (AZA) — a growing alternative to Sky Harbor that serves Allegiant, Southwest, and several charter carriers. We handle both AZA pickups and drop-offs, as well as PHX transfers for Mesa residents who prefer Sky Harbor.",
    corporateNote:
      "Mesa's East Valley business park developments along the 202 and Dobson corridors have added thousands of corporate jobs over the past decade. Boeing, Banner Health, and major logistics operations all run out of Mesa. We serve corporate accounts across these campuses with consolidated billing.",
    localContext:
      "Mesa is the third-largest city in Arizona and one of our highest-volume East Valley markets. With two airports in play and a growing corporate base, we handle everything from early morning AZA drop-offs to event transportation at the Mesa Arts Center and Sloan Park.",
    localLandmarks: [
      "Phoenix-Mesa Gateway Airport (AZA)",
      "Sloan Park",
      "Mesa Arts Center",
      "Superstition Springs",
      "Chicago Cubs Spring Training",
      "Banner Gateway Medical Center",
    ],
    routePromo: {
      href: "/airports/phx-sky-harbor",
      anchor: "see how Sky Harbor pickups work, terminal by terminal",
      blurb: "Flying in or out of PHX?",
    },
  },
  {
    name: "Chandler",
    slug: "chandler",
    note: "A major corporate and tech hub in the East Valley",
    src: Chandler,
    airportNote:
      "Chandler sits about 25 minutes from PHX via the 202 — a straightforward corridor that our chauffeurs navigate daily. We time departures based on live traffic data so you arrive with time to spare without leaving earlier than necessary.",
    corporateNote:
      "Chandler's Price Road Corridor is one of the most concentrated tech employment zones in Arizona. Intel's Ocotillo campus, PayPal, Wells Fargo's technology hub, and dozens of semiconductor and financial firms are all based here. We run more corporate account rides per square mile out of Chandler than almost any other city we serve.",
    localContext:
      "Chandler has transformed from a farming community into one of the most economically significant cities in the Southwest. The combination of major corporate campuses, Chandler Fashion Center, and a growing restaurant and hospitality scene makes it one of our most active East Valley markets for both business and leisure transportation.",
    localLandmarks: [
      "Intel Ocotillo Campus",
      "Chandler Fashion Center",
      "Price Road Corridor",
      "Wild Horse Pass Resort",
      "Chandler Center for the Arts",
      "PayPal Chandler Campus",
    ],
    routePromo: {
      href: "/routes/chandler-to-sky-harbor",
      anchor: "book a flat-rate Chandler to Sky Harbor car service",
      blurb: "Flying out of PHX from the East Valley?",
    },
  },
  {
    name: "Gilbert",
    slug: "gilbert",
    note: "One of the fastest-growing communities in the East Valley",
    src: Gilbert,
    airportNote:
      "Gilbert is about 30 minutes from PHX via the 202 — a reliable corridor that our chauffeurs run multiple times daily. We track flight status from the moment your ride is booked so your driver is adjusted automatically if your departure or arrival changes.",
    corporateNote:
      "Gilbert's Heritage District and SanTan Village area have become anchors for a growing professional community. The city's rapid residential growth has brought corporate demand alongside it — particularly for recurring rides and airport transfers for executives who've relocated here from other metros.",
    localContext:
      "Gilbert is one of the fastest-growing cities in the entire United States, and our presence here has grown alongside it. From Heritage District dining and events to SanTan Village shopping and the new medical district along Williams Field Road, we cover the full range of Gilbert's transportation needs.",
    localLandmarks: [
      "Heritage District",
      "SanTan Village",
      "Hale Centre Theatre",
      "Banner Gateway Medical Center",
      "Williams Field Road Corridor",
      "Riparian Preserve at Water Ranch",
    ],
  },
  {
    name: "Peoria",
    slug: "peoria",
    note: "Home to the Peoria Sports Complex and P83 Entertainment District",
    src: Peoria,
    airportNote:
      "Peoria sits in the Northwest Valley about 30–35 minutes from PHX via the 101. We account for the full drive time when staging your chauffeur, so your pickup window is built around when you actually need to leave — not a generic estimate.",
    corporateNote:
      "Peoria's Loop 101 corridor has become a significant address for West Valley business operations. USAA and several healthcare and logistics employers have major Peoria footprints. We serve corporate accounts here with the same consolidated billing and admin dashboard access available across all markets.",
    localContext:
      "Peoria is best known as a spring training destination — the Peoria Sports Complex hosts the San Diego Padres and Seattle Mariners — but it's also a year-round market for airport transfers, corporate rides, and P83 Entertainment District events. Our chauffeurs know the stadium drop zones and Northwest Valley freeway patterns well.",
    localLandmarks: [
      "Peoria Sports Complex",
      "P83 Entertainment District",
      "Lake Pleasant Regional Park",
      "USAA Campus",
      "Arrowhead Towne Center",
      "Loop 101 Business Corridor",
    ],
  },
  {
    name: "Glendale",
    slug: "glendale",
    note: "Home to State Farm Stadium and Desert Diamond Arena",
    src: Glendale,
    airportNote:
      "Airport transportation from Glendale is one of our most-booked West Valley services. Glendale is about 25–30 minutes from PHX via the Loop 101 and I-10, and we stage chauffeurs based on live departure times and real traffic data — not generic estimates — so your airport run never feels rushed or padded.",
    corporateNote:
      "Glendale's Westgate Entertainment District and the State Farm Stadium area have attracted significant hospitality and event-related corporate activity. We handle group transportation, VIP event logistics, and recurring corporate account rides across the West Valley.",
    localContext:
      "Glendale is one of the Valley's premier sports and entertainment markets. State Farm Stadium hosts the Arizona Cardinals, major college football events, and Super Bowls. Desert Diamond Arena runs concerts and Coyotes hockey. Our chauffeurs know every event exit strategy, staging lane, and post-game pickup corridor in this market.",
    localLandmarks: [
      "State Farm Stadium",
      "Desert Diamond Arena",
      "Westgate Entertainment District",
      "Camelback Ranch",
      "Glendale Glitters District",
      "Loop 101 / Cardinals Drive Corridor",
    ],
    faqs: [
      {
        q: "How far is Glendale from Phoenix Sky Harbor Airport?",
        a: "About 15–20 miles depending on where in Glendale you start — plan on 25–30 minutes via the Loop 101 and I-10, a bit longer at rush hour. We run the route in both directions at a flat rate and build lead time into early-morning departures automatically.",
      },
      {
        q: "How much is a black car from Glendale to Sky Harbor Airport?",
        a: "Airport transfers from Glendale are a flat rate — no surge pricing, ever. Book online or call (480) 300-6003 for an instant quote. The drive runs about 25–30 minutes via the Loop 101 and I-10, and we stage chauffeurs based on live flight and traffic data.",
      },
      {
        q: "Do you provide transportation for State Farm Stadium events?",
        a: "Yes — Cardinals games, college football, concerts, and major events. Our chauffeurs know the staging lanes, event exits, and post-game pickup corridors, so you're not sitting in the parking crawl.",
      },
      {
        q: "How far in advance should I book for a game or concert?",
        a: "For major events at State Farm Stadium or Desert Diamond Arena, we recommend booking at least 48 hours ahead. Last-minute rides are often available — call us at (480) 300-6003 to check.",
      },
      {
        q: "Do you pick up from Westgate Entertainment District hotels?",
        a: "Yes. We serve all Westgate-area hotels and restaurants, plus the surrounding West Valley including Peoria, Litchfield Park, and Avondale.",
      },
      {
        q: "Can my company set up a corporate account for Glendale rides?",
        a: "Absolutely. We run recurring corporate rides, VIP event logistics, and group transportation across the West Valley with monthly invoicing.",
      },
    ],
  },
  {
    name: "Paradise Valley",
    slug: "paradise-valley",
    note: "Home to some of Arizona's most prestigious resorts and estates",
    src: ParadiseValley,
    airportNote:
      "Paradise Valley is approximately 20 minutes from PHX via the 51 — one of the most direct airport corridors in the Valley. Private aviation clients at Scottsdale Airport (SDL) are also just minutes away. We offer discreet, unmarked vehicle options for clients who prefer low-profile arrivals.",
    corporateNote:
      "Paradise Valley serves as home base for some of Arizona's most prominent executives and business leaders. We handle recurring airport transfers, private event transportation, and corporate hospitality programs at the major resort properties throughout the town.",
    localContext:
      "Paradise Valley is Arizona's most exclusive municipality — 15 square miles with no commercial development, bordered by Camelback Mountain and the McDowell Sonoran Preserve. Our chauffeurs understand the privacy expectations of PV residents and resort guests, and we approach every ride here with the discretion the market demands.",
    localLandmarks: [
      "The Phoenician Resort",
      "Sanctuary Camelback Mountain Resort",
      "Camelback Mountain",
      "Mountain Shadows Resort",
      "Andaz Scottsdale",
      "JW Marriott Camelback Inn",
    ],
    routePromo: {
      href: "/routes/paradise-valley-to-sky-harbor",
      anchor: "book a private Paradise Valley to Sky Harbor transfer",
      blurb: "Heading to Sky Harbor from the town?",
    },
  },
  {
    name: "Cave Creek",
    slug: "cave-creek",
    note: "Known for its western charm, art galleries, and luxury desert retreats",
    src: Scottsdale,
    airportNote:
      "Cave Creek is one of the farther northern communities from PHX — about 35–40 minutes via the 51 or Cave Creek Road. We plan departure times carefully for Cave Creek clients to account for the full drive without cutting it close on early flights.",
    corporateNote:
      "Cave Creek attracts a mix of self-employed executives, real estate professionals, and high-net-worth individuals who prefer a rural desert lifestyle within reach of the metro. Recurring airport transfers and discreet point-to-point rides are the most common service requests from Cave Creek clients.",
    localContext:
      "Cave Creek has maintained its western character while becoming a destination for luxury desert retreats, boutique dining, and art galleries. Visitors and residents alike appreciate a professional chauffeur who can navigate the Cave Creek corridor without GPS confusion — our team knows the area well.",
    localLandmarks: [
      "Cave Creek Regional Park",
      "Binkley's Restaurant",
      "Buffalo Chip Saloon",
      "Spur Cross Ranch Conservation Area",
      "Cave Creek Museum",
      "Carefree Highway Corridor",
    ],
  },
  {
    name: "Fountain Hills",
    slug: "fountain-hills",
    note: "Known for the iconic Fountain Park and stunning mountain views",
    src: Mesa,
    airportNote:
      "Fountain Hills sits on the eastern edge of the Valley, about 35 minutes from PHX via the 202 and SR-87. The drive is scenic but the timing requires planning — we build in appropriate buffer for Fountain Hills clients so airport runs are never rushed.",
    corporateNote:
      "Fountain Hills is a primarily residential community with a high concentration of retired executives and remote professionals. Airport transfers and recurring rides are the primary service requests here — often for clients who moved to Fountain Hills for the lifestyle but still travel frequently for business.",
    localContext:
      "Fountain Hills is one of the Valley's most scenic communities, built around a man-made lake with one of the world's tallest fountains at its center. The town hosts popular art festivals and attracts visitors to its resort-adjacent setting near We-Ko-Pa Golf Club and the Fort McDowell casino corridor.",
    localLandmarks: [
      "Fountain Park",
      "We-Ko-Pa Golf Club",
      "Fort McDowell Yavapai Nation",
      "McDowell Mountain Regional Park",
      "Fountain Hills Theater",
      "Shea Boulevard Corridor",
    ],
  },
  {
    name: "Surprise",
    slug: "surprise",
    note: "A growing West Valley community with easy freeway access",
    src: Peoria,
    airportNote:
      "Surprise is one of the farther West Valley cities from PHX — about 35–40 minutes via the 303 and I-10. We plan Surprise pickups with generous lead time and real-time traffic monitoring to make sure early morning flights don't become stressful airport runs.",
    corporateNote:
      "Surprise has attracted significant industrial and logistics operations along the 303 corridor, alongside healthcare and retail employers. Corporate account demand here tends to be for recurring commute rides and airport transfers for professionals who've relocated to the Northwest Valley.",
    localContext:
      "Surprise is one of the fastest-growing cities in the country, with significant spring training activity at Surprise Stadium hosting the Kansas City Royals and Texas Rangers. Beyond spring training season, it's an active residential market with growing demand for professional ground transportation.",
    localLandmarks: [
      "Surprise Stadium",
      "Prasada Shopping Center",
      "White Tank Mountain Regional Park",
      "Loop 303 Business Corridor",
      "Surprise Recreation Campus",
      "Sun City Grand",
    ],
  },
  {
    name: "Goodyear",
    slug: "goodyear",
    note: "A rapidly growing West Valley city near the I-10 corridor",
    src: Glendale,
    airportNote:
      "Goodyear is about 30–35 minutes from PHX via I-10 — one of the Valley's major freeway corridors. We time Goodyear pickups based on current traffic conditions and your actual flight time so you're not sitting in the car longer than necessary.",
    corporateNote:
      "Goodyear's I-10 corridor has become a major logistics and distribution hub, with significant industrial employers anchoring the West Valley's economic growth. Corporate account transportation for Goodyear is increasingly common as more executives and managers relocate here from other parts of the metro.",
    localContext:
      "Goodyear has grown dramatically over the past decade, evolving from a small agricultural community into one of the Valley's most active development zones. Goodyear Ballpark hosts Cleveland Guardians and Cincinnati Reds spring training. The city's Palm Valley and Estrella Mountain Ranch communities are active markets for professional transportation.",
    localLandmarks: [
      "Goodyear Ballpark",
      "Estrella Mountain Regional Park",
      "Palm Valley Corridor",
      "Goodyear Airport",
      "I-10 / Estrella Parkway Interchange",
      "Litchfield Road Business District",
    ],
  },
  {
    name: "Sedona",
    slug: "sedona",
    note: "A world-renowned red rock destination about two hours north of Phoenix",
    src: ParadiseValley,
    airportNote:
      "Sedona is approximately 115 miles and two hours from PHX via I-17 and SR-89A. For travelers flying into Phoenix who want to reach Sedona without renting a car, we offer a seamless door-to-door transfer with a professional chauffeur who knows the mountain switchback routes. No shuttle vans, no shared stops.",
    corporateNote:
      "Sedona is a premier destination for corporate retreats, executive off-sites, and incentive travel programs. Many of Arizona's luxury resorts — Enchantment, L'Auberge, Mii Amo — host corporate groups throughout the year. We coordinate multi-vehicle transfers from PHX for groups of any size.",
    localContext:
      "Sedona consistently ranks as one of the most beautiful places in the United States, drawing visitors from around the world to its red rock formations, spa resorts, and arts community. The drive from Phoenix is part of the experience — our chauffeurs know when to point out the first views of Oak Creek Canyon and where to stop if a client wants a photo on the way in.",
    localLandmarks: [
      "Enchantment Resort",
      "L'Auberge de Sedona",
      "Cathedral Rock",
      "Bell Rock",
      "Oak Creek Canyon",
      "Tlaquepaque Arts Village",
    ],
    routePromo: {
      href: "/routes/phoenix-to-sedona",
      anchor: "book a private Phoenix to Sedona transfer, door to door",
      blurb: "Flying into Sky Harbor and heading straight for the red rocks?",
    },
  },
  {
    name: "Tucson",
    slug: "tucson",
    note: "Arizona's second-largest city, about 115 miles south of Phoenix",
    src: Phoenix,
    airportNote:
      "Tucson is about 115 miles and 90 minutes from Phoenix via I-10. For travelers who need to connect between the two cities without flying — or who prefer to skip the Tucson airport entirely — we offer direct, door-to-door intercity transfers. No shuttles, no shared vans, no stops.",
    corporateNote:
      "The Phoenix-to-Tucson corridor is one of the most traveled business routes in Arizona. University of Arizona, Raytheon, Caterpillar, and Tucson's growing biotech and defense sectors generate consistent executive travel between the two cities. We run this route regularly with flat-rate intercity pricing.",
    localContext:
      "Tucson is a destination in its own right — the University of Arizona, Saguaro National Park, and a vibrant downtown dining scene draw visitors from Phoenix and beyond. Whether it's a business meeting, a UA game, or a weekend getaway, we make the I-10 run comfortable and productive with a quiet cabin and professional chauffeur.",
    localLandmarks: [
      "University of Arizona",
      "Saguaro National Park",
      "Tucson International Airport (TUS)",
      "Reid Park Zoo",
      "Fourth Avenue District",
      "Raytheon Technologies Campus",
    ],
    routePromo: {
      href: "/routes/tucson-to-phoenix",
      anchor:
        "book a private Tucson to Phoenix car service — no shared shuttle stops",
      blurb: "Connecting between Tucson and the Valley?",
    },
  },
  {
    name: "Flagstaff",
    slug: "flagstaff",
    note: "A mountain city about two hours north of Phoenix near the Grand Canyon",
    src: ParadiseValley,
    airportNote:
      "Flagstaff is approximately 145 miles and two hours from PHX via I-17. For travelers visiting northern Arizona who want to skip the drive or the small Flagstaff Pulliam Airport, we offer direct door-to-door transfers from Sky Harbor with a professional chauffeur.",
    corporateNote:
      "Flagstaff hosts Northern Arizona University and several major research and healthcare institutions. The Phoenix-to-Flagstaff corridor is an active route for executives traveling to NAU, Lowell Observatory collaborators, and the northern Arizona healthcare network. We run this route on a flat intercity rate.",
    localContext:
      "At 7,000 feet elevation, Flagstaff sits above the Arizona heat and offers a completely different landscape from the Valley. Grand Canyon visitors, ski season travelers heading to Arizona Snowbowl, and NAU parents all make the Phoenix-to-Flagstaff run regularly. Our chauffeurs are comfortable on I-17's mountain grades in all conditions.",
    localLandmarks: [
      "Grand Canyon National Park",
      "Arizona Snowbowl",
      "Northern Arizona University",
      "Lowell Observatory",
      "Flagstaff Pulliam Airport (FLG)",
      "Historic Route 66",
    ],
    routePromo: {
      href: "/routes/flagstaff-to-phoenix",
      anchor: "book a private Flagstaff to Phoenix airport car service",
      blurb: "Need to make a Sky Harbor flight from the mountains?",
    },
  },
  {
    name: "Prescott",
    slug: "prescott",
    note: "A charming mountain city about 90 minutes north of Phoenix",
    src: ParadiseValley,
    airportNote:
      "Prescott is about 100 miles and 90 minutes from PHX via I-17 and SR-69. It's a popular destination for Phoenix-area residents who want mountain elevation without the full Flagstaff drive. We offer flat-rate door-to-door transfers on this route.",
    corporateNote:
      "Prescott is home to Embry-Riddle Aeronautical University and a significant veteran and healthcare community. Corporate travel between Phoenix and Prescott is consistent, particularly for healthcare administrators and aerospace-related professionals. We serve this corridor with the same flat-rate intercity pricing as our other long-distance routes.",
    localContext:
      "Prescott's Whiskey Row, Courthouse Plaza, and Granite Dells draw visitors from Phoenix year-round. The city's elevation and cooler climate make it a popular summer retreat. Our chauffeurs know the Prescott corridor well and can recommend the SR-89 scenic route for clients who aren't in a rush.",
    localLandmarks: [
      "Whiskey Row",
      "Courthouse Plaza",
      "Granite Dells",
      "Embry-Riddle Aeronautical University",
      "Prescott National Forest",
      "Sharlot Hall Museum",
    ],
    routePromo: {
      href: "/routes/phoenix-to-prescott",
      anchor: "book a private Phoenix to Prescott transfer at a flat rate",
      blurb: "Heading up for the mountain air?",
    },
  },
  {
    name: "Avondale",
    slug: "avondale",
    note: "Home to Phoenix Raceway and major West Valley destinations",
    src: Glendale,
    airportNote:
      "Avondale is about 25–30 minutes from PHX via I-10. A straightforward freeway corridor that our chauffeurs run regularly for West Valley clients.",
    corporateNote:
      "Avondale's proximity to Phoenix Raceway makes it an active market for corporate hospitality transportation, particularly during NASCAR race weekends and special events.",
    localContext:
      "Phoenix Raceway is the anchor of Avondale's identity and a major driver of event transportation demand. Beyond race weekends, Avondale is a growing residential community with increasing demand for professional airport and corporate transportation.",
    localLandmarks: [
      "Phoenix Raceway",
      "Avondale Civic Center",
      "Coldwater Ridge Park",
      "I-10 / Avondale Boulevard Corridor",
    ],
  },
  {
    name: "Buckeye",
    slug: "buckeye",
    note: "A fast-growing community on the western edge of the Valley",
    src: Peoria,
    airportNote:
      "Buckeye is one of the Valley's westernmost communities — about 40–45 minutes from PHX via I-10. We plan extra lead time for Buckeye clients and monitor traffic on the I-10 corridor to make sure early departures go smoothly.",
    corporateNote:
      "Buckeye has seen major industrial and logistics growth along the I-10 and the Loop 303 extension. Distribution centers for major national retailers and e-commerce operations have added significant corporate transportation demand in this corridor.",
    localContext:
      "Buckeye is one of the fastest-growing cities in the United States by population. As the city builds out its amenities and attracts more residents, demand for professional ground transportation — particularly airport transfers — continues to grow.",
    localLandmarks: [
      "Skyline Regional Park",
      "Buckeye Municipal Airport",
      "I-10 / Loop 303 Corridor",
      "White Tank Mountain Regional Park (adjacent)",
    ],
  },
  {
    name: "Litchfield Park",
    slug: "litchfield-park",
    note: "An upscale West Valley community known for The Wigwam resort",
    src: Peoria,
    airportNote:
      "Litchfield Park is about 30 minutes from PHX via the 101 and I-10. We serve Litchfield Park clients with the same real-time flight monitoring and adjusted dispatch timing as all of our markets.",
    corporateNote:
      "The Wigwam Resort is Litchfield Park's anchor property and a premier destination for corporate retreats, golf outings, and executive meetings. We coordinate multi-vehicle transfers from PHX for corporate groups arriving at The Wigwam.",
    localContext:
      "Litchfield Park is a small, planned community built around The Wigwam — one of Arizona's historic resort properties dating to 1929. Golf, corporate meetings, and upscale residential living define the character of this West Valley enclave.",
    localLandmarks: [
      "The Wigwam Resort",
      "Wigwam Golf Club",
      "Litchfield Park City Center",
      "Palm Valley Road Corridor",
    ],
  },
  {
    name: "Sun City",
    slug: "sun-city",
    note: "A premier active adult community in the Northwest Valley",
    src: Glendale,
    airportNote:
      "Sun City is about 30–35 minutes from PHX via the 101 and I-10. We serve Sun City residents with reliable, on-time airport transfers and recurring ride programs — particularly for residents who travel frequently to visit family.",
    corporateNote:
      "Sun City's transportation needs tend to center on medical appointments, airport transfers, and recurring rides rather than corporate accounts. We offer recurring ride programs that work well for residents who need consistent, dependable service.",
    localContext:
      "Sun City was the first planned active adult community in the United States and remains one of the most recognizable names in 55+ living. Our chauffeurs serve Sun City residents with patience, punctuality, and the kind of professional care that matches the community's expectations.",
    localLandmarks: [
      "Sun City Center",
      "Bell Recreation Center",
      "Sun City Grand (adjacent)",
      "Del Webb Boulevard Corridor",
    ],
  },
  {
    name: "Sun City West",
    slug: "sun-city-west",
    note: "A premier active adult community in the Northwest Valley",
    src: Glendale,
    airportNote:
      "Sun City West is about 35 minutes from PHX via the 303 and I-10. We serve residents here with reliable airport transfers and recurring ride programs tailored to the community's needs.",
    corporateNote:
      "Like Sun City, Sun City West's transportation demand centers on airport transfers, medical appointments, and recurring rides. We run scheduled pickup programs for residents who need consistent service on a weekly or monthly basis.",
    localContext:
      "Sun City West sits just west of Sun City and shares its character as a planned active adult destination. Our chauffeurs approach every Sun City West ride with the same attentiveness and professional care that defines our service across the Valley.",
    localLandmarks: [
      "RH Johnson Recreation Center",
      "Sun City West Library",
      "Grandview Recreation Center",
      "Loop 303 Corridor",
    ],
  },
  {
    name: "Anthem",
    slug: "anthem",
    note: "A master-planned community at the north end of the Valley",
    src: Phoenix,
    airportNote:
      "Anthem sits at the northern edge of the Valley — about 35–40 minutes from PHX via I-17. The I-17 corridor is one of the Valley's most consistent freeway routes, and we monitor it in real time to adjust departure timing for Anthem clients.",
    corporateNote:
      "Anthem is primarily residential, but its location at the I-17 corridor makes it a natural hub for professionals who commute to Phoenix or Scottsdale. Recurring rides and airport transfers for Anthem residents are among our most consistent Northwest Valley bookings.",
    localContext:
      "Anthem was developed as a master-planned community by Del Webb and has become one of the Valley's most popular family destinations. The Outlets at Anthem, Anthem Community Park, and easy I-17 access make it an active market for both airport transportation and leisure rides.",
    localLandmarks: [
      "Outlets at Anthem",
      "Anthem Community Park",
      "Anthem Golf and Country Club",
      "I-17 / Anthem Way Interchange",
    ],
  },
  {
    name: "Carefree",
    slug: "carefree",
    note: "A boutique desert town known for its galleries, dining, and luxury homes",
    src: Scottsdale,
    airportNote:
      "Carefree is about 35–40 minutes from PHX via the 51 and Cave Creek Road. We build appropriate lead time into every Carefree pickup and monitor the northern Scottsdale corridor for traffic before dispatch.",
    corporateNote:
      "Carefree attracts a high concentration of self-employed executives, luxury homeowners, and affluent retirees. The transportation needs here tend to be discreet, high-standard, and recurring — exactly the kind of client relationship we do best.",
    localContext:
      "Carefree is Arizona's most artistically distinct small town — sundials, galleries, and boutique restaurants define its town center. The community is adjacent to Cave Creek and shares its rural desert character while adding a more curated, upscale identity.",
    localLandmarks: [
      "Carefree Desert Gardens",
      "Carefree Sundial",
      "The Boulders Resort",
      "Cave Creek Road Corridor",
      "Harold's Corral",
    ],
  },
  {
    name: "Rio Verde",
    slug: "rio-verde",
    note: "An upscale community in the Sonoran Desert foothills",
    src: Scottsdale,
    airportNote:
      "Rio Verde is a remote desert community northeast of Scottsdale — about 40 minutes from PHX. The drive requires navigating north Scottsdale roads that our chauffeurs know well. We plan Rio Verde pickups with extra buffer for the distance and terrain.",
    corporateNote:
      "Rio Verde is a small, exclusive community with a high concentration of affluent residents. Transportation requests tend to be for airport transfers, Scottsdale dining and event transportation, and occasional long-distance drives.",
    localContext:
      "Rio Verde sits in the Sonoran Desert foothills east of Scottsdale with dramatic mountain views and proximity to Tonto National Forest. It's a destination for high-end desert living — quiet, scenic, and intentionally remote. Our chauffeurs provide the connection to the broader Valley that makes living here practical.",
    localLandmarks: [
      "Rio Verde Country Club",
      "Tonto National Forest",
      "Sonoran Desert Foothills",
      "Verde River Greenway (nearby)",
    ],
  },
  {
    name: "Ahwatukee",
    slug: "ahwatukee",
    note: "A South Phoenix community nestled at the base of South Mountain",
    src: Phoenix,
    airportNote:
      "Ahwatukee is about 20–25 minutes from PHX via I-10 — one of the most direct airport corridors in the Valley for south Phoenix residents. Early morning flights are especially efficient from Ahwatukee.",
    corporateNote:
      "Ahwatukee has a strong professional community along the I-10 and Ray Road corridors, with significant corporate employment in the nearby Chandler and Tempe markets. Many Ahwatukee residents maintain corporate accounts for recurring airport and meeting transportation.",
    localContext:
      "Ahwatukee is a large master-planned neighborhood tucked between South Mountain and the I-10, with a distinct community identity despite being part of Phoenix. Its proximity to PHX and the strong professional demographic make it one of our more active south Valley markets.",
    localLandmarks: [
      "South Mountain Park and Preserve",
      "Ahwatukee Foothills Towne Center",
      "Ray Road Corridor",
      "I-10 / Chandler Boulevard Interchange",
    ],
  },
  {
    name: "Laveen",
    slug: "laveen",
    note: "A growing South Phoenix community near the I-10 and Loop 202",
    src: Phoenix,
    airportNote:
      "Laveen is about 20–25 minutes from PHX via I-10. The south freeway corridor is reliable and well-monitored — we stage Laveen pickups based on live departure times to avoid unnecessary early arrivals.",
    corporateNote:
      "Laveen is a growing community with increasing professional demand for airport transportation and corporate rides. As the area develops, we're seeing more recurring account requests from Laveen residents who commute to downtown Phoenix and the Chandler tech corridor.",
    localContext:
      "Laveen has grown significantly over the past decade, transforming from a largely agricultural area into a thriving residential community. Its location near the I-10 and Loop 202 interchange gives residents efficient access to the broader Valley.",
    localLandmarks: [
      "Laveen Village Core",
      "South Mountain Community College",
      "Laveen Elementary School District",
      "I-10 / Laveen Corridor",
    ],
  },
  {
    name: "Queen Creek",
    slug: "queen-creek",
    note: "A growing Southeast Valley community with easy access to the 24 freeway",
    src: Gilbert,
    airportNote:
      "Queen Creek is one of the farther southeast communities from PHX — about 40 minutes via the 202 and SR-24. We plan Queen Creek pickups with extra lead time and monitor the southeast corridor for traffic before dispatch.",
    corporateNote:
      "Queen Creek's agricultural heritage is giving way to rapid residential and commercial growth. Corporate transportation demand here tends to be for airport transfers and occasional corporate event rides for residents who work in Chandler, Gilbert, or downtown Phoenix.",
    localContext:
      "Queen Creek is known for its farming roots, equestrian communities, and the Queen Creek Olive Mill — one of Arizona's most-visited agritourism destinations. As the city grows, so does demand for professional ground transportation connecting residents to the broader Valley.",
    localLandmarks: [
      "Queen Creek Olive Mill",
      "Schnepf Farms",
      "San Tan Mountain Regional Park",
      "SR-24 Corridor",
      "Queen Creek Marketplace",
    ],
  },
  {
    name: "San Tan Valley",
    slug: "san-tan-valley",
    note: "A growing Southeast Valley community near San Tan Mountain Regional Park",
    src: Gilbert,
    airportNote:
      "San Tan Valley is about 45 minutes from PHX — one of the farther southeast communities from the airport. We build appropriate lead time into all San Tan Valley pickups and communicate departure windows clearly.",
    corporateNote:
      "San Tan Valley is primarily residential but growing fast. Airport transfers for residents who work in Chandler, Gilbert, and the broader East Valley tech corridor are the primary service requests from this area.",
    localContext:
      "San Tan Valley sits in Pinal County, just outside the Maricopa County boundary, making it one of the more distinct communities in the southeast Valley. San Tan Mountain Regional Park is the area's defining landmark, attracting hikers and outdoor enthusiasts from across the metro.",
    localLandmarks: [
      "San Tan Mountain Regional Park",
      "Hunt Highway Corridor",
      "Ironwood Crossing",
      "SR-24 Extension",
    ],
  },
  {
    name: "Maricopa",
    slug: "maricopa",
    note: "A fast-growing city south of the Valley off the SR-347",
    src: Mesa,
    airportNote:
      "Maricopa is about 40–45 minutes from PHX via I-10 and SR-347. The SR-347 corridor can be congested during peak hours — we monitor it and adjust departure timing for Maricopa clients accordingly.",
    corporateNote:
      "Maricopa's growth has brought corporate and professional demand alongside its residential expansion. Many Maricopa residents commute to Chandler, Phoenix, or Tempe for work, making recurring airport transfers and corporate rides a natural service request.",
    localContext:
      "Maricopa is one of the fastest-growing cities in the country and has maintained a strong community identity despite rapid expansion. Its location south of the Valley gives it a distinct character, and residents appreciate reliable transportation connections to the broader metro.",
    localLandmarks: [
      "Copper Sky Recreation Complex",
      "Maricopa-Casa Grande Highway (SR-347)",
      "Harrah's Ak-Chin Casino (nearby)",
      "Maricopa Wells Middle School District",
    ],
  },
  {
    name: "Apache Junction",
    slug: "apache-junction",
    note: "A scenic East Valley city near the Superstition Mountains",
    src: Mesa,
    airportNote:
      "Apache Junction is about 40 minutes from PHX via the 202 and US-60. We serve Apache Junction clients with the same real-time flight monitoring and adjusted dispatch timing available across all our markets.",
    corporateNote:
      "Apache Junction is primarily a residential and tourism market. Airport transfers for residents and transportation for visitors exploring the Superstition Mountains and Lost Dutchman area are the primary service requests here.",
    localContext:
      "Apache Junction sits at the base of the Superstition Mountains — one of Arizona's most iconic natural landmarks. The Lost Dutchman State Park, Goldfield Ghost Town, and proximity to Canyon Lake make it a popular destination for visitors from across the Valley.",
    localLandmarks: [
      "Lost Dutchman State Park",
      "Superstition Mountains",
      "Goldfield Ghost Town",
      "Canyon Lake",
      "US-60 / Superstition Freeway",
    ],
  },
  {
    name: "Gold Canyon",
    slug: "gold-canyon",
    note: "A scenic desert community at the foot of the Superstition Mountains",
    src: Mesa,
    airportNote:
      "Gold Canyon is about 45 minutes from PHX via the 202 and US-60. We build appropriate lead time into Gold Canyon pickups and communicate departure windows clearly for early morning flights.",
    corporateNote:
      "Gold Canyon is a primarily residential and resort-adjacent community. Airport transfers and golf outing transportation are the primary service requests, particularly for residents of the Superstition Mountain Golf and Country Club area.",
    localContext:
      "Gold Canyon sits at the eastern edge of the Valley with dramatic Superstition Mountain views. Its desert resort character and proximity to world-class golf make it a popular retirement destination — and our chauffeurs serve the community with the professional standard residents expect.",
    localLandmarks: [
      "Superstition Mountain Golf and Country Club",
      "Superstition Mountains",
      "Gold Canyon Golf Resort",
      "US-60 Corridor",
    ],
  },
  {
    name: "Wickenburg",
    slug: "wickenburg",
    note: "A historic desert town northwest of Phoenix known for luxury guest ranches",
    src: Scottsdale,
    airportNote:
      "Wickenburg is about 60 miles and one hour from PHX via US-60 and US-93. For guests arriving at Sky Harbor who are heading to Wickenburg's guest ranches or private residences, we offer door-to-door transfers without the hassle of a rental car.",
    corporateNote:
      "Wickenburg's guest ranch culture — Rancho de los Caballeros, The Hassayampa Inn — attracts executive retreat groups and incentive travel programs. We coordinate PHX airport transfers for corporate groups staying at Wickenburg properties.",
    localContext:
      "Wickenburg bills itself as the 'Dude Ranch Capital of the World' and has maintained its western heritage character while attracting an increasingly sophisticated visitor. The drive from Phoenix on US-60 is scenic desert highway — our chauffeurs make it a comfortable part of the experience.",
    localLandmarks: [
      "Rancho de los Caballeros",
      "The Hassayampa Inn",
      "Vulture Mine",
      "Wickenburg Community Center",
      "US-60 / US-93 Corridor",
    ],
  },
  {
    name: "Payson",
    slug: "payson",
    note: "A mountain retreat about 90 minutes northeast of Phoenix on the Mogollon Rim",
    src: ParadiseValley,
    airportNote:
      "Payson is about 90 miles and 90 minutes from PHX via SR-87 (the Beeline Highway). The route climbs into the Tonto National Forest — scenic but requiring an experienced driver. Our chauffeurs know this corridor well and are comfortable on mountain roads.",
    corporateNote:
      "Payson is a destination for corporate retreats and mountain getaways from the Valley. We coordinate transfers from PHX for groups heading to Payson properties and for residents who need reliable connections to the metro.",
    localContext:
      "Payson sits at the base of the Mogollon Rim at 5,000 feet elevation — far enough from Phoenix to feel like a true escape but close enough for a day trip. Tonto Natural Bridge, Christopher Creek, and Rim Country dining draw visitors year-round.",
    localLandmarks: [
      "Tonto Natural Bridge",
      "Mogollon Rim",
      "Christopher Creek",
      "Payson Center for the Performing Arts",
      "SR-87 Beeline Highway",
    ],
  },
  {
    name: "Yuma",
    slug: "yuma",
    note: "A city in southwestern Arizona near the California border",
    src: ParadiseValley,
    airportNote:
      "Yuma is approximately 185 miles and 2.5 hours from PHX via I-10 and I-8. For travelers who want to avoid the small Yuma International Airport or need a private transfer between the two cities, we offer direct door-to-door long-distance service.",
    corporateNote:
      "Yuma's agricultural industry, military presence (Marine Corps Air Station Yuma), and proximity to California generate consistent intercity travel demand. We serve the Phoenix-to-Yuma corridor for business and personal travel.",
    localContext:
      "Yuma is one of the sunniest cities on Earth and a major agricultural hub in the Southwest. The drive from Phoenix crosses some of Arizona's most dramatic desert scenery along I-8 — our chauffeurs make the journey comfortable regardless of the distance.",
    localLandmarks: [
      "Yuma Territorial Prison State Historic Park",
      "Marine Corps Air Station Yuma",
      "Yuma International Airport (YUM)",
      "Colorado River",
      "I-8 / Yuma Corridor",
    ],
  },
  {
    name: "Tolleson",
    slug: "tolleson",
    note: "A West Valley city with easy access to I-10 and Loop 101",
    src: Glendale,
    airportNote:
      "Tolleson sits just off I-10 about 20–25 minutes from PHX — one of the more efficient West Valley airport corridors. We serve Tolleson clients with reliable transfers and real-time flight monitoring.",
    corporateNote:
      "Tolleson's I-10 corridor hosts significant logistics and distribution activity. Corporate transportation demand here tends to be for recurring airport transfers and corporate event rides.",
    localContext:
      "Tolleson is a small industrial and residential community with convenient freeway access to both downtown Phoenix and the broader West Valley. Its proximity to major distribution operations along I-10 makes it an active market for business transportation.",
    localLandmarks: [
      "I-10 / 99th Avenue Interchange",
      "Tolleson Union High School District",
      "West Valley Business Park",
      "Loop 101 Corridor",
    ],
  },
  {
    name: "El Mirage",
    slug: "el-mirage",
    note: "A Northwest Valley community near Surprise and Peoria",
    src: Peoria,
    airportNote:
      "El Mirage is about 30–35 minutes from PHX via the 101 and I-10. We serve El Mirage clients with the same real-time traffic monitoring and flight-adjusted dispatch timing available across all our markets.",
    corporateNote:
      "El Mirage is primarily residential, with corporate transportation demand focused on airport transfers and occasional rides to the broader Phoenix metro for professional appointments.",
    localContext:
      "El Mirage sits between Surprise and Peoria in the Northwest Valley — a growing residential community with convenient access to the 101 and proximity to Westgate and the broader West Valley entertainment corridor.",
    localLandmarks: [
      "El Mirage Road Corridor",
      "Loop 101 Access",
      "Dysart Road Business District",
      "Peoria (adjacent)",
    ],
  },
  {
    name: "New River",
    slug: "new-river",
    note: "A rural community north of Phoenix near the I-17 corridor",
    src: Phoenix,
    airportNote:
      "New River is about 35–40 minutes from PHX via I-17. The I-17 corridor is reliable and well-traveled — we monitor it for traffic and adjust departure times accordingly for New River clients.",
    corporateNote:
      "New River is a rural community with a modest corporate transportation demand, primarily for airport transfers for residents who work in Phoenix or Scottsdale. Recurring ride programs work well for New River clients with consistent travel schedules.",
    localContext:
      "New River is one of the Valley's most rural communities — desert terrain, horse properties, and wide-open space define its character. Residents here choose New River for the lifestyle and appreciate reliable transportation connections to the metro.",
    localLandmarks: [
      "I-17 / New River Road Interchange",
      "Sonoran Desert Terrain",
      "Black Canyon City (nearby)",
      "Anthem (nearby)",
    ],
  },
  {
    name: "Casa Grande",
    slug: "casa-grande",
    note: "A central Arizona city midway between Phoenix and Tucson",
    src: Mesa,
    airportNote:
      "Casa Grande sits almost exactly midway between PHX and Tucson International (TUS) on I-10 — about 50 minutes from each. We serve Casa Grande clients going to either airport with flat-rate intercity pricing and no hidden fees.",
    corporateNote:
      "Casa Grande's location on I-10 has made it a major industrial and logistics hub, with significant manufacturing, distribution, and healthcare employers. Corporate account transportation for Casa Grande tends to center on PHX airport transfers and Phoenix metro business trips.",
    localContext:
      "Casa Grande is one of central Arizona's fastest-growing cities, benefiting from its position between two major metro areas. The Casa Grande Ruins National Monument and the city's growing retail corridor anchor a community that's becoming increasingly self-sufficient.",
    localLandmarks: [
      "Casa Grande Ruins National Monument",
      "Promenade at Casa Grande",
      "I-10 / Sunland Gin Road Interchange",
      "Phoenix Premium Outlets (Chandler, nearby)",
    ],
  },
  {
    name: "Florence",
    slug: "florence",
    note: "A historic town in Pinal County southeast of the Valley",
    src: Chandler,
    airportNote:
      "Florence is about 50 minutes from PHX via US-60 and SR-79. We serve Florence clients with reliable airport transfers and clear departure window communication for the longer drive.",
    corporateNote:
      "Florence's transportation demand is primarily residential — airport transfers for residents who work in Chandler, Mesa, or Phoenix, and occasional rides to the broader metro for appointments.",
    localContext:
      "Florence is one of Arizona's oldest towns and the seat of Pinal County, with a historic downtown that has preserved much of its 19th-century character. As surrounding communities grow, Florence is increasingly connected to the broader southeast Valley.",
    localLandmarks: [
      "Florence Historic District",
      "Pinal County Courthouse",
      "McFarland State Historic Park",
      "SR-79 Corridor",
    ],
  },
] as const;

// Guard: fail fast if a city slug is ever duplicated again.
// Duplicate slugs silently break `find()` lookups, generateStaticParams,
// and the sitemap — this makes the mistake impossible to ship.
const seenSlugs = new Set<string>();
for (const c of serviceAreaCities) {
  if (seenSlugs.has(c.slug)) {
    throw new Error(`Duplicate city slug in serviceAreaCities: "${c.slug}"`);
  }
  seenSlugs.add(c.slug);
}

export type CityData = {
  name: string;
  slug: string;
  note: string;
  src: StaticImageData;
  airportNote?: string;
  corporateNote?: string;
  localContext?: string;
  localLandmarks?: readonly string[];
  faqs?: readonly { q: string; a: string }[];
  routePromo?: { href: string; anchor: string; blurb: string };
};
