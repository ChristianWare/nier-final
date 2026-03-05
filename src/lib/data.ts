/* eslint-disable @typescript-eslint/no-explicit-any */
import Linda from "../../public/images/linda.jpg";
import Sheryl from "../../public/images/sheryl.jpg";
import Jeff from "../../public/images/jeff.jpg";
import Airport from "../../public/images/airport.jpg";
import Airport2 from "../../public/images/airport2.jpg";
// import Events from "../../public/images/events.jpg";
// import Events2 from "../../public/images/events2.jpg";
import Party from "../../public/images/partyBusiii.jpg";
import Party2 from "../../public/images/partybus.jpg";
import Reocurring from "../../public/images/reocurring.jpg";
import Reocurring2 from "../../public/images/reocurring2.jpg";
import Distance from "../../public/images/distance.jpg";
import Distance2 from "../../public/images/road.jpg";
import Golf from "../../public/images/golf.jpg";
import Golf2 from "../../public/images/golf2.jpg";
// import CherylC from "../../public/images/CherylC.jpg";
// import JimConnie from "../../public/images/Jim&Connie.jpg";
// import Lynn from "../../public/images/lynn.jpg";
import Lady from "../../public/images/lady.jpg";
import Corporate from "../../public/images/corporateii.jpg";
import Corporate3 from "../../public/images/corporate.jpg";
import Hourly from "../../public/images/hourly.jpg";
import Hourly2 from "../../public/images/hourly2.jpg";
import Point from "../../public/images/point.jpg";
import Point2 from "../../public/images/point2.jpg";
import Wedding from "../../public/images/wedding.jpg";
import Wedding2 from "../../public/images/wedding2.jpg";
import ImgScottsdale from "../../public/images/scottsdaleii.jpg";
import ImgPhoenix from "../../public/images/phoenixii.jpg";
import ImgMesa from "../../public/images/mesaii.jpg";
import ImgTempe from "../../public/images/tempe.jpg";
import ImgWestValley from "../../public/images/westValleyiii.jpg";
import ImgCasaGrande from "../../public/images/casaGrandeii.jpg";
import ImgMaricopa from "../../public/images/maricopaii.jpg";
import Suburban from "../../public/images/taho.png";
import Escalade from "../../public/images/escalade.png";
import Sprinter from "../../public/images/sprinter.png";
import MercedesSedan from "../../public/images/mercedesSedan.png";
import PartyBus from "../../public/images/partyBusii.png";
import Bus from "../../public/images/bus.png";
import Limo from "../../public/images/limo.png";
import { VehicleData } from "./types/fleet";

export const reviews = [
  {
    id: 7,
    review:
      "Nier Transportation provided the best, outstanding quality of service for at least 20-25 family members for memorial services for my dear father. We required multiple stops, and wait times, and they were first of all affordable, on time, professional, and extremely kind. I would 1000% recommend using them for any transportation needs for personal and business purposes.",
    reviewer: "Linda R.",
    company: "Gilbert, AZ",
    person: Lady,
    summary:
      "Coordinated flawless multi-stop transportation for 20+ family members during a memorial service — affordable, on time, and genuinely kind.",
  },
  {
    id: 8,
    review:
      "Barry provides great reliable service in comfortable luxury. I travel out 1-2 times/month and I can schedule ahead. Barry will always verify the day before in the event anything changes (which it can with my job). I feel safer having someone I know pick me up sometimes at 4a. Thank you Barry!",
    reviewer: "Sheryl G.",
    company: "Scottsdale, AZ",
    person: Sheryl,
    summary:
      "A trusted monthly traveler who relies on Barry's proactive communication and consistency for early-morning pickups.",
  },
  {
    id: 9,
    review:
      "I use Nier Transportation weekly for business travel and occasionally for personal trips.  They are always timely, super friendly, and helpful, all at reasonable rates.  I highly recommend them!",
    reviewer: "Jeff G.",
    company: "Sausalito, CA",
    person: Jeff,
    summary:
      "A weekly business traveler who counts on Nier for reliable, friendly service at reasonable rates.",
  },
  {
    id: 145,
    review:
      "Have used this service multiple times. The drivers are great. Always very professional and prompt. You can tell they care about safety and a great customer experience, would definitely recommend it.",
    reviewer: "Illeana L.",
    company: "Mesa, AZ",
    person: Linda,
    summary:
      "A repeat client who highlights the professionalism, punctuality, and genuine commitment to customer safety.",
  },
] as const;

export const services = [
  {
    id: 1,
    title: "Airport Transfers",
    slug: "airport-transfers",
    copy: "Stress-free rides to and from Sky Harbor (PHX), Scottsdale (SDL), and Phoenix-Mesa Gateway (AZA). We track your flight in real time — if it's early or delayed, we adjust.",
    src: Airport,
    src2: Airport2,
    description:
      "Our Airport Transfers guarantee a seamless start or end to your journey, with professional chauffeurs who track your flight status in real time and adjust pickup as needed. Enjoy a spacious, climate-controlled vehicle and door-to-door service that removes the hassle of parking or shuttle lines. From curbside greeting to luggage handling, we manage every detail so you can focus on what matters most.",
    features: [
      {
        id: 1.1,
        title: "Real-Time Flight Monitoring",
        details:
          "We automatically adjust your pickup time based on live flight data to accommodate delays or early arrivals.",
      },
      {
        id: 1.2,
        title: "Meet & Greet Service",
        details:
          "Your chauffeur will be waiting inside the terminal with a personalized name sign for a smooth handoff.",
      },
      {
        id: 1.3,
        title: "Luggage Assistance",
        details:
          "Professional loading and unloading of all bags directly to and from the vehicle.",
      },
      {
        id: 1.4,
        title: "Complimentary Wait Time",
        details:
          "Enjoy up to 60 minutes of free wait time after landing without any additional fees.",
      },
    ],
  },
  {
    id: 2,
    title: "Hourly Chauffeur",
    slug: "hourly-chauffeur",
    copy: "A dedicated car and driver on your schedule — for meetings across town, a day of golf, wine tours, or a night out. Flexible by the hour with no mileage limits.",
    src: Hourly,
    src2: Hourly2,
    description:
      "Engage our Hourly \"As-Directed\" Chauffeur for complete flexibility — your private driver awaits your schedule, whether it's back-to-back meetings, a round of golf, or a social evening. You're billed only for the hours you use, with unlimited stops and seamless route changes on the fly. All vehicles come stocked with bottled water, phone chargers, and a professional, courteous chauffeur to ensure comfort throughout.",
    features: [
      {
        id: 2.1,
        title: "Unlimited Stops",
        details:
          "Add as many pickups or drop-offs as you need during your booked time slot.",
      },
      {
        id: 2.2,
        title: "On-Demand Route Changes",
        details:
          "Modify your itinerary on the go via text or call — no extra charge.",
      },
      {
        id: 2.3,
        title: "Hourly Rate Transparency",
        details:
          "Know exactly what you'll pay per hour with no hidden fees or mileage surcharges.",
      },
      {
        id: 2.4,
        title: "Vehicle Amenities",
        details:
          "Every car includes bottled water, phone chargers, and optional Wi-Fi access.",
      },
    ],
  },
  {
    id: 3,
    title: "Point-to-Point Transfers",
    slug: "point-to-point",
    copy: "Direct, door-to-door rides anywhere in the Valley. Your price is quoted upfront at booking — no surge pricing, no surprises. Includes a 15-minute courtesy wait.",
    src: Point,
    src2: Point2,
    description:
      "Our Point-to-Point City Transfers deliver efficient, no-surprises travel anywhere in the Valley. Benefit from fixed flat rates quoted at booking, a complimentary 15-minute wait window, and an experienced chauffeur who navigates local traffic so you arrive relaxed and on schedule. Perfect for quick trips to meetings, restaurants, or social engagements without the uncertainty of ride-share apps.",
    features: [
      {
        id: 3.1,
        title: "Fixed Flat Rates",
        details:
          "Lock in your fare up front — no surge pricing or unexpected tolls.",
      },
      {
        id: 3.2,
        title: "15-Minute Courtesy Wait",
        details:
          "We'll wait for you at no extra cost if you're running a few minutes behind.",
      },
      {
        id: 3.3,
        title: "Local Traffic Expertise",
        details:
          "Our drivers know every shortcut and peak-hour pattern to minimize delays.",
      },
      {
        id: 3.4,
        title: "Clean & Sanitized Vehicles",
        details:
          "Every car is disinfected before each trip for your peace of mind.",
      },
    ],
  },
  {
    id: 4,
    title: "Golf Outing Transportation",
    slug: "golf-outing-transportation",
    copy: "Stress-free rides to TPC Scottsdale, We-Ko-Pa, Troon North, Grayhawk, and courses across the Valley. Vehicles for any group size with clubs and gear handled.",
    src: Golf,
    src2: Golf2,
    description:
      "Hit the links without the logistics headache — our Golf Outing Transportation gets your group to top courses like TPC Scottsdale, Troon North, We-Ko-Pa, and Grayhawk in spacious SUVs or Sprinter vans. Our drivers know each course's location and the fastest routes, ensuring you arrive on time and ready to play. Clubs and equipment are pre-loaded so you can maximize your time on the green.",
    features: [
      {
        id: 4.1,
        title: "Club & Equipment Handling",
        details:
          "We load and unload all golf bags and gear directly to and from the vehicle so you don't lift a finger.",
      },
      {
        id: 4.2,
        title: "Timely Scheduling",
        details:
          "Reliable pickups and drop-offs timed to your tee time, minimizing wait and ensuring you arrive stress-free.",
      },
      {
        id: 4.3,
        title: "Knowledgeable Drivers",
        details:
          "Experienced drivers familiar with every major course in the Valley and the fastest routes to get there.",
      },
      {
        id: 4.4,
        title: "Group Coordination",
        details:
          "Whether it's a foursome in a Suburban or a full group in a Sprinter, we match the right vehicle to your party size.",
      },
    ],
  },
  {
    id: 5,
    title: "Corporate & Event Logistics",
    slug: "corporate-events",
    copy: "End-to-end ground transportation for conferences, roadshows, and VIP events. Onsite greeters, manifest tracking, consolidated billing, and a dedicated logistics coordinator.",
    src: Corporate,
    src2: Corporate3,
    description:
      "Elevate your corporate roadshows and events with our end-to-end logistics support — professional greeters meet your guests, digital manifests keep attendance organized, and one consolidated invoice simplifies expense reporting. We handle every detail so you can focus on your agenda. Tailored service options include branded signage, on-site coordinators, and multi-vehicle synchronization for smooth transitions. One point of contact, zero headaches.",
    features: [
      {
        id: 5.1,
        title: "Onsite Greeters",
        details: "Uniformed staff meet and escort your attendees on arrival.",
      },
      {
        id: 5.2,
        title: "Digital Manifest",
        details: "Real-time tracking of guest check-ins and ride assignments.",
      },
      {
        id: 5.3,
        title: "Consolidated Invoicing",
        details:
          "One single bill for all vehicles and services during your event.",
      },
      {
        id: 5.4,
        title: "Dedicated Logistics Coordinator",
        details:
          "A single point of contact manages your entire transportation operation from start to finish.",
      },
    ],
  },
  {
    id: 6,
    title: "Weddings",
    slug: "weddings",
    copy: "Elegant sedans for the couple, Sprinters for the wedding party, and motorcoaches for guests. We coordinate every ride so your day runs on schedule.",
    src: Wedding,
    src2: Wedding2,
    description:
      "Make your arrival unforgettable with our Wedding Transportation service. From elegant sedans for the couple to Sprinter vans and motorcoaches for the wedding party and guests, we coordinate every ride so your day runs on schedule. Decorations accommodated, multiple pickups coordinated, and a driver who understands the timeline matters. Personalized décor options and champagne service make your transportation as memorable as the ceremony itself.",
    features: [
      {
        id: 6.1,
        title: "Custom Décor Options",
        details:
          "Choose ribbons, flowers, or signage to match your wedding theme.",
      },
      {
        id: 6.2,
        title: "Champagne Toast Setup",
        details:
          "Pre-chilled celebratory drinks served onboard for the couple and wedding party.",
      },
      {
        id: 6.3,
        title: "Coordinated Multi-Vehicle Timing",
        details:
          "Staggered pickups and arrivals ensure every group — couple, bridal party, guests — arrives together and on time.",
      },
      {
        id: 6.4,
        title: "On-Site Coordination",
        details:
          "Dedicated staff coordinate vehicle staging and timing at your venue so transitions are seamless.",
      },
    ],
  },
  {
    id: 7,
    title: "Party Bus & Special Events",
    slug: "party-bus",
    copy: "Color-changing LED lights, Bluetooth sound systems, and wrap-around seating for birthdays, bachelor/bachelorette parties, proms, and nights out. Available for 4–8 hour charters.",
    src: Party,
    src2: Party2,
    description:
      "Turn any night into a moving celebration aboard our Party Buses, equipped with premium sound systems, color-changing LED lighting, and plush seating for up to 30 guests. Your professional chauffeur handles the road while you and your group enjoy onboard entertainment and VIP amenities. Perfect for bachelorette parties, birthday celebrations, proms, milestone events, or concert pre-shuttles.",
    features: [
      {
        id: 7.1,
        title: "LED Light Show",
        details:
          "Customizable color-changing lighting to set the mood for your event.",
      },
      {
        id: 7.2,
        title: "Premium Sound System",
        details: "Bluetooth connectivity so you can play your own playlist.",
      },
      {
        id: 7.3,
        title: "Refreshment Station",
        details: "Mini-bar and cooler space for drinks and snacks.",
      },
      {
        id: 7.4,
        title: "Leather Lounge Seating",
        details: "Spacious, comfortable wrap-around seating for socializing.",
      },
    ],
  },
  {
    id: 8,
    title: "Recurring Rides",
    slug: "recurring-rides",
    copy: "Scheduled transportation for executives and teams — same driver, same vehicle, same time. Set it up once and never deal with ride-share uncertainty again.",
    src: Reocurring,
    src2: Reocurring2,
    description:
      "Streamline your routine commutes or team shuttles with our Recurring Rides plan — set up daily, weekly, or custom schedules and we'll dispatch the same experienced driver and vehicle each time. Enjoy consistency, reliability, and priority service without having to book each trip individually. Automated billing options simplify expense management for corporate accounts.",
    features: [
      {
        id: 8.1,
        title: "Consistent Driver Assignment",
        details:
          "Ride with the same chauffeur every time for familiarity and trust.",
      },
      {
        id: 8.2,
        title: "Custom Scheduling",
        details:
          "Choose specific days and times — daily, weekly, or a custom pattern that fits your routine.",
      },
      {
        id: 8.3,
        title: "Priority Dispatch",
        details: "Recurring customers receive top priority during peak hours.",
      },
      {
        id: 8.4,
        title: "Automated Billing",
        details:
          "Weekly or monthly invoicing directly to your corporate account — no per-trip payments needed.",
      },
    ],
  },
  {
    id: 9,
    title: "Long Distance Drives",
    slug: "long-distance",
    copy: "Comfortable intercity travel to Tucson, Sedona, Flagstaff, and anywhere in Arizona. Pricing quoted upfront with no hidden fees.",
    src: Distance,
    src2: Distance2,
    description:
      "Experience stress-free Long Distance Drives in climate-controlled comfort, whether you're headed to Sedona's red rocks, Tucson's desert resorts, or Flagstaff's mountain air. Our courteous chauffeurs navigate highways and scenic byways so you can work, rest, or take in the views. Every trip includes bottled water, phone chargers, and optional in-vehicle Wi-Fi. Pricing is quoted upfront with no hidden fees.",
    features: [
      {
        id: 9.1,
        title: "Scenic Route Planning",
        details: "Choose the most picturesque roads for a memorable journey.",
      },
      {
        id: 9.2,
        title: "In-Vehicle Wi-Fi",
        details: "Stay connected with high-speed internet onboard.",
      },
      {
        id: 9.3,
        title: "Snack & Beverage Kit",
        details: "Optional pre-stocked refreshments for longer trips.",
      },
      {
        id: 9.4,
        title: "Flexible Stopovers",
        details: "Add breaks or sightseeing stops without changing your rate.",
      },
    ],
  },
] as const;

export const ServiceAreas = [
  {
    id: 7,
    city: "Scottsdale",
    desc: "Scottsdale is known for its vibrant arts scene, upscale shopping, and stunning desert landscapes.",
    src: ImgScottsdale,
  },
  {
    id: 8,
    city: "Phoenix",
    desc: "The state's capital and largest city, offering a diverse cultural scene, desert botanical gardens, and outdoor adventures.",
    src: ImgPhoenix,
  },
  {
    id: 9,
    city: "Mesa",
    desc: "Mesa boasts a rich history, with the Mesa Arts Center and a thriving downtown area, making it a hub for arts and culture.",
    src: ImgMesa,
  },
  {
    id: 10,
    city: "Tempe",
    desc: "Home to Arizona State University, combines a lively college atmosphere with recreation along Tempe Town Lake.",
    src: ImgTempe,
  },
  {
    id: 13,
    city: "West Valley",
    desc: "Avondale, Goodyear, Buckeye, Surprise, Glendale, Tolleson, and Peoria—suburban living with easy recreation.",
    src: ImgWestValley,
  },
  {
    id: 14,
    city: "Casa Grande",
    desc: "Casa Grande, home of Lucid Motors, features the Casa Grande Ruins National Monument and a welcoming community.",
    src: ImgCasaGrande,
  },
  {
    id: 15,
    city: "Maricopa",
    desc: "Maricopa is a fast‑growing, family‑friendly city set against the natural beauty of the Sonoran Desert.",
    src: ImgMaricopa,
  },
] as const;

export const homeQuestions = [
  {
    id: 1,
    question: "How do you handle flight delays or early arrivals?",
    answer:
      "We monitor your flight in real time and automatically adjust your pickup window at no extra charge. If your flight arrives early, your chauffeur will be standing by; if it’s delayed, we’ll wait up to 60 minutes after landing before any fees apply.",
  },
  {
    id: 1.1,
    question: "What is your cancellation policy?",
    answer:
      "You can cancel or modify your reservation free of charge up to 24 hours before your scheduled pickup. Cancellations made within 24 hours may incur a fee equal to one hour of service or 50% of the trip fare, whichever is less.",
  },
  {
    id: 1.2,
    question: "Can I bring pets or special equipment?",
    answer:
      "Yes—small pets are welcome in our vehicles at no extra cost (please use a carrier). For larger animals or special equipment (golf clubs, skis, wheelchairs), select the appropriate add-on during booking and we’ll provide secure storage and handling.",
  },
  {
    id: 1.3,
    question: "Are gratuities included in the fare?",
    answer:
      "Our fares represent the total cost of your transportation.  However, if you feel inclined, tips are always welcomed and appreciated.",
  },
  {
    id: 1.4,
    question: "What safety measures do you have in place?",
    answer:
      "Every vehicle is cleaned and sanitized before each trip, and all chauffeurs undergo annual defensive-driving recertification and background checks. We also maintain 256-bit SSL encryption on our booking and payment systems to protect your data.",
  },
  {
    id: 1.5,
    question: "How can I add extra stops or change my route?",
    answer:
      "You can add up to three additional stops or modify your itinerary at any time via our mobile app, website, or by calling your chauffeur directly. All changes are confirmed instantly and reflected in your final fare.",
  },
  {
    id: 1.6,
    question: "Do you offer group or corporate discounts?",
    answer:
      "Yes—teams of five or more traveling together, or accounts with recurring ride volume, qualify for custom corporate pricing and priority booking. Contact our sales team for a tailored rate sheet and service agreement.",
  },
] as const;

export const aboutQuestions = [
  {
    id: "a1",
    question: "How long has Nier Transportation been in business?",
    answer:
      "Nier Transportation has been serving the Phoenix and Scottsdale area since 2004. Over two decades of operation have allowed us to build a reputation for reliability, professionalism, and luxury service that our clients trust.",
  },
  {
    id: "a2",
    question: "Are your chauffeurs professionally trained and vetted?",
    answer:
      "Yes — every chauffeur undergoes a thorough background check, holds a valid commercial driver's license, and completes annual defensive-driving recertification before joining our team. We only hire experienced professionals who meet our service standards.",
  },
  {
    id: "a3",
    question: "Is Nier Transportation a locally owned company?",
    answer:
      "Yes, we are a family-owned and operated business based in Scottsdale, Arizona. As a local company, we take pride in knowing our service area inside and out and delivering a personal level of service that larger national chains simply can't match.",
  },
  {
    id: "a4",
    question: "What areas do you serve?",
    answer:
      "We serve the entire Metro Phoenix area including Scottsdale, Phoenix, Tempe, Mesa, Chandler, Gilbert, Paradise Valley, and surrounding communities. We also accommodate long-distance trips throughout Arizona.",
  },
  {
    id: "a5",
    question: "How do you maintain your fleet?",
    answer:
      "Every vehicle in our fleet is inspected and serviced on a regular maintenance schedule. Before each trip, vehicles are cleaned and sanitized to ensure a pristine experience for every passenger.",
  },
] as const;

export const serviceQuestions = [
  {
    id: "s1",
    question: "What types of transportation services do you offer?",
    answer:
      "We offer a full range of luxury ground transportation including airport transfers, hourly chauffeur service, corporate travel, wedding transportation, special events, and long-distance rides throughout Arizona.",
  },
  {
    id: "s2",
    question: "How do I know which service is right for my trip?",
    answer:
      "For point-to-point trips like airport pickups, a flat-rate transfer is the most straightforward option. For events, sightseeing, or multi-stop itineraries, hourly chauffeur service gives you the most flexibility. If you're unsure, our team is happy to recommend the best fit.",
  },
  {
    id: "s3",
    question: "Do you offer flat-rate airport pricing?",
    answer:
      "Yes — all airport transfers are priced at a flat rate with no surge pricing. The fare you see at booking is the fare you pay, regardless of traffic or flight delays.",
  },
  {
    id: "s4",
    question: "How far in advance should I book?",
    answer:
      "We recommend booking at least 24 hours in advance to guarantee vehicle availability, especially for larger vehicles or weekend events. Same-day bookings are accepted based on availability.",
  },
  {
    id: "s5",
    question: "Can I book a service for a group or corporate event?",
    answer:
      "Absolutely. We accommodate groups of all sizes with our fleet of SUVs, Sprinter vans, and motorcoaches. Corporate accounts with recurring travel needs also qualify for custom pricing and priority booking.",
  },
] as const;

export const fleetQuestions = [
  {
    id: "f1",
    question: "How do I choose the right vehicle for my trip?",
    answer:
      "The right vehicle depends on your group size, luggage needs, and the occasion. Executive sedans are ideal for solo or couples travel, SUVs handle small groups with luggage comfortably, and Sprinter vans or motorcoaches are best for larger parties or events. If you're unsure, our team is happy to help you select the right fit.",
  },
  {
    id: "f2",
    question: "How many passengers can your vehicles accommodate?",
    answer:
      "Our fleet ranges from executive sedans seating up to 3 passengers all the way to motorcoaches accommodating large groups. Each vehicle listing includes exact passenger and luggage capacity so you can book with confidence.",
  },
  {
    id: "f3",
    question: "Are all vehicles in the fleet available 24/7?",
    answer:
      "Yes — our full fleet is available around the clock, 365 days a year. We recommend booking in advance for larger vehicles, particularly during weekends and peak event seasons, to guarantee your preferred vehicle.",
  },
  {
    id: "f4",
    question: "What amenities are included in the vehicles?",
    answer:
      "All vehicles are equipped with premium leather seating, climate control, and complimentary bottled water. Larger vehicles such as Sprinter vans and party buses include additional amenities — check the individual vehicle page for a full list.",
  },
  {
    id: "f5",
    question: "Can I request a specific vehicle for my booking?",
    answer:
      "Yes — you can select your preferred vehicle directly during the booking process. If your requested vehicle is unavailable for your date, we will contact you to arrange a comparable alternative at no extra charge.",
  },
] as const;

export const corporateQuestions = [
  {
    id: "c1",
    question: "How does a corporate account work?",
    answer:
      "A corporate account gives your organization a centralized billing profile, allowing employees to book rides without paying out of pocket. All trips are invoiced to your account on a schedule that works for your finance team — weekly, bi-weekly, or monthly.",
  },
  {
    id: "c2",
    question:
      "Is there a minimum spend or volume requirement to open a corporate account?",
    answer:
      "No minimum spend is required to get started. We work with companies of all sizes, from small teams with occasional travel needs to large organizations with high-volume recurring bookings.",
  },
  {
    id: "c3",
    question: "Can we set travel policies or spending limits for employees?",
    answer:
      "Yes — corporate accounts include configurable controls so you can set per-trip spending limits, require approval for certain vehicle classes, and restrict bookings to specific destinations or time windows.",
  },
  {
    id: "c4",
    question: "How do employees book rides under our corporate account?",
    answer:
      "Employees book directly through our website or app using your company's account credentials. Trips are automatically tagged to your account for billing, with no need to submit expense reports or reimbursements.",
  },
  {
    id: "c5",
    question: "What reporting is available for corporate accounts?",
    answer:
      "Your account dashboard provides full trip history, per-employee usage breakdowns, and downloadable invoices. This makes it easy to track transportation spend and reconcile billing at the end of each period.",
  },
] as const;

export type Vehicle = {
  id: number;
  title: string;
  slug: string;
  class: string;
  heroLine?: string;
  shortDesc?: string;
  longDesc?: string;
  seats: string;
  luggage?: string;
  cargo?: string;
  cargoCuFt?: string;
  bestFor?: ReadonlyArray<string>;
  specs?: {
    drivetrain?: string;
    rideFeel?: string;
    cabin?: string;
    dimensions?: string;
  };
  amenities?: ReadonlyArray<string>;
  safetyTech?: ReadonlyArray<string>;
  features?: ReadonlyArray<string>;
  availabilityNotes?: string;
  images?: ReadonlyArray<{ src: any; alt: string }>;
  src?: any;
  rateRules?: {
    minimumHours?: number;
    hourlyFromUSD?: number;
    airportTransferFromUSD?: number;
    meetAndGreetUSD?: number;
    afterHoursSurchargePct?: number;
    waitTimeGraceMin?: number;
    extraStopUSD?: number;
  };
  policy?: {
    summary: string;
    details: string[];
  };
  faqs?: ReadonlyArray<{ q: string; a: string }>;
  seo?: {
    metaTitle: string;
    metaDescription: string;
  };
  desc?: string;
};

export const fleetData: ReadonlyArray<VehicleData> = [
  {
    id: 1,
    title: "Executive Sedan",
    slug: "mercedes-e-class-sedan",
    class: "Executive Sedan",
    heroLine: "Executive comfort with a discreet profile.",
    shortDesc:
      "A refined executive sedan for one to three passengers who value a quiet, comfortable ride.",
    longDesc:
      "Ideal for airport runs and business dinners when a full-size SUV isn't necessary. The E-Class blends comfort, technology, and a smaller footprint for effortless city travel.",
    seats: "3 seater",
    luggage: "2 full-size suitcases",
    cargo: "19 cu ft",
    cargoCuFt: "~19 cu ft",
    bestFor: ["Airport transfers", "Business travel", "Evenings out"],
    specs: {
      drivetrain: "RWD/AWD (fleet dependent)",
      rideFeel: "Smooth and quiet",
      cabin: "Leather seating, excellent sound insulation",
    },
    amenities: [
      "Bottled water",
      "Phone chargers",
      "Privacy tint",
      "Heated/ventilated seats (select trims)",
      "Luggage assistance",
      "Car seats by request",
    ],
    safetyTech: [
      "ABS & stability control",
      "Blind-spot monitoring",
      "Forward collision warning",
      "Lane-keep assist",
      "360° camera / parking sensors (select trims)",
      "Airbags throughout",
    ],
    features: [
      "Discreet arrival and easy city maneuvering",
      "Comfortable for two with room for carry-ons",
      "Great cabin quietness for calls on the go",
    ],
    availabilityNotes: "Black exterior, black interior.",
    images: [
      { src: MercedesSedan, alt: "Executive sedan exterior" },
      { src: "/images/fleet/eclass-2.jpg", alt: "Executive sedan interior" },
    ],
    rateRules: {
      minimumHours: 2,
      hourlyFromUSD: 95,
      airportTransferFromUSD: 125,
      meetAndGreetUSD: 20,
      afterHoursSurchargePct: 20,
      waitTimeGraceMin: 15,
      extraStopUSD: 20,
    },
    policy: {
      summary: "Free cancellation up to 12 hours before pickup.",
      details: [
        "Within 12 hours, cancellation fees may apply.",
        "No-show billed in full.",
      ],
    },
    faqs: [
      {
        q: "Is there trunk space for larger suitcases?",
        a: "Two standard bags fit comfortably; note oversized items when you book.",
      },
      {
        q: "Is meet-and-greet available?",
        a: "Yes—add it at checkout for a curbside sign or terminal meet per airport policy.",
      },
      {
        q: "Can three adults ride comfortably?",
        a: "Yes for shorter city trips. For longer rides or extra luggage, we recommend moving up to an SUV.",
      },
      {
        q: "Do you have charging ports in the rear seats?",
        a: "Yes—USB charging is available. If you need USB-C specifically, mention it and we'll assign a suitable unit.",
      },
      {
        q: "Is the ride quiet enough for calls?",
        a: "Yes—our executive sedan is known for excellent cabin isolation, making it ideal for calls and focused work.",
      },
      {
        q: "Can you provide a child seat?",
        a: "Yes—add your request at booking and we'll pre-install before pickup.",
      },
    ],
    seo: {
      metaTitle: "Executive Sedan | Nier Transportation Fleet",
      metaDescription:
        "Executive sedan for efficient city travel and airport transfers. Comfortable, quiet, and discreet.",
    },
    desc: "A refined executive sedan for solo travelers or couples who value discreet style, quiet comfort, and a smooth ride. Ideal for airport transfers and business travel.",
    src: MercedesSedan,
  },
  {
    id: 2,
    title: "7-Passenger SUV",
    slug: "chevy-suburban",
    class: "Full-Size SUV",
    heroLine: "Spacious comfort for families and small groups.",
    shortDesc:
      "Our flagship full-size SUV with generous legroom and cargo space—ideal for airport transfers and all-day charters.",
    longDesc:
      "The perfect SUV for families, golf outings, or executive travel where comfort and luggage room both matter. Pairs highway stability with true carry-on capacity.",
    seats: "7 seater",
    luggage: "4–6 suitcases (golf bags fit)",
    cargo: "144.7 cu ft",
    cargoCuFt: "Up to ~145 cu ft (config-dependent)",
    bestFor: [
      "Airport transfers",
      "Golf outings",
      "Family travel",
      "Business teams",
    ],
    specs: {
      drivetrain: "RWD/AWD (fleet dependent)",
      rideFeel: "Quiet, composed, premium SUV ride",
      cabin: "Leather seating, rear climate controls",
    },
    amenities: [
      "Bottled water",
      "Phone chargers",
      "Tri-zone climate",
      "Rear climate controls",
      "Privacy tint",
      "Luggage assistance",
      "Car seats by request",
    ],
    safetyTech: [
      "ABS & stability control",
      "Blind-spot monitoring",
      "Forward collision warning",
      "Lane-keep assist",
      "360° camera / parking sensors",
      "Airbags throughout",
    ],
    features: [
      "Flexible seating and cargo for mixed groups",
      "Great for FBO and commercial airport pickups",
      "Easy in/out access for seniors and kids",
    ],
    availabilityNotes: "Black exterior standard.",
    images: [
      { src: Suburban, alt: "7-passenger SUV exterior" },
      { src: "/images/fleet/suburban-2.jpg", alt: "7-passenger SUV interior" },
    ],
    rateRules: {
      minimumHours: 2,
      hourlyFromUSD: 115,
      airportTransferFromUSD: 145,
      meetAndGreetUSD: 25,
      afterHoursSurchargePct: 20,
      waitTimeGraceMin: 15,
      extraStopUSD: 25,
    },
    policy: {
      summary: "Free cancellation up to 12 hours before pickup.",
      details: [
        "Cancellations within 12 hours may incur up to 100% charge.",
        "No-show billed in full.",
        "Non-refundable deposits may apply for peak dates.",
      ],
    },
    faqs: [
      {
        q: "Can you fit golf bags and luggage together?",
        a: "Yes—please note the number of bags at booking and we'll configure seating to maximize cargo.",
      },
      {
        q: "Do you track inbound flights?",
        a: "Yes. We monitor flight changes and include a 15-minute grace period for deplaning.",
      },
      {
        q: "Can you provide child seats?",
        a: "Yes—infant, convertible, or booster seats are available by request. Add them during booking so we can stage the vehicle.",
      },
      {
        q: "Is meet-and-greet service available inside the terminal?",
        a: "Yes—add Meet & Greet at checkout and your chauffeur will greet you with a sign in baggage claim or at the designated area.",
      },
      {
        q: "What if my group or luggage exceeds expectations on the day?",
        a: "Tell us as soon as possible. We can reconfigure seats or dispatch an additional vehicle, subject to availability and any fare difference.",
      },
      {
        q: "Do after-hours pickups cost more?",
        a: "Yes—rides outside standard hours include a 20% after-hours surcharge as listed in Rate Rules.",
      },
    ],
    seo: {
      metaTitle: "7-Passenger SUV | Nier Transportation Fleet",
      metaDescription:
        "Book a spacious 7-passenger SUV with professional chauffeur—ideal for families, golf trips, and airport transfers.",
    },
    desc: "Our flagship full-size SUV with tri-zone climate control and best-in-class legroom. Perfect for families, small groups, and anyone who needs space for luggage without sacrificing comfort.",
    src: Suburban,
  },
  {
    id: 3,
    title: "Luxury SUV",
    slug: "cadillac-escalade-esv",
    class: "Extended Luxury SUV",
    heroLine: "Iconic luxury with extended cargo and elevated presence.",
    shortDesc:
      "A long-wheelbase luxury SUV offering first-class comfort, premium finishes, and serious luggage capacity.",
    longDesc:
      "For VIP arrivals, black-tie events, or upscale business travel, this extended luxury SUV delivers unmistakable presence, buttery ride quality, and an expansive cargo area for longer itineraries.",
    seats: "6 seater",
    luggage: "4–5 suitcases",
    cargo: "121 cu ft",
    cargoCuFt: "~121 cu ft (config-dependent)",
    bestFor: ["VIP travel", "Events & galas", "Executive roadshows"],
    specs: {
      drivetrain: "RWD/AWD (fleet dependent)",
      rideFeel: "Ultra-plush, quiet cabin",
      cabin: "Premium leather, ambient lighting, rear climate",
    },
    amenities: [
      "Bottled water",
      "Phone chargers",
      "Tri-zone climate",
      "Heated/ventilated seats",
      "Privacy tint",
      "Ambient lighting",
      "Luggage assistance",
      "Car seats by request",
    ],
    safetyTech: [
      "ABS & stability control",
      "Blind-spot monitoring",
      "Forward collision warning",
      "Lane-keep assist",
      "360° camera / parking sensors",
      "Airbags throughout",
    ],
    features: [
      "Extended wheelbase for added comfort and cargo",
      "Signature luxury finishes for premium experiences",
      "Ideal for VIP transfers and special occasions",
    ],
    availabilityNotes: "Black exterior, black interior.",
    images: [
      { src: Escalade, alt: "Luxury SUV exterior" },
      { src: "/images/fleet/escalade-2.jpg", alt: "Luxury SUV interior" },
    ],
    rateRules: {
      minimumHours: 2,
      hourlyFromUSD: 145,
      airportTransferFromUSD: 185,
      meetAndGreetUSD: 35,
      afterHoursSurchargePct: 20,
      waitTimeGraceMin: 15,
      extraStopUSD: 35,
    },
    policy: {
      summary: "Free cancellation up to 24 hours before pickup.",
      details: [
        "Within 24 hours, cancellation fees may apply up to the full fare.",
        "No-show billed in full.",
        "Peak and event dates may require a non-refundable deposit.",
      ],
    },
    faqs: [
      {
        q: "Is this suitable for red-carpet or black-tie events?",
        a: "Absolutely. Our luxury SUV is the go-to for elevated occasions and VIP itineraries.",
      },
      {
        q: "Can you provide car seats?",
        a: "Yes—infant, convertible, or booster seats by request. Please specify at booking.",
      },
      {
        q: "How many passengers can ride comfortably with full luggage?",
        a: "Four to five riders with 5–6 standard bags is the comfortable max. For six riders with heavy luggage, consider a second vehicle.",
      },
      {
        q: "Can we request a specific seating layout?",
        a: "Yes—captain's chairs in the second row are standard on most units. Tell us your preference during booking and we'll confirm availability.",
      },
      {
        q: "Is smoking or vaping allowed?",
        a: "No—our vehicles are strictly non-smoking. Cleaning fees apply for violations.",
      },
      {
        q: "Do you offer discreet pickups for VIPs?",
        a: "Yes—coordinate with our dispatch team for low-profile pickup points and direct-to-door service.",
      },
    ],
    seo: {
      metaTitle: "Luxury SUV | Nier Transportation Fleet",
      metaDescription:
        "Arrive in style in our extended luxury SUV. Premium comfort for VIP travel, events, and executive transport in Phoenix.",
    },
    desc: "The pinnacle of luxury SUVs — premium leather, rear captain's chairs, and a smooth, commanding ride that delivers a first-class experience from pickup to drop-off.",
    src: Escalade,
  },
  {
    id: 4,
    title: "Executive Sprinter Van",
    slug: "mercedes-sprinter-executive-14",
    class: "Executive Sprinter",
    heroLine: "Boardroom-level comfort for groups.",
    shortDesc:
      "Captain's chairs, headroom to stand, and power at every seat—group travel without compromise.",
    longDesc:
      "Our executive sprinter van brings business-class comfort to group itineraries. Great for team offsites, golf groups, wedding parties, and airport shuttles with luggage.",
    seats: "14 seater",
    luggage: "Up to 12 carry-ons or mixed luggage (config-dependent)",
    cargo: "Up to 532 cu ft",
    cargoCuFt: "Up to ~532 cu ft (config-dependent)",
    bestFor: ["Corporate shuttles", "Team travel", "Weddings", "Golf groups"],
    specs: {
      drivetrain: "RWD/AWD (fleet dependent)",
      rideFeel: "High-roof comfort, stable highway ride",
      cabin: "Executive seating, stand-up headroom, aisle access",
    },
    amenities: [
      "Bottled water",
      "Phone chargers",
      "Wi-Fi (when available)",
      "220V/USB power",
      "Rear climate controls",
      "Privacy tint",
      "Luggage assistance",
    ],
    safetyTech: [
      "ABS & stability control",
      "Blind-spot monitoring",
      "Forward collision warning",
      "Lane-keep assist",
      "360° camera / parking sensors",
      "Airbags throughout",
    ],
    features: [
      "Executive captain's chairs",
      "Overhead storage (select models)",
      "Ideal for roadshows, offsites, and wedding parties",
    ],
    availabilityNotes: "Black exterior; conference layout varies by unit.",
    images: [
      { src: Sprinter, alt: "Executive sprinter van exterior" },
      {
        src: "/images/fleet/sprinter-exec-2.jpg",
        alt: "Executive sprinter van interior",
      },
    ],
    rateRules: {
      minimumHours: 3,
      hourlyFromUSD: 165,
      airportTransferFromUSD: 225,
      meetAndGreetUSD: 45,
      afterHoursSurchargePct: 25,
      waitTimeGraceMin: 15,
      extraStopUSD: 45,
    },
    policy: {
      summary: "Free cancellation up to 48 hours before pickup.",
      details: [
        "Within 48 hours, cancellation fees may apply up to the full fare.",
        "Event dates and peak weekends may require non-refundable deposits.",
      ],
    },
    faqs: [
      {
        q: "Can we hold a brief meeting onboard?",
        a: "Yes—many groups use the sprinter van for mobile briefings.",
      },
      {
        q: "Is there space for golf bags?",
        a: "Yes—please specify group size and luggage counts at booking.",
      },
      {
        q: "Does the vehicle have Wi-Fi and power at every seat?",
        a: "USB/AC power is standard; Wi-Fi is available on select units. Request it at booking so we can assign the right vehicle.",
      },
      {
        q: "Is there a restroom onboard?",
        a: "No—our executive sprinter vans do not include restrooms. We're happy to plan brief comfort stops for longer trips.",
      },
      {
        q: "Can we load banners or small signage for corporate groups?",
        a: "Yes—window clings or small removable signs are fine with prior approval. No adhesives that leave residue.",
      },
      {
        q: "What's the best passenger/luggage mix?",
        a: "For 12–14 passengers with significant luggage, consider a luggage trailer or a second vehicle. Share your counts and we'll advise.",
      },
    ],
    seo: {
      metaTitle: "Executive Sprinter Van | Nier Transportation Fleet",
      metaDescription:
        "Executive sprinter van with captain's chairs and power at every seat—premium group travel for teams and events in Phoenix.",
    },
    desc: "Lounge-style cabin with stand-up headroom, USB-C charging at every seat, and onboard Wi-Fi. Built for corporate teams, golf outings, and groups that want to travel together in style.",
    src: Sprinter,
  },
  {
    id: 5,
    title: "Stretch Limousine",
    slug: "stretch-limousine",
    class: "Luxury Limousine",
    heroLine: "Classic elegance for life's most memorable moments.",
    shortDesc:
      "The iconic stretch limo — perfect for weddings, proms, anniversaries, and VIP arrivals that demand a grand entrance.",
    longDesc:
      "Nothing signals a special occasion quite like a stretch limousine. With a plush extended cabin, ambient lighting, and a dedicated chauffeur, it's the classic choice for weddings, anniversaries, milestone birthdays, and any event where the arrival is part of the experience.",
    seats: "10–18 seater",
    luggage: "Light luggage and personal items",
    cargo: "Limited — designed for passengers",
    cargoCuFt: "Config-dependent",
    bestFor: ["Weddings", "Prom", "Anniversaries", "VIP arrivals", "Birthdays"],
    specs: {
      drivetrain: "RWD",
      rideFeel: "Smooth, gliding ride",
      cabin: "Extended plush interior, fiber-optic lighting, privacy partition",
    },
    amenities: [
      "Bottled water & ice",
      "Phone chargers",
      "Fiber-optic lighting",
      "Privacy partition",
      "Premium sound system",
      "Bluetooth audio",
      "Privacy tint",
    ],
    safetyTech: [
      "ABS & stability control",
      "Forward collision warning",
      "Parking sensors",
      "Airbags throughout",
    ],
    features: [
      "Extended cabin for celebrations en route",
      "Privacy partition between chauffeur and guests",
      "Iconic arrival experience for weddings and events",
    ],
    availabilityNotes:
      "Black exterior standard. Alcohol policy varies by event — confirm at booking. No glass containers.",
    images: [{ src: Suburban, alt: "Stretch limousine exterior" }],
    rateRules: {
      minimumHours: 3,
      hourlyFromUSD: 175,
      meetAndGreetUSD: 0,
      afterHoursSurchargePct: 25,
      waitTimeGraceMin: 10,
      extraStopUSD: 40,
    },
    policy: {
      summary: "Free cancellation up to 72 hours before pickup.",
      details: [
        "Within 72 hours, cancellation fees may apply up to the full fare.",
        "Security deposit may be required for events.",
        "Cleaning fees apply if needed.",
      ],
    },
    faqs: [
      {
        q: "Is this available for weddings?",
        a: "Absolutely — the stretch limo is our most popular choice for wedding day transport.",
      },
      {
        q: "Can we bring champagne onboard?",
        a: "Alcohol policies vary by event — please confirm at booking. No glass containers are permitted.",
      },
      {
        q: "How many passengers fit comfortably?",
        a: "Eight to ten passengers depending on configuration. Share your headcount and we'll confirm the right fit.",
      },
      {
        q: "Are decorations allowed?",
        a: "Light, removable décor is welcome with prior approval. No adhesives, glitter, or confetti.",
      },
      {
        q: "Is gratuity included?",
        a: "Gratuity is optional and can be added at checkout or after the ride.",
      },
      {
        q: "Can we request a specific pickup and drop-off schedule?",
        a: "Yes — share your full itinerary at booking and we'll coordinate timing around your event.",
      },
    ],
    seo: {
      metaTitle: "Stretch Limousine | Nier Transportation Fleet",
      metaDescription:
        "Arrive in classic style with a stretch limousine — perfect for weddings, proms, anniversaries, and special occasions in Phoenix.",
    },
    desc: "The classic stretch limo with fiber-optic lighting, privacy partition, and a premium sound system. The iconic choice for weddings, proms, and any occasion that deserves a grand entrance.",
    src: Limo, // replace with your limo image import
  },
  {
    id: 6,
    title: "Mini Bus",
    slug: "mini-party-bus-20-40",
    class: "Party/Limo Bus",
    heroLine: "Group celebrations with room to move.",
    shortDesc:
      "Open-plan seating, standing room, and lighting for a celebratory atmosphere—perfect for nights out and weddings.",
    longDesc:
      "Designed for celebrations and group fun with safety at the forefront. Great for bachelor/ette parties, concert nights, and wedding guest moves.",
    seats: "20–40 seater",
    luggage: "Ample cabin storage",
    cargo: "Ample cabin storage",
    cargoCuFt: "Config-dependent",
    bestFor: ["Weddings", "Concerts", "Bachelor/ette", "Birthdays"],
    specs: {
      drivetrain: "RWD",
      rideFeel: "Comfortable and social",
      cabin: "Open plan with standing room",
    },
    amenities: [
      "Bottled water",
      "Phone chargers",
      "Privacy tint",
      "Ambient lighting",
      "Bluetooth audio",
    ],
    safetyTech: [
      "ABS & stability control",
      "Forward collision warning",
      "Parking sensors",
      "Airbags where equipped",
    ],
    features: [
      "Open-plan seating and lighting",
      "Ideal for venue hops and celebration loops",
      "Coordinated drop-offs and pickup windows",
    ],
    availabilityNotes:
      "Alcohol policy varies by event—confirm at booking. No glass containers permitted.",
    images: [
      { src: PartyBus, alt: "Party bus exterior" },
      { src: "/images/fleet/partybus-2.jpg", alt: "Party bus interior" },
    ],
    rateRules: {
      minimumHours: 4,
      hourlyFromUSD: 195,
      meetAndGreetUSD: 0,
      afterHoursSurchargePct: 25,
      waitTimeGraceMin: 10,
      extraStopUSD: 45,
    },
    policy: {
      summary: "Free cancellation up to 72 hours before pickup.",
      details: [
        "Within 72 hours, cancellation fees may apply up to the full fare.",
        "Security deposit may be required.",
        "Spill/cleaning fees may apply if needed.",
      ],
    },
    faqs: [
      {
        q: "Can we bring drinks onboard?",
        a: "Policies vary by event—please confirm during booking. No glass containers are permitted.",
      },
      {
        q: "Do you allow venue loops?",
        a: "Yes—share your schedule and we'll build a safe loop with planned stops.",
      },
      {
        q: "Is there a restroom onboard?",
        a: "No—our party buses do not include restrooms. We can schedule brief stops as needed.",
      },
      {
        q: "Can we play our own music and lights?",
        a: "Yes—Bluetooth audio is available and ambient lighting is included. Share any special requests in advance.",
      },
      {
        q: "Are decorations allowed?",
        a: "Light, removable décor is fine with prior approval. No adhesives that leave residue, glitter, or confetti.",
      },
      {
        q: "Is gratuity included?",
        a: "Gratuity is optional unless specified for certain events. You can add it during checkout or after the ride.",
      },
    ],
    seo: {
      metaTitle: "Party Bus | Nier Transportation Fleet",
      metaDescription:
        "Celebrate safely with a party bus—perfect for weddings, concerts, and group nights out in Phoenix.",
    },
    desc: "Color-changing LED lights, Bluetooth sound system, and wrap-around seating turn every ride into an event. Perfect for birthdays, bachelor/bachelorette parties, and nights out on the town.",
    src: PartyBus,
  },
  {
    id: 7,
    title: "Full-Size Motorcoach",
    slug: "motorcoach",
    class: "Full-Size Coach",
    heroLine: "Full-size group transport for large parties and events.",
    shortDesc:
      "Reclining seats, overhead storage, and a smooth highway ride—built for corporate shuttles, wedding guests, and large group outings.",
    longDesc:
      "When your group outgrows a sprinter van, the motorcoach delivers. Full-size coach seating with reclining chairs, overhead compartments, and undercarriage luggage bays handle everything from corporate conference shuttles to multi-stop wedding guest transport.",
    seats: "56 seater",
    luggage: "Undercarriage luggage bays for full-size suitcases",
    cargo: "Undercarriage luggage bays",
    cargoCuFt: "Large undercarriage bays (config-dependent)",
    bestFor: [
      "Corporate shuttles",
      "Wedding guest transport",
      "Large group outings",
      "Multi-stop itineraries",
    ],
    specs: {
      drivetrain: "RWD",
      rideFeel: "Smooth, stable highway ride with air suspension",
      cabin: "Reclining seats, center aisle, overhead storage",
    },
    amenities: [
      "Bottled water",
      "Phone chargers (USB at each row)",
      "Climate control",
      "Overhead storage",
      "PA system / microphone",
      "Privacy tint",
      "Luggage assistance",
    ],
    safetyTech: [
      "ABS & stability control",
      "Forward collision warning",
      "Parking sensors / backup camera",
      "Emergency exits throughout",
      "Fire suppression system",
    ],
    features: [
      "Reclining seats with armrests and headrests",
      "Undercarriage luggage bays for suitcases and equipment",
      "PA system for announcements and guided tours",
      "Ideal for 30–50+ passenger groups",
    ],
    availabilityNotes:
      "Black or white exterior available. Confirm color preference at booking.",
    images: [
      { src: Bus, alt: "Motorcoach exterior" },
      { src: "/images/fleet/motorcoach-2.jpg", alt: "Motorcoach interior" },
    ],
    rateRules: {
      minimumHours: 4,
      hourlyFromUSD: 275,
      meetAndGreetUSD: 0,
      afterHoursSurchargePct: 25,
      waitTimeGraceMin: 15,
      extraStopUSD: 65,
    },
    policy: {
      summary: "Free cancellation up to 7 days before pickup.",
      details: [
        "Within 7 days, cancellation fees may apply up to 50% of the fare.",
        "Within 48 hours, full fare may be charged.",
        "Non-refundable deposit required at booking for peak dates.",
      ],
    },
    faqs: [
      {
        q: "How many passengers can the motorcoach hold?",
        a: "Our motorcoach seats 40+ passengers comfortably with reclining seats and a center aisle.",
      },
      {
        q: "Is there storage for luggage?",
        a: "Yes—large undercarriage luggage bays hold full-size suitcases, equipment, and supplies. Overhead compartments are available for personal items.",
      },
      {
        q: "Is there a restroom onboard?",
        a: "Select units include an onboard restroom. Please request this at booking and we'll confirm availability.",
      },
      {
        q: "Can we use the PA system for announcements?",
        a: "Yes—a PA system with microphone is included, ideal for tour guides, corporate hosts, or wedding coordinators.",
      },
      {
        q: "Is the motorcoach suitable for long-distance trips?",
        a: "Absolutely. The air-ride suspension and reclining seats make it comfortable for highway travel to destinations like Sedona, Tucson, or Flagstaff.",
      },
      {
        q: "Can we bring food and drinks onboard?",
        a: "Light refreshments are permitted. No glass containers. Cleaning fees may apply for excessive spills.",
      },
    ],
    seo: {
      metaTitle: "Full-Size Motorcoach | Nier Transportation Fleet",
      metaDescription:
        "Full-size motorcoach for 40+ passengers. Reclining seats, luggage bays, and a smooth ride—ideal for corporate shuttles and large group events in Phoenix.",
    },
    desc: "Full-size coach with reclining seats, overhead storage, and a smooth highway ride. Ideal for corporate shuttles, wedding guest transport, large group outings, and multi-stop itineraries.",
    src: Bus,
  },
] as const;