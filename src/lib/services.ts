
import Airport from "../../public/images/airport.jpg";
import Airport2 from "../../public/images/airport2.jpg";
import Golf from "../../public/images/golf.jpg";
import Golf2 from "../../public/images/golf2.jpg";
import Corporate from "../../public/images/corporateii.jpg";
import Hourly from "../../public/images/hourly4.jpg";
import Hourly2 from "../../public/images/hourly2.jpg";
import Wedding from "../../public/images/wedding.jpg";

import type { StaticImageData } from "next/image";

export type ServiceShape = {
  id: number;
  title: string;
  slug: string;
  copy?: string;
  marketingCopy?: string;
  description?: string;
  src?: StaticImageData;
  src2?: StaticImageData;
  features?: ReadonlyArray<{
    id: number | string;
    title: string;
    details: string;
  }>;
  // add any other fields you actually read in components, e.g.:
  whoThisIsFor?: ReadonlyArray<string>;
  coverageTitle?: string;
  coverageAndAirports?: ReadonlyArray<string>;
  whatsIncluded?: ReadonlyArray<string>;
  vehicleClasses?: ReadonlyArray<string>;
  pickupOptions?: ReadonlyArray<string>;
  bookingAndPayment?: ReadonlyArray<string>;
  policies?: ReadonlyArray<string>;
  familiesAccessibilitySpecial?: ReadonlyArray<string>;
  safetyAndStandards?: ReadonlyArray<string>;
  communicationAndTracking?: ReadonlyArray<string>;
  whatToExpect?: ReadonlyArray<string>;
  faqs?: ReadonlyArray<{
    q: string;
    a: string;
  }>;
  addOns?: ReadonlyArray<{
    id: number | string;
    title: string;
    description: string;
  }>;
  forTravelManagers?: ReadonlyArray<string>;
};

export const servicesData = [
  {
    id: 1,
    title: "Airport Transfers",
    slug: "airport-transfers",
    copy: "Reliable black car service to Scottsdale, Sky Harbor, and Gateway airports. Professional chauffeurs ensure punctual, stress-free travel.",
    marketingCopy:
      "On-time, every time. Seamless airport transfers to PHX, Scottsdale, and Gateway with real-time flight tracking, 60-minute grace period, and professional meet-and-greet. Reserve your black car in minutes.",
    src: Airport,
    src2: Airport2,
    description:
      "Start and end every trip on time—and in comfort. Nier Transportation provides premium airport transfers across the Phoenix metro, including Sky Harbor (PHX), Scottsdale Airport (SDL), and Phoenix–Mesa Gateway (AZA), plus private and corporate FBOs. Professional chauffeurs, real-time flight tracking, and door-to-door service make your airport run simple, punctual, and stress-free.",
    whoThisIsFor: [
      "Business travelers who need on-time pickups and quiet, climate-controlled rides to work in transit",
      "Families with luggage, strollers, and child seats who want hands-on help from curb to door",
      "Leisure travelers who prefer a reserved vehicle and a dedicated chauffeur—no ride-share roulette",
      "Corporate travel coordinators who need reliable, invoice-ready, policy-compliant ground transport",
    ],
    coverageAndAirports: [
      "PHX – Phoenix Sky Harbor International (Terminals 3 & 4, all airlines)",
      "SDL – Scottsdale Airport (commercial connections & private FBO passengers)",
      "AZA – Phoenix–Mesa Gateway",
      "Private Aviation (FBOs): meet-and-greet or ramp-side coordination where permitted",
      "Metro pickup/drop-off: Scottsdale, Phoenix, Tempe, Chandler, Mesa, Gilbert, Paradise Valley, Glendale, Peoria, Goodyear, Surprise, and nearby communities",
    ],
    whatsIncluded: [
      "Real-Time Flight Monitoring – We track your flight and auto-adjust dispatch and pickup times for delays or early arrivals.",
      "Meet & Greet – Optional terminal-inside greeting with a name sign for a smooth handoff.",
      "Luggage Assistance – From carousel to curb, and from curb to your door.",
      "Complimentary Wait Time – Up to 60 minutes after wheels-down to deplane and collect bags.",
      "Door-to-Door – Private ride, no shared stops.",
      "Quiet Cabin – Climate-controlled vehicles with water and phone charging on request.",
    ],
    vehicleClasses: [
      "Executive SUV (up to 6–7 passengers) – Ideal for families and small teams with checked bags",
      "Luxury Sedan (up to 3 passengers) – Best for solo travelers or couples with carry-ons",
      "Premium & Specialty – Sprinter-style vans for groups, or elevated VIP options on request",
    ],
    pickupOptions: [
      "Curbside Pickup (fastest): Your chauffeur coordinates via text at passenger pickup zones.",
      "Meet & Greet (most seamless): Chauffeur waits inside at the designated arrivals area with a sign, escorts you to baggage claim and the vehicle.",
      "FBO/Private Aviation: Ramp-side or lounge pickup where permitted by the facility; we coordinate with the FBO.",
    ],
    bookingAndPayment: [
      "Reserve in minutes – Online booking with instant confirmation.",
      "Transparent pricing – Flat, zone-based airport rates with no surge pricing.",
      "Deposits – Option to secure your ride with a deposit; balance auto-settles per your preference.",
      "Receipts & invoices – Emailed automatically; monthly statements available for corporate accounts.",
    ],
    policies: [
      "Complimentary Wait Time: 60 minutes domestic/international from actual landing. After the grace period, wait time may apply in 15-minute increments.",
      "Advance reservations: Recommended for all flights; required for very early/late arrivals.",
      "Same-day bookings: Subject to availability—call or book online to check live inventory.",
      "Cancellations & Changes: Free changes up to a reasonable pre-dispatch window; once the chauffeur is en route or on location, standard fees may apply.",
      "No-Shows: Marked 30 minutes after the grace period ends if we cannot reach you via call/text.",
      "(Pro tip: Share your flight number and mobile during booking for the smoothest experience.)",
    ],
    familiesAccessibilitySpecial: [
      "Child Seats: Rear-facing, forward-facing, and boosters available on request. Tell us the ages of children so we bring the correct seat(s).",
      "ADA & Accessibility: Low step-in options and extra loading assistance available. Let us know mobility needs in advance.",
      "Pet-Friendly: Crated small pets welcome; service animals always welcome. Please note cleaning fees only if extraordinary detailing is required.",
      "Extra Stops: Short grocery/pharmacy stops or key pickups available—add during checkout.",
    ],
    safetyAndStandards: [
      "Licensed & insured commercial operations",
      "Chauffeur screening & training – route planning, defensive driving, client service",
      "Vehicle care – inspected, clean interiors, climate control checked daily",
    ],
    communicationAndTracking: [
      "SMS updates – Driver details and live arrival updates",
      "Flight tracking – We monitor your inbound flight and adjust staging so we’re ready when you are",
      "Support – Human dispatch for itinerary changes or delays",
    ],
    whatToExpect: [
      "Booking Confirmation: You’ll receive a confirmation with pickup details and your chauffeur’s contact closer to arrival.",
      "Landing & Grace Period: We start your 60-minute complimentary window once the flight lands.",
      "Bags & Meet Point: Text us when you reach baggage claim; for Meet & Greet, your chauffeur is already inside with a sign.",
      "Load & Go: We handle luggage and route selection—fastest route factoring traffic and closures.",
      "Arrival: Door-to-door drop-off with a final luggage handoff.",
    ],
    faqs: [
      {
        q: "What if my flight is early or delayed?",
        a: "We update pickup times automatically—no need to call unless your flight number changes.",
      },
      {
        q: "Where do I meet my driver at PHX?",
        a: "For curbside, we coordinate by text at the designated passenger pickup area for your terminal. For Meet & Greet, your chauffeur will be just outside baggage claim with a sign.",
      },
      {
        q: "Do you charge for tolls, parking, or airport fees?",
        a: "Airport/parking fees are passed through at cost and listed on your receipt; no surprise surcharges.",
      },
      {
        q: "How much luggage fits in an SUV?",
        a: "Typically 5–7 standard suitcases plus personal items; tell us your loadout and we’ll size up if needed.",
      },
      {
        q: "Can you handle very late arrivals?",
        a: "Yes—24/7 service with advance booking. For red-eyes and first-wave arrivals, reserve as early as possible.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Convenience Stop",
        description: "10–15 minute coffee/pharmacy/ATM stop en route.",
      },
      {
        id: 2,
        title: "Meet & Greet Upgrade",
        description:
          "Inside-terminal greeting with name sign and escort to baggage claim.",
      },
      {
        id: 3,
        title: "Extra Wait-Time Block",
        description:
          "Pre-purchase additional wait-time in 15–30 minute increments.",
      },
      {
        id: 4,
        title: "Return-Trip Bundle",
        description:
          "Lock in your pickup for the flight home at a preferred bundle rate.",
      },
      {
        id: 5,
        title: "Child Seat Rental",
        description: "Rear/forward-facing seats and boosters staged to spec.",
      },
    ],
    forTravelManagers: [
      "Corporate accounts with saved profiles, preferred rates, and consolidated monthly billing",
      "Saved itineraries and traveler preferences (pickup style, bottle water preference, quiet-ride, etc.)",
      "Admin dashboard access available on request",
    ],
    features: [
      {
        id: 1.1,
        title: "Real-Time Flight Monitoring",
        details:
          "We track your flight and auto-adjust dispatch and pickup times for delays or early arrivals.",
      },
      {
        id: 1.2,
        title: "Meet & Greet",
        details:
          "Optional terminal-inside greeting with a name sign for a smooth handoff.",
      },
      {
        id: 1.3,
        title: "Luggage Assistance",
        details: "From carousel to curb, and from curb to your door.",
      },
      {
        id: 1.4,
        title: "Complimentary Wait Time",
        details:
          "Up to 60 minutes after wheels-down to deplane and collect bags.",
      },
      {
        id: 1.5,
        title: "Door-to-Door",
        details: "Private ride, no shared stops.",
      },
      {
        id: 1.6,
        title: "Quiet Cabin",
        details:
          "Climate-controlled vehicles with water and phone charging on request.",
      },
    ],
  },
  // Append these to servicesData (ids continue from 1)

  {
    id: 2,
    title: "Hourly Chauffeur",
    slug: "hourly-chauffeur",
    copy: "Private chauffeur by the hour for errands, meetings, or nights out. Stay flexible with on-demand stops and real-time itinerary changes.",
    marketingCopy:
      "Your schedule, our wheel. Reserve a dedicated chauffeur by the hour for absolute flexibility—multiple stops, wait time included, and elite service throughout.",
    src: Hourly,
    src2: Hourly2,
    description:
      "Keep the car and chauffeur with you the entire time. Perfect for stacked meetings, shopping days, date nights, and VIP guest hosting. No ride-share roulette—just a clean vehicle, professional chauffeur, and smooth door-to-door flow.",
    whoThisIsFor: [
      "Executives with back-to-back meetings across town",
      "Visitors who want seamless transport between attractions and dining",
      "Couples planning a night out without parking or driving hassles",
      "Personal assistants arranging VIP hospitality with on-call car service",
    ],
    coverageAndAirports: [
      "Primary Coverage: Scottsdale, Phoenix, Paradise Valley, Tempe, Chandler, Mesa, Gilbert, Glendale, Peoria",
      "Event Districts: Old Town Scottsdale, Downtown Phoenix/Convention Center, Tempe Town Lake, Biltmore",
      "Stadiums & Arenas: Footprint Center, Chase Field, State Farm Stadium, Mullett Arena",
      "Add-On Range: Hourly charters may extend to outlying suburbs with minimums",
    ],
    whatsIncluded: [
      "Continuous Use – Vehicle and chauffeur remain with you",
      "Flexible Routing – Add or change stops in real time",
      "Standard Wait Time – Included during your booked hours",
      "Door-to-Door – Drop-offs as close as legally permitted",
      "Quiet Cabin – Climate control, bottled water, device charging",
      "Discreet Service – Low-profile, professional presentation",
    ],
    vehicleClasses: [
      "Executive SUV (up to 6–7 passengers) – Ideal for mixed errands and small groups",
      "Luxury Sedan (up to 3 passengers) – Efficient for solo or duo itineraries",
      "Premium & Specialty – Sprinter-style vans and VIP configurations on request",
    ],
    pickupOptions: [
      "Doorstep Pickup: Residential, hotel, or office",
      "Curbside & Valet Coordination: We stage where permitted",
      "Multi-Stop Support: We handle curb timing and vehicle repositioning",
    ],
    bookingAndPayment: [
      "Reserve in minutes – Online booking with instant confirmation",
      "Transparent pricing – Clearly stated hourly minimums and included miles",
      "Deposits – Secure your charter; balance auto-settles per your preference",
      "Receipts & invoices – Auto-emailed; monthly statements for corporate",
    ],
    policies: [
      "Minimum Booking: Usually 2–3 consecutive hours depending on class",
      "Overage Billing: Billed in 15- or 30-minute increments after minimum",
      "Same-day requests: Subject to vehicle availability",
      "Cancellations & Changes: Free within a reasonable pre-dispatch window; standard fees may apply after dispatch",
      "No-Shows: Marked 30 minutes after confirmed start if unreachable",
    ],
    familiesAccessibilitySpecial: [
      "Child Seats: Available upon request—share ages for proper fit",
      "ADA & Accessibility: Low step-in options and loading assistance",
      "Pet-Friendly: Crated small pets welcome; service animals always welcome",
      "Errand Support: Short walk-in assistance for quick pickups available",
    ],
    safetyAndStandards: [
      "Licensed & insured commercial operations",
      "Chauffeur screening & training – route planning, defensive driving, client service",
      "Vehicle care – inspected, sanitized interiors, climate control checked daily",
    ],
    communicationAndTracking: [
      "SMS updates – Chauffeur details and live ETA",
      "Live itinerary changes – Text dispatch for timing adjustments",
      "Support – Human dispatch throughout your charter",
    ],
    whatToExpect: [
      "Pre-Trip: You’ll receive chauffeur details and staging plan",
      "Pickup: We arrive early and confirm your first stop",
      "During: On-call for door-to-door moves and quick adjustments",
      "Wrap-Up: Final drop-off and receipt automatically emailed",
    ],
    faqs: [
      {
        q: "Is there a mileage cap?",
        a: "Hourly bookings include local mileage; additional mileage may be billed if travel extends beyond the service area.",
      },
      {
        q: "Can I add last-minute stops?",
        a: "Yes—just tell your chauffeur or text dispatch; overage may apply if you exceed your booked hours.",
      },
      {
        q: "Can we split time?",
        a: "Hourly time runs consecutively; pausing the clock is not offered.",
      },
      {
        q: "Is gratuity included?",
        a: "Tip is optional and can be added at checkout or after the ride.",
      },
      {
        q: "Do you provide car seats?",
        a: "Yes—request during booking so we stage the correct seats.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Return-Trip Bundle",
        description: "Add your ride back now for smoother timing and savings.",
      },
      {
        id: 2,
        title: "Quick En-Route Stop",
        description:
          "Short pickup (pharmacy/keys) without changing destination.",
      },
      {
        id: 3,
        title: "Lobby Meet Assist",
        description:
          "Chauffeur meets inside lobby or concierge where permitted.",
      },
      {
        id: 4,
        title: "Priority Pickup Window",
        description: "Narrow pickup window with proactive staging texts.",
      },
      {
        id: 5,
        title: "Premium Water Service",
        description: "Chilled still/sparkling stocked on request.",
      },
    ],
    forTravelManagers: [
      "Consolidated billing and rider profiles",
      "Preferred hourly rates for volume accounts",
      "Centralized itineraries with live adjustments",
    ],
    features: [
      {
        id: 2.1,
        title: "Dedicated Vehicle & Driver",
        details: "Remain on-call for the duration of your reservation.",
      },
      {
        id: 2.2,
        title: "Flexible Multi-Stop Itineraries",
        details: "Add stops on the fly with dispatch support.",
      },
      {
        id: 2.3,
        title: "Professional Staging",
        details: "Curbside or valet coordination where permitted.",
      },
      {
        id: 2.4,
        title: "Real-Time Adjustments",
        details: "We adapt to meeting runovers and venue delays.",
      },
      {
        id: 2.5,
        title: "Discreet Experience",
        details: "Low-profile vehicles, polished service.",
      },
      {
        id: 2.6,
        title: "Easy Extensions",
        details: "Extend time in small billing increments.",
      },
    ],
  },

  {
    id: 3,
    title: "Point-to-Point City Transfers",
    slug: "point-to-point",
    copy: "Direct, door-to-door transfers across the Phoenix metro—no pooling, no detours, no surge pricing.",
    marketingCopy:
      "From A to B—precisely. Flat, predictable pricing, professional chauffeurs, and clean late-model vehicles for seamless city rides.",
    src: Wedding,
    src2: Wedding,
    description:
      "When you only need a single transfer, we make it exact. Perfect for dinners, meetings, medical appointments, and hotel-to-venue runs. We stage on time, load quickly, and choose the fastest route.",
    whoThisIsFor: [
      "Professionals heading to client meetings",
      "Guests transferring between hotels, venues, and dining",
      "Families wanting a guaranteed vehicle and roomy cargo",
      "Anyone who prefers reserved, private transport over ride-share variability",
    ],
    coverageAndAirports: [
      "Service Area: Scottsdale, Phoenix, Paradise Valley, Tempe, Chandler, Mesa, Gilbert, Glendale, Peoria",
      "Popular Corridors: Old Town, Biltmore, Downtown Phoenix, Kierland, Tempe/ASU",
      "Stadium Routes: Footprint Center, Chase Field, State Farm Stadium",
      "Wider Metro: Outlying suburbs available with advance booking",
    ],
    whatsIncluded: [
      "Private Non-Stop Ride – No shared stops",
      "Route Optimization – Live traffic routing",
      "Curbside Service – As close as legally permitted",
      "Quiet Cabin – Climate control, water on request",
      "Luggage Help – Load/unload assistance",
      "Text Coordination – Smooth arrival and meet points",
    ],
    vehicleClasses: [
      "Executive SUV (up to 6–7 passengers) – Roomy and versatile",
      "Luxury Sedan (up to 3 passengers) – Efficient city transfers",
      "Premium & Specialty – Sprinter-style vans for small groups",
    ],
    pickupOptions: [
      "Doorstep/Valet Pickup: Hotel, residence, or office",
      "Venue Staging: We coordinate with staff as needed",
      "Multi-Passenger Coordination: Group splits and staggered pickups available",
    ],
    bookingAndPayment: [
      "Online booking with instant confirmation",
      "Transparent, zone-based rates—no surge pricing",
      "Deposits optional; pay-in-full available",
      "Receipts auto-emailed; monthly billing for approved accounts",
    ],
    policies: [
      "Grace Period: Standard 10–15 minutes at pickup before wait time applies",
      "Changes: Free if made pre-dispatch; billed if driver is en route or on site",
      "Same-day bookings: Subject to availability",
      "No-Shows: Marked 15–30 minutes after scheduled pickup if unreachable",
    ],
    familiesAccessibilitySpecial: [
      "Child Seats available on request",
      "ADA & Accessibility: Loading assistance and low step-in options",
      "Pet-Friendly: Crated small pets welcome; service animals always welcome",
      "Short Stops: Quick pharmacy/ATM stops available",
    ],
    safetyAndStandards: [
      "Licensed & insured commercial operations",
      "Chauffeur screening & training",
      "Vehicle cleanliness checks before every pickup",
    ],
    communicationAndTracking: [
      "SMS with driver details and ETA",
      "Live rerouting for traffic conditions",
      "Dispatch support for meet points and adjustments",
    ],
    whatToExpect: [
      "Confirmation with pickup details",
      "Text when the chauffeur is en route",
      "Help with luggage and quick departure",
      "Direct route to your destination with smooth drop-off",
    ],
    faqs: [
      {
        q: "Can I add a stop?",
        a: "Yes—brief stops can be added; additional fees or time may apply.",
      },
      {
        q: "Do you charge surge rates?",
        a: "No—rates are flat/zone-based and shown upfront.",
      },
      {
        q: "What if I’m running late?",
        a: "A grace period is included; beyond that, standard wait time applies.",
      },
      {
        q: "Do you offer meet-and-greet?",
        a: "For non-airport transfers, curbside pickup is standard; meet-in-lobby can be arranged at venues that permit it.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Cooler & Ice Setup",
        description:
          "We stage a small cooler with ice (sealed beverages only).",
      },
      {
        id: 2,
        title: "Warm-Up Range Stop",
        description: "Swing by the range or retail pro shop before tee time.",
      },
      {
        id: 3,
        title: "Multi-Course Day Shuttle",
        description: "Hourly shuttle between morning and afternoon rounds.",
      },
      {
        id: 4,
        title: "Clubhouse Liaison",
        description: "Coordination with bag drop and staff for smooth loading.",
      },
      {
        id: 5,
        title: "Post-Round Dinner Transfer",
        description: "Direct drop to your dinner reservation after 18.",
      },
    ],
    forTravelManagers: [
      "Saved traveler profiles and preferences",
      "Centralized billing and statements",
      "Live support for itinerary changes",
    ],
    features: [
      {
        id: 3.1,
        title: "Flat, Predictable Rates",
        details: "Clear pricing with no surge surprises.",
      },
      {
        id: 3.2,
        title: "Direct Routing",
        details: "No pooling, no detours—straight to destination.",
      },
      {
        id: 3.3,
        title: "Punctual Staging",
        details: "We arrive early and text upon approach.",
      },
      {
        id: 3.4,
        title: "Luggage Assistance",
        details: "Hands-on help from door to door.",
      },
      {
        id: 3.5,
        title: "Clean, Quiet Cabin",
        details: "Professional, low-profile experience.",
      },
      { id: 3.6, title: "Easy Rebooking", details: "Add a return in a tap." },
    ],
  },

  {
    id: 4,
    title: "Golf Outing Transportation",
    slug: "golf-outing-transportation",
    copy: "Seamless rides to Scottsdale’s premier courses with roomy cargo for clubs and coolers. On-time tee times guaranteed.",
    marketingCopy:
      "Make your tee time with zero stress. SUVs and Sprinter-style vans with dedicated club space, chilled cabin, and door-to-tee service.",
    src: Golf,
    src2: Golf2,
    description:
      "From resort pick-up to the first tee and 19th hole, we handle staging, club loading, and group coordination. Ideal for buddy trips, corporate foursomes, and tournament days.",
    whoThisIsFor: [
      "Golf groups with multiple sets of clubs",
      "Corporate hospitality hosting clients on course",
      "Buddies trips who want a carefree, no-parking day",
      "Resort guests coordinating multiple tee times",
    ],
    coverageAndAirports: [
      "Top Courses: TPC Scottsdale, Troon North, Grayhawk, We-Ko-Pa, Boulders, Papago, Camelback, Phoenician",
      "Resorts: Kierland, Fairmont Princess, JW Marriott, The Boulders, The Phoenician",
      "Greater Metro: Scottsdale, Phoenix, Paradise Valley, Fountain Hills, Cave Creek, Carefree",
      "Tournament & Shotgun Starts: Staging coordination available",
    ],
    whatsIncluded: [
      "Club & Gear Loading – Extra cargo space and careful handling",
      "Cool, Quiet Cabin – Arrive fresh for the first tee",
      "Staging Coordination – Meet points at bag drop or clubhouse",
      "Flexible Return – Post-round pickup timing with buffer",
      "Non-Stop Transfers – No pooling, no detours",
      "Hydration Setup – Bottled water stocked on request",
    ],
    vehicleClasses: [
      "Executive SUV (up to 6–7 passengers) – Seats + club room",
      "Sprinter-Style Van (8–14 passengers) – Teams and corporate groups",
      "Luxury Sedan (up to 3 passengers) – Perfect for pairs with carry bags",
    ],
    pickupOptions: [
      "Resort/Hotel Curbside: We stage at bell stand or valet",
      "Clubhouse/Bag Drop: Coordinated with golf staff",
      "Multi-Course Days: Hourly charter between courses",
    ],
    bookingAndPayment: [
      "Instant online booking",
      "Transparent point-to-point or hourly pricing",
      "Deposit to secure early tee-time slots",
      "Itemized receipts for expense reporting",
    ],
    policies: [
      "Early Starts: We recommend booking at least 24–48 hours ahead",
      "Grace Period: 15 minutes standard at pickup",
      "Weather Delays: We adjust pickup windows when notified",
      "Cancellations: Free within reasonable pre-dispatch window",
    ],
    familiesAccessibilitySpecial: [
      "Cooler Space: Small coolers welcome (no open containers in vehicle)",
      "Mobility Support: Loading assistance and step-in help",
      "Pet Policy: Service animals welcome; otherwise pets not typical for course transfers",
      "Child Seats: Available if bringing family to resort",
    ],
    safetyAndStandards: [
      "Licensed & insured commercial operations",
      "Chauffeur training – resort and course access etiquette",
      "Vehicle cargo prep – protected cargo areas for clubs",
    ],
    communicationAndTracking: [
      "SMS with chauffeur details and live ETA",
      "Dispatch coordination with resort bell staff",
      "Return-time confirmations post round",
    ],
    whatToExpect: [
      "Pre-Trip: Confirm tee time and club count",
      "Pickup: Load clubs carefully and depart promptly",
      "Arrival: Drop at bag drop or clubhouse entrance",
      "Return: Text when walking off 18 for fast pickup",
    ],
    faqs: [
      {
        q: "How many full sets fit in an SUV?",
        a: "Typically 4–6 full bags plus personal items in an Executive SUV.",
      },
      {
        q: "Can we stop for coffee?",
        a: "Yes—add a quick stop during booking or ask your chauffeur.",
      },
      {
        q: "What if our round runs long?",
        a: "We’ll adjust your pickup window; overage may apply if significantly delayed.",
      },
      {
        q: "Do you stock coolers?",
        a: "We can stage bottled water; you’re welcome to bring a small cooler (sealed only).",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "On-Site Marshal/Coordinator",
        description: "Dedicated ground lead to manage load zones and timing.",
      },
      {
        id: 2,
        title: "Printed Signage & Badges",
        description: "Co-branded pickup signs and staff credentials.",
      },
      {
        id: 3,
        title: "VIP/Green-Room Shuttle",
        description: "Discreet back-of-house routing for speakers and execs.",
      },
      {
        id: 4,
        title: "Manifest Manager",
        description: "Shared live manifest with real-time rider updates.",
      },
      {
        id: 5,
        title: "Radio/Comms Kit",
        description: "Event radios or alt comms for larger footprints.",
      },
    ],
    forTravelManagers: [
      "Group manifests and tee-time schedules saved to profile",
      "Consolidated billing for multi-day outings",
      "Venue liaison coordination",
    ],
    features: [
      {
        id: 4.1,
        title: "Club-Friendly Cargo",
        details: "Vehicles staged with ample luggage space.",
      },
      {
        id: 4.2,
        title: "Resort & Course Coordination",
        details: "Direct liaison with bell stands and bag drops.",
      },
      {
        id: 4.3,
        title: "Hydration & Comfort",
        details: "Chilled cabins, water on request.",
      },
      {
        id: 4.4,
        title: "Flexible Return Windows",
        details: "We adapt to pace of play.",
      },
      {
        id: 4.5,
        title: "Group Scalability",
        details: "From pairs to full team vans.",
      },
      {
        id: 4.6,
        title: "Pro-Level Punctuality",
        details: "Make your tee time, no stress.",
      },
    ],
  },

  {
    id: 5,
    title: "Corporate & Event Logistics",
    slug: "corporate-and-event-logistics",
    copy: "Multi-vehicle coordination for conferences, off-sites, and roadshows—manifests, staging, and professional dispatch.",
    marketingCopy:
      "From airport waves to venue shuttles, we run your ground game. Dedicated coordinators, live manifests, and polished execution.",
    src: Corporate,
    src2: Corporate,
    description:
      "We build a transportation plan for your agenda: executive arrivals, speaker moves, client dinners, and shuttle loops. Expect clear comms, clean vehicles, and on-time staging.",
    whoThisIsFor: [
      "Event planners needing multi-vehicle control",
      "Corporate admins coordinating VIPs and teams",
      "Production crews with tight call times",
      "Agencies hosting client hospitality programs",
    ],
    coverageAndAirports: [
      "Venues: Phoenix Convention Center, major hotels/resorts, private venues",
      "Airports: PHX, SDL, AZA for inbound VIPs",
      "Stadiums & Arenas: Footprint Center, State Farm Stadium, Chase Field",
      "Shuttle Loops: Custom routes and schedules available",
    ],
    whatsIncluded: [
      "Dedicated Coordinator – Single point of contact",
      "Driver Briefings – Uniform timing and route plans",
      "Live Manifests – Real-time updates to passenger lists",
      "Staging Plans – Load zones and signage",
      "Comms Hub – Group SMS and dispatcher line",
      "Post-Event Reporting – Rides, times, and billing summaries",
    ],
    vehicleClasses: [
      "Executive SUVs and Luxury Sedans – VIP and speaker transport",
      "Sprinter-Style Vans – Breakout shuttles and small groups",
      "Premium & Specialty – Elevated VIP options on request",
    ],
    pickupOptions: [
      "Airport Meet & Greet with signage",
      "Hotel/Resort curbside staging",
      "Venue load zone or dock coordination",
    ],
    bookingAndPayment: [
      "Signed event SOW and schedule",
      "Deposit to secure fleet on key dates",
      "Itemized invoicing and consolidated billing",
      "PO and invoicing workflows available",
    ],
    policies: [
      "Cutoff Windows: Final manifests typically 24–72 hours prior",
      "Change Management: Mid-event changes via coordinator",
      "Cancellations: Tiered policy by fleet size and date",
      "No-Shows: Documented and reported with timestamps",
    ],
    familiesAccessibilitySpecial: [
      "ADA Options: Vehicles with low step-in and assistance",
      "Dietary/Refreshments: Upon request for VIPs",
      "Multi-Language Signage: Available with notice",
      "Security Coordination: With venue/agency as required",
    ],
    safetyAndStandards: [
      "Commercial insurance and vetted chauffeurs",
      "Pre-event safety briefings and route checks",
      "Vehicle cleanliness and uniform presentation",
    ],
    communicationAndTracking: [
      "Central dispatcher and coordinator",
      "Group SMS for riders and leads",
      "Real-time timing updates and incident logs",
    ],
    whatToExpect: [
      "Discovery call and requirements review",
      "Route/staging diagrams and timing plan",
      "On-site or virtual coordination during event",
      "Post-event report and billing summary",
    ],
    faqs: [
      {
        q: "Can you brand signs?",
        a: "Yes—digital or printed signage is available with your logo.",
      },
      {
        q: "Do you support last-minute VIP changes?",
        a: "Yes—via the coordinator; fleet permitting, we add or reassign vehicles.",
      },
      {
        q: "Can you run a shuttle loop?",
        a: "Yes—fixed-route loops with posted schedules or on-demand bursts.",
      },
      {
        q: "Do you handle NDAs?",
        a: "We honor client confidentiality and can execute NDAs.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Photo-Stop Routing",
        description: "Pre-planned scenic stops with timing buffers.",
      },
      {
        id: 2,
        title: "Red-Carpet Door Assist",
        description: "Polished arrivals with door service for photos.",
      },
      {
        id: 3,
        title: "Surprise Coordination",
        description: "Quiet comms with hosts to time the big moment.",
      },
      {
        id: 4,
        title: "Floral & Garment Care",
        description: "Gentle loading and hanger space on request.",
      },
      {
        id: 5,
        title: "Restaurant/Valet Liaison",
        description: "We align drop/hold timing with venue staff.",
      },
    ],
    forTravelManagers: [
      "Centralized dashboards and monthly statements",
      "Preferred rates tied to volume",
      "Traveler profiles and policy notes",
    ],
    features: [
      {
        id: 5.1,
        title: "Dedicated Coordination",
        details: "Single POC for planning and live ops.",
      },
      {
        id: 5.2,
        title: "Live Manifests",
        details: "Real-time passenger and timing updates.",
      },
      {
        id: 5.3,
        title: "Staging Diagrams",
        details: "Clear load zones and flows.",
      },
      { id: 5.4, title: "Scalable Fleet", details: "From sedans to vans." },
      {
        id: 5.5,
        title: "Post-Event Reporting",
        details: "Operational and billing summaries.",
      },
      {
        id: 5.6,
        title: "Discreet VIP Handling",
        details: "Meet-and-greet and private access where permitted.",
      },
    ],
  },

  {
    id: 6,
    title: "Special Events",
    slug: "special-events",
    copy: "Anniversaries, proposals, graduations, and nights to remember—arrive in style with a professional chauffeur.",
    marketingCopy:
      "Make the moment effortless. Polished vehicles, picture-perfect arrivals, and stress-free timing so you can enjoy the event.",
    src: Wedding,
    src2: Wedding,
    description:
      "Celebrate without the logistics. We handle timing, parking avoidance, and door-to-door care so you can focus on the moment.",
    whoThisIsFor: [
      "Couples planning proposals or anniversaries",
      "Families celebrating graduations or milestones",
      "Friends coordinating a special night out",
      "Hosts arranging surprise events",
    ],
    coverageAndAirports: [
      "Popular Districts: Old Town Scottsdale, Desert Ridge, Biltmore, Downtown Phoenix",
      "Photo Stops: Scenic overlooks and city backdrops by request",
      "Venues: Resorts, private clubs, restaurants, theaters",
      "Stadium & Concert Access: Staging at legal pickup points",
    ],
    whatsIncluded: [
      "Door-to-Door Service – No parking stress",
      "Timing Buffer – We build in extra time for photos",
      "Discreet Presentation – Clean, elegant vehicles",
      "Itinerary Support – Coordinate with hosts and venues",
      "Quiet Cabin – Music on request, chilled air",
      "Keepsake-Friendly – Careful handling of flowers, gifts",
    ],
    vehicleClasses: [
      "Executive SUV (up to 6–7 passengers)",
      "Luxury Sedan (up to 3 passengers)",
      "Premium & Specialty – Elevated VIP options",
    ],
    pickupOptions: [
      "Home/Hotel pickup with text coordination",
      "Multiple pickups for friends/family",
      "Photo-stop routing and timing",
    ],
    bookingAndPayment: [
      "Easy online booking",
      "Flat rates or hourly based on itinerary",
      "Deposit to secure key dates",
      "Auto-emailed receipts",
    ],
    policies: [
      "Peak Dates: Book early for weekends/holidays",
      "Grace Period: 15 minutes standard at pickup",
      "Cancellations: Tiered by date; fees may apply close to event",
      "No-Shows: Marked after grace window if unreachable",
    ],
    familiesAccessibilitySpecial: [
      "Child Seats on request",
      "ADA & Accessibility support",
      "Pet Policy: Service animals welcome",
      "Fragile Items: We assist with careful loading",
    ],
    safetyAndStandards: [
      "Commercial insurance and vetted chauffeurs",
      "Clean interior standards before each ride",
      "Discreet, professional service",
    ],
    communicationAndTracking: [
      "SMS with driver details and ETA",
      "Dispatch support for surprise timing",
      "Photo-stop coordination",
    ],
    whatToExpect: [
      "Pre-Trip: Confirm timing, addresses, and photo ideas",
      "Pickup: On-time arrival with quick loading",
      "During: Smooth routing and timing buffers",
      "Wrap: Elegant drop-off and final assistance",
    ],
    faqs: [
      {
        q: "Can you help coordinate a surprise?",
        a: "Yes—share details with dispatch; we help time arrivals.",
      },
      {
        q: "Can we play our own music?",
        a: "Absolutely—Bluetooth or AUX based on vehicle.",
      },
      {
        q: "Do you decorate the vehicle?",
        a: "We maintain a clean, elegant cabin; light touches may be possible with notice.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Extra Time Blocks",
        description: "Add hours to keep the night going.",
      },
      {
        id: 2,
        title: "Venue Coordination & Guest List",
        description: "We sync windows and check-ins with venues.",
      },
      {
        id: 3,
        title: "Cooler Prep (Sealed Beverages)",
        description: "Space staged for sealed drinks; no open containers.",
      },
      {
        id: 4,
        title: "End-of-Night Split Drops",
        description: "Staggered neighborhood drop-offs for the group.",
      },
      {
        id: 5,
        title: "Playlist Setup",
        description:
          "Connect your device for music; AUX/Bluetooth as available.",
      },
    ],
    forTravelManagers: [
      "Concierge coordination",
      "Group split itineraries",
      "Consolidated statements",
    ],
    features: [
      {
        id: 6.1,
        title: "Picture-Perfect Timing",
        details: "Built-in buffers for photos and entrances.",
      },
      {
        id: 6.2,
        title: "Discreet Vehicles",
        details: "Elegant, low-profile arrivals.",
      },
      {
        id: 6.3,
        title: "Flexible Routing",
        details: "Add pickups and stops easily.",
      },
      {
        id: 6.4,
        title: "Host Coordination",
        details: "We liaise with venues for smooth flow.",
      },
      {
        id: 6.5,
        title: "Comfort-First Cabin",
        details: "Quiet ride with climate control.",
      },
      { id: 6.6, title: "Easy Booking", details: "Reserve online in minutes." },
    ],
  },

  {
    id: 7,
    title: "Party Bus",
    slug: "party-bus",
    copy: "Group nights out with room to move—music-ready cabins, coordinated venue stops, and safe returns.",
    marketingCopy:
      "Bring the whole crew. Sprinter-style and mini-coach options with coordinated pickup windows, venue staging, and end-of-night returns.",
    src: Wedding,
    src2: Wedding,
    description:
      "Ideal for birthdays, bachelor/ette parties, and concert groups. We plan multi-stop routes, keep timing tight, and ensure everyone gets home safely.",
    whoThisIsFor: [
      "Groups celebrating birthdays or milestones",
      "Bachelor/ette parties planning multiple venues",
      "Concert and festival runs with set pickup windows",
      "Teams or clubs coordinating social nights",
    ],
    coverageAndAirports: [
      "Districts: Old Town Scottsdale, Downtown Phoenix, Tempe, Westgate",
      "Venues: Bars, lounges, clubs, concert halls, stadiums",
      "Multi-Stop Routes: Pre-set windows and text callouts",
      "Return Coverage: Staggered drop-offs to multiple neighborhoods",
    ],
    whatsIncluded: [
      "Group Staging – Coordinated meet points",
      "Multi-Stop Routing – Planned windows at each venue",
      "Safety-First – Professional chauffeuring all night",
      "Group SMS – Quick updates to the whole party lead",
      "Spacious Cabin – Standing room in larger vehicles",
      "No-Surge Pricing – Clear quotes in advance",
    ],
    vehicleClasses: [
      "Sprinter-Style Van (8–14 passengers)",
      "Mini-Coach (on request, when available)",
      "Executive SUVs for overflow or split groups",
    ],
    pickupOptions: [
      "Single meeting-point pickup",
      "Neighborhood staggered pickups",
      "Venue-side staging where permitted",
    ],
    bookingAndPayment: [
      "Quote and confirm online",
      "Hourly charter with minimums for weekend nights",
      "Deposit to secure popular dates",
      "Itemized receipts for group splits",
    ],
    policies: [
      "Alcohol Policy: Closed containers only; no open containers in vehicles",
      "Cleanliness: Detailing fees may apply for spills or damage",
      "Grace Window: 10–15 minutes at each venue stop",
      "Cancellations: Tiered by date; weekend minimums apply",
    ],
    familiesAccessibilitySpecial: [
      "ADA assistance where vehicle allows",
      "Cooler space for sealed beverages",
      "Playlist-friendly cabins (bring device)",
      "Service animals welcome",
    ],
    safetyAndStandards: [
      "Commercial insurance, vetted chauffeurs",
      "Pre-trip vehicle checks",
      "Safety-first routing and venue coordination",
    ],
    communicationAndTracking: [
      "Group SMS for timing windows",
      "Live ETA updates to the party lead",
      "Dispatch line for adjustments",
    ],
    whatToExpect: [
      "Pre-Trip: Finalize headcount and route",
      "Pickup: On-time staging at first meet point",
      "During: Smooth hops between venues",
      "Wrap: Staggered drop-offs and confirmations",
    ],
    faqs: [
      {
        q: "Can we bring drinks?",
        a: "Sealed containers only; no open containers inside vehicles.",
      },
      {
        q: "Can we change venues mid-route?",
        a: "Yes—subject to timing and safety; overage may apply.",
      },
      {
        q: "Bluetooth available?",
        a: "Yes—most vehicles support Bluetooth or AUX.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Multi-Passenger Sequencing",
        description: "Pre-set sibling or co-worker pickup order.",
      },
      {
        id: 2,
        title: "Key Handling Protocol",
        description: "Secure key/code handoffs with audit notes.",
      },
      {
        id: 3,
        title: "Backup Window Scheduling",
        description: "Secondary time slots to absorb schedule drift.",
      },
      {
        id: 4,
        title: "Family/Org Billing Consolidation",
        description: "One statement for multiple riders or routes.",
      },
      {
        id: 5,
        title: "Caregiver Handoff Notes",
        description: "Documented pickup/drop procedures for minors or seniors.",
      },
    ],
    forTravelManagers: [
      "Group rosters and timing sheets",
      "Central billing for corporate socials",
      "Post-event ride log",
    ],
    features: [
      {
        id: 7.1,
        title: "Group-Friendly Fleet",
        details: "From Sprinters to mini-coaches.",
      },
      {
        id: 7.2,
        title: "Planned Venue Windows",
        details: "Keep the night moving smoothly.",
      },
      {
        id: 7.3,
        title: "Safety-First Ops",
        details: "Professional, sober chauffeuring.",
      },
      {
        id: 7.4,
        title: "Live Group Comms",
        details: "Coordinated texts and ETAs.",
      },
      { id: 7.5, title: "Clear Pricing", details: "No surge, no surprises." },
      {
        id: 7.6,
        title: "Staggered Drop-Offs",
        details: "Return everyone safely.",
      },
    ],
  },

  {
    id: 8,
    title: "Reoccurring Rides",
    slug: "reoccurring-rides",
    copy: "Set-and-forget scheduled rides: daily, weekly, or monthly. Consistent chauffeurs and reliable timing.",
    marketingCopy:
      "Subscription-style convenience. Lock in regular pickups for work commutes, school runs, or caregiver visits—one setup, ongoing reliability.",
    src: Wedding,
    src2: Wedding,
    description:
      "We automate your schedule. Choose days/times, set pickup notes, and we handle the rest with consistent chauffeurs whenever possible.",
    whoThisIsFor: [
      "Professionals with fixed commute windows",
      "Families coordinating school or activity runs",
      "Seniors needing routine appointments",
      "Corporate accounts arranging staff shuttles",
    ],
    coverageAndAirports: [
      "Metro Coverage: Scottsdale, Phoenix, Paradise Valley, Tempe, Chandler, Mesa, Gilbert",
      "Common Patterns: Morning/evening commutes, weekly appointments",
      "School & Activity Runs: With guardian authorization",
      "Account Management: Billing and schedule portal (if enabled)",
    ],
    whatsIncluded: [
      "Automated Scheduling – Pre-set days/times",
      "Consistent Chauffeurs – When availability allows",
      "Text Reminders – Prior to each pickup",
      "Grace Window – Short buffer at pickup",
      "Door-to-Door – Personalized notes honored",
      "Flexible Holds – Pause or modify with notice",
    ],
    vehicleClasses: [
      "Luxury Sedan (up to 3 passengers)",
      "Executive SUV (up to 6–7 passengers)",
      "Sprinter-Style Van – Small group patterns",
    ],
    pickupOptions: [
      "Home/School/Office curbside",
      "Front desk or lobby meet points",
      "Multi-stop sequences for siblings or co-workers",
    ],
    bookingAndPayment: [
      "Setup once via online form",
      "Recurring billing with monthly statements",
      "Deposits not typically required for stable schedules",
      "Receipts auto-emailed after each ride",
    ],
    policies: [
      "Change Window: Modify or pause with 24–48 hours notice",
      "Safety: Guardian approval required for minor riders",
      "No-Shows: Marked after grace window; standard fees apply",
      "Holiday Schedules: Adjusted timing communicated in advance",
    ],
    familiesAccessibilitySpecial: [
      "Child Seats available by pattern",
      "ADA assistance and custom notes (gate codes, elevator, etc.)",
      "Caregiver handoff protocols supported",
      "Service animals welcome",
    ],
    safetyAndStandards: [
      "Background-checked chauffeurs",
      "Consistent vehicle checks",
      "Secure rider notes and preferences",
    ],
    communicationAndTracking: [
      "SMS reminders and ETAs",
      "Dispatch reachable for day-of changes",
      "Schedule confirmations monthly",
    ],
    whatToExpect: [
      "Onboarding: Share days/times and special notes",
      "Assignment: We set consistent chauffeur/vehicle where possible",
      "Rides: Punctual pickups per schedule",
      "Adjustments: Pause or change with a quick text",
    ],
    faqs: [
      {
        q: "Can we skip a day?",
        a: "Yes—pause or skip with notice via text or portal (if enabled).",
      },
      {
        q: "Do you support minors?",
        a: "Yes—with guardian authorization and clear handoff instructions.",
      },
      {
        q: "Is pricing discounted?",
        a: "Monthly patterns may qualify for preferred rates; ask dispatch.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Multi-Passenger Sequencing",
        description: "Pre-set sibling or co-worker pickup order.",
      },
      {
        id: 2,
        title: "Key Handling Protocol",
        description: "Secure key/code handoffs with audit notes.",
      },
      {
        id: 3,
        title: "Backup Window Scheduling",
        description: "Secondary time slots to absorb schedule drift.",
      },
      {
        id: 4,
        title: "Family/Org Billing Consolidation",
        description: "One statement for multiple riders or routes.",
      },
      {
        id: 5,
        title: "Caregiver Handoff Notes",
        description: "Documented pickup/drop procedures for minors or seniors.",
      },
    ],
    forTravelManagers: [
      "Roster-based schedules",
      "Policy notes and compliance flags",
      "Usage reports and monthly summaries",
    ],
    features: [
      {
        id: 8.1,
        title: "Set-and-Forget Scheduling",
        details: "Automate your ride patterns.",
      },
      {
        id: 8.2,
        title: "Consistent Chauffeurs",
        details: "Build rapport and reliability.",
      },
      { id: 8.3, title: "Simple Pauses", details: "Skip days as needed." },
      {
        id: 8.4,
        title: "Family-Friendly Options",
        details: "Seats, notes, and handoffs.",
      },
      {
        id: 8.5,
        title: "Clear Billing",
        details: "Predictable monthly statements.",
      },
      {
        id: 8.6,
        title: "Live Support",
        details: "Dispatch available for day-of tweaks.",
      },
    ],
  },

  {
    id: 9,
    title: "Long Distance Drives",
    slug: "long-distance-drives",
    copy: "Intercity black car travel with comfort and privacy—avoid TSA lines and arrive door-to-door.",
    marketingCopy:
      "Skip the airport. Work, rest, or take calls in a quiet cabin while we handle the highway. Door-to-door, on your schedule.",
    src: Wedding,
    src2: Wedding,
    description:
      "Ideal for regional trips where flying is inefficient. We plan comfort breaks, offer door-to-door service, and keep you productive or relaxed the entire way.",
    whoThisIsFor: [
      "Executives traveling between Arizona metros",
      "Families relocating or visiting relatives",
      "Travelers with mobility or medical considerations",
      "Anyone preferring private, low-contact travel",
    ],
    coverageAndAirports: [
      "Common Routes: Phoenix ↔ Tucson, Sedona, Flagstaff, Prescott, Payson",
      "Neighboring States: Las Vegas, Palm Springs, San Diego (by quote)",
      "Flexible Departures: Early morning or late evening by request",
      "Return Options: Same-day or overnight return with rest compliance",
    ],
    whatsIncluded: [
      "Door-to-Door – Private, direct routing",
      "Comfort Breaks – Scheduled or on-demand",
      "Quiet Cabin – Work-friendly environment",
      "Luggage Help – Load/unload assistance",
      "Snacks/Water – Upon request",
      "No-Surge Pricing – Clear intercity quotes",
    ],
    vehicleClasses: [
      "Executive SUV – Space for passengers and luggage",
      "Luxury Sedan – Solo/duo comfort and efficiency",
      "Sprinter-Style Van – Small groups and gear",
    ],
    pickupOptions: [
      "Home/office/hotel pickup",
      "Multi-stop routing for additional passengers",
      "Evening or early-morning departures",
    ],
    bookingAndPayment: [
      "Quote and reserve online",
      "Deposit to secure long-haul scheduling",
      "Transparent pricing based on distance/time",
      "Receipts and trip summaries auto-emailed",
    ],
    policies: [
      "Driver Rest Compliance for long hauls",
      "Weather/Closure Contingencies with reroute options",
      "Cancellations: Tiered by distance and date",
      "No-Shows: Marked after standard grace window",
    ],
    familiesAccessibilitySpecial: [
      "Child Seats available",
      "ADA assistance for loading",
      "Pet-Friendly: Crated small pets welcome; service animals welcome",
      "Medical comfort notes supported",
    ],
    safetyAndStandards: [
      "Commercial insurance and vetted chauffeurs",
      "Vehicle comfort checks before departure",
      "Highway safety protocols",
    ],
    communicationAndTracking: [
      "SMS with driver details and departure ETA",
      "Progress updates on request",
      "Dispatch line for en-route adjustments",
    ],
    whatToExpect: [
      "Pre-Trip: Confirm timing and route preferences",
      "Departure: On-time pickup and luggage loading",
      "En Route: Comfort breaks and smooth highway routing",
      "Arrival: Doorstep drop-off and final assistance",
    ],
    faqs: [
      {
        q: "Can I work during the trip?",
        a: "Yes—quiet cabins with power options in most vehicles.",
      },
      {
        q: "Are pets allowed?",
        a: "Crated small pets welcome; service animals always welcome.",
      },
      {
        q: "Do you charge by mile or time?",
        a: "Quotes factor both distance and time; shown upfront.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Snack & Beverage Kit",
        description: "Water and light snacks prepared for the route.",
      },
      {
        id: 2,
        title: "Overnight Return Coordination",
        description: "Hotel liaison for driver rest or next-day return.",
      },
      {
        id: 3,
        title: "Pet Travel Kit",
        description: "Seat protector and cleanup supplies for crated pets.",
      },
      {
        id: 4,
        title: "Preferred Rest-Stop Plan",
        description: "Pre-mapped breaks based on your preferences.",
      },
      {
        id: 5,
        title: "Second-Driver Option",
        description: "For very long itineraries, quote a relay handoff.",
      },
    ],
    forTravelManagers: [
      "Trip manifests and policy notes",
      "Consolidated intercity billing",
      "Traveler preference profiles",
    ],
    features: [
      {
        id: 9.1,
        title: "Airport Alternative",
        details: "Private, efficient intercity travel.",
      },
      {
        id: 9.2,
        title: "Comfort-First",
        details: "Breaks, water, and climate control.",
      },
      {
        id: 9.3,
        title: "Work-Friendly",
        details: "Quiet space to call and focus.",
      },
      { id: 9.4, title: "Door-to-Door", details: "No shuttles or layovers." },
      { id: 9.5, title: "Clear Quotes", details: "No surge, no surprises." },
      {
        id: 9.6,
        title: "Flexible Timing",
        details: "Depart early or late as needed.",
      },
    ],
  },

  {
    id: 10,
    title: "Weddings",
    slug: "weddings",
    copy: "Elegant, stress-free wedding transportation—from bridal party movements to guest shuttles and getaway cars.",
    marketingCopy:
      "Your timeline, perfectly executed. Professional chauffeurs, clean vehicles, and staging plans that make every transition effortless.",
    src: Wedding,
    src2: Wedding,
    description:
      "We coordinate ceremony arrivals, photo timings, and reception departures. From quiet VIP sedans to group shuttles, we keep your day on schedule and picture-perfect.",
    whoThisIsFor: [
      "Couples wanting a polished, reliable experience",
      "Planners coordinating multi-location timelines",
      "Bridal parties with photo-stop routes",
      "Families arranging guest shuttles",
    ],
    coverageAndAirports: [
      "Popular Venues: Resorts, private estates, chapels, churches",
      "Photo Spots: Desert vistas, city backdrops, venue gardens",
      "Guest Shuttle Loops: Hotel ↔ venue circuits",
      "Airport Arrivals: PHX/SDL/AZA VIP pickups for family",
    ],
    whatsIncluded: [
      "Timeline Planning – Ceremony, photos, reception",
      "Staging & Signage – Clear meet points",
      "Bridal Party Care – Garment-friendly loading",
      "Quiet, Clean Cabins – Climate control for hair/makeup",
      "Guest Shuttle Coordination – Fixed loops or windows",
      "Getaway Car – Classic exit timing",
    ],
    vehicleClasses: [
      "Luxury Sedan – Getaway and VIP moves",
      "Executive SUV – Bridal party and family groups",
      "Sprinter-Style Van – Guest shuttles and larger parties",
    ],
    pickupOptions: [
      "Hotel suites, prep houses, and ceremony sites",
      "Venue-side staging with coordinator",
      "Photo-stop routing with buffers",
    ],
    bookingAndPayment: [
      "Consultation and quote",
      "Deposit to secure vehicles and key times",
      "Itemized billing by vehicle and hours",
      "Receipts and post-event summary",
    ],
    policies: [
      "Cutoff Windows: Final timeline 7–14 days prior",
      "Change Management: Day-of coordinator channel",
      "Cancellations: Tiered by date and fleet size",
      "No-Shows: Documented with timestamps",
    ],
    familiesAccessibilitySpecial: [
      "ADA assistance for elder family",
      "Garment-Friendly loading (train/veil awareness)",
      "Child Seats for family transfers",
      "Service animals welcome",
    ],
    safetyAndStandards: [
      "Commercial insurance and vetted chauffeurs",
      "White-glove etiquette and presentation",
      "Clean, fragrance-light interiors",
    ],
    communicationAndTracking: [
      "Coordinator chat and SMS groups",
      "Driver details shared in advance",
      "Live timing updates throughout",
    ],
    whatToExpect: [
      "Pre-Event: Timeline workshop and staging plan",
      "Ceremony: On-time arrivals and quiet staging",
      "Photos: Buffer windows and scenic stops",
      "Reception & Getaway: Smooth transitions and exit car",
    ],
    faqs: [
      {
        q: "Do you provide vehicle decorations?",
        a: "We maintain elegant, clean vehicles; light ribbons may be possible with notice.",
      },
      {
        q: "Can you run shuttles?",
        a: "Yes—guest loops between hotels and the venue with posted windows.",
      },
      {
        q: "What if the ceremony runs late?",
        a: "We adapt with built-in buffers; overage may apply if significantly delayed.",
      },
    ],
    addOns: [
      {
        id: 1,
        title: "Getaway Car Photo Moment",
        description:
          "Coordinate a picture-perfect exit with timing and staging.",
      },
      {
        id: 2,
        title: "Guest Shuttle Signage",
        description: "Branded signs and window cards for loops.",
      },
      {
        id: 3,
        title: "On-Site Marshal",
        description: "Ground lead to manage bridal party and guest flows.",
      },
      {
        id: 4,
        title: "Timeline Buffer Blocks",
        description: "Pre-purchased overage to absorb delays gracefully.",
      },
      {
        id: 5,
        title: "Photo-Stop Planning",
        description: "Scenic detours with AC-safe hair/makeup buffers.",
      },
    ],
    forTravelManagers: [
      "Planner/venue coordination",
      "Consolidated billing",
      "Post-event ride logs",
    ],
    features: [
      {
        id: 10.1,
        title: "Timeline Mastery",
        details: "Ceremony, photos, reception—on schedule.",
      },
      {
        id: 10.2,
        title: "Bridal Party Care",
        details: "Garment-aware loading and climate comfort.",
      },
      {
        id: 10.3,
        title: "Guest Shuttle Ops",
        details: "Loops with clear windows and signage.",
      },
      {
        id: 10.4,
        title: "Elegant Presentation",
        details: "Clean, discreet vehicles.",
      },
      {
        id: 10.5,
        title: "Coordinator Comms",
        details: "Live updates to keep flow smooth.",
      },
      {
        id: 10.6,
        title: "Getaway Moments",
        details: "Picture-perfect exit timing.",
      },
    ],
  },
] satisfies ReadonlyArray<ServiceShape>;
