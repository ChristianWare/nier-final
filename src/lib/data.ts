import Linda from "../../public/images/linda.jpg";
import Sheryl from "../../public/images/sheryl.jpg";
import Jeff from "../../public/images/jeff.jpg";
import Airport from "../../public/images/airport.jpg";
import Airport2 from "../../public/images/airport2.jpg";
import Events from "../../public/images/events.jpg";
import Events2 from "../../public/images/events2.jpg";
import Party from "../../public/images/partyBusiii.jpg";
import Party2 from "../../public/images/partybus.jpg";
import Reocurring from "../../public/images/reocurring.jpg";
import Reocurring2 from "../../public/images/reocurring2.jpg";
import Distance from "../../public/images/distance.jpg";
import Distance2 from "../../public/images/road.jpg";
import Golf from "../../public/images/golf.jpg";
import Golf2 from "../../public/images/golf2.jpg";
import CherylC from "../../public/images/CherylC.jpg";
import JimConnie from "../../public/images/Jim&Connie.jpg";
import Lynn from "../../public/images/lynn.jpg";
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
import Escalade from "../../public/images/escalade.avif";
import Sprinter from "../../public/images/sprinter.png";
import MercedesSedan from "../../public/images/mercedesSedan.avif";
import PartyBus from "../../public/images/partyBusii.png";
import { Vehicle } from "./types/fleet";

export const reviews = [
  {
    id: 7,
    review:
      "Nier Transportation provided the best, outstanding quality of service for at least 20-25 family members for memorial services for my dear father. We required multiple stops, and wait times, and they were first of all affordable, on time, professional, and extremely kind. I would 1000% recommend using them for any transportation needs for personal and business purposes.",
    reviewer: "Linda R.",
    company: "Gilbert, AZ",
    person: Lady,
  },
  {
    id: 8,
    review:
      "Barry provides great reliable service in comfortable luxury. I travel out 1-2 times/month and I can schedule ahead. Barry will always verify the day before in the event anything changes (which it can with my job). I feel safer having someone I know pick me up sometimes at 4a. Thank you Barry!",
    reviewer: "Sheryl G.",
    company: "Scottsdale, AZ",
    person: Sheryl,
  },
  {
    id: 9,
    review:
      "I use Nier Transportation weekly for business travel and occasionally for personal trips.  They are always timely, super friendly, and helpful, all at reasonable rates.  I highly recommend them!",
    reviewer: "Jeff G.",
    company: "Sausalito, CA",
    person: Jeff,
  },
  // {
  //   id: 11,
  //   review:
  //     "We have used this car service 4 times in the last few months. Booking a pick-up/drop-off time is very easy and seamless. Barry, the owner is very professional, friendly, and prompt as was one of his other drivers. We have flown in and out of Phoenix all 4 times with our dog and his kennel and Barry was very attentive to ensuring our dog (while in his kennel) was comfortable and safe before we left.Pricing is competitive but the service is better and good value for what you get. Cars are very roomy and spotless. Highly recommend this car service.",
  //   reviewer: "Cheryl C.",
  //   company: "Northwest Calgary, Canada",
  //   person: CherylC,
  // },
  // {
  //   id: 12,
  //   review:
  //     "We first rode with Barry over one year ago.We were so impressed with his level of pride, professional bearing, situational awareness, and meticulous attention to detail in all mannersrelating to our safety and satisfaction that we made the decision to use him exclusively for all our transportation needs.Nier Transportation has afforded us the luxury of worry-free rides with absolute dependability. They monitor our arrival and departure schedules in real time and adjust accordingly, with no excuses, cancellations, or surprises.Their level of service and the peace of mind it gives is priceless.",
  //   reviewer: "Jim & Connie A.",
  //   company: "Phoenix, AZ,",
  //   person: JimConnie,
  // },
  // {
  //   id: 13,
  //   review:
  //     "We used Nier Transportation to start and end our European vacation. It was the BEST decision! Our driver was professional, friendly, and timely. We also felt as though we were riding in luxury, the vehicle was new, fresh, and comfortable! An extra thanks for being at the airport waiting for us when we arrived back home at 1:30 a.m.!",
  //   reviewer: "Lynn B",
  //   company: "Tempe, AZ",
  //   person: Lynn,
  // },
  {
    id: 145,
    review:
      "Have used this service multiple times. The drivers are great. Always very professional and prompt. You can tell they care about safety and a great customer experience, would definitely recommend it.",
    reviewer: "Illeana L.",
    company: "Mesa, AZ",
    person: Linda,
  },
  // {
  //   id: 146,
  //   review:
  //     "I just started utilizing Nier Transportation a couple of months ago and have never used a driving service before. I was surprised to see how easy it was to schedule and use as I wasn't sure how it would work in relation to price timeliness, and reliability. I travel almost weekly and Barry, the owner made it very simple by asking for my flight itinerary, and pick-up times. I have used his service a few times so far and have had numerous changes to my plans and he has come through every time. He even made a special trip to pick up a backpack for my daughter when I was in Hawaii so when we returned, we wouldn't have to make a special trip. Vehicles are nice and clean, and Barry is a good man. His pricing is competitive and you get great value with all the things I stated above. Highly Recommended",
  //   reviewer: "Adam B.",
  //   company: "Phoenix, AZ",
  //   person: Adam,
  // },
] as const;

export const services = [
  {
    id: 1,
    title: "Airport Transfers",
    slug: "airport-transfers",
    copy: "Reliable black car service to Scottsdale, Sky Harbor, and Gateway airports. Professional chauffeurs ensure, stress-free travel.",
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
    copy: "Keep a dedicated car and driver on standby for meetings, golf, or a night out; pay only for the hours you use.",
    src: Hourly,
    src2: Hourly2,
    description:
      "Engage our Hourly “As-Directed” Chauffeur for complete flexibility—your private driver awaits your schedule, whether it’s back-to-back meetings, a round of golf, or a social evening. You’re billed only for the exact time you travel, with unlimited stops and seamless route changes on the fly. All vehicles come stocked with bottled water, phone chargers, and a professional, courteous chauffeur to ensure comfort throughout.",
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
          "Modify your itinerary on the go via text or call—no extra charge.",
      },
      {
        id: 2.3,
        title: "Hourly Rate Transparency",
        details:
          "Know exactly what you’ll pay, down to the minute, with no hidden fees.",
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
    copy: "Direct, door-to-door rides across the Valley with fixed pricing and 15-minute courtesy wait time.",
    src: Point,
    src2: Point2,
    description:
      "Our Point-to-Point City Transfers deliver efficient, no-surprises travel anywhere in the Valley. Benefit from fixed flat rates, a complimentary 15-minute wait window, and an experienced chauffeur who navigates local traffic so you arrive relaxed and on schedule. Perfect for quick trips to meetings, restaurants, or social engagements without the uncertainty of ride-share apps.",
    features: [
      {
        id: 3.1,
        title: "Fixed Flat Rates",
        details:
          "Lock in your fare up front—no surge pricing or unexpected tolls.",
      },
      {
        id: 3.2,
        title: "15-Minute Courtesy Wait",
        details:
          "We’ll wait for you at no extra cost if you’re running a few minutes behind.",
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
    copy: "Stress-free rides to TPC, We-Ko Pa, Troon and other courses. Vehicles for any group size with knowledgeable local drivers.",
    src: Golf,
    src2: Golf2,
    description:
      "Hit the links without the logistics headache: our Golf Outing Tours transport your group to top courses like TPC Scottsdale or Troon North in spacious SUVs or vans. Our drivers know each course’s layout and club rules, ensuring you arrive ready to play. Clubs and equipment can be pre-loaded to maximize your time on the green.",
    features: [
      {
        id: 4.1,
        title: "Comfortable Vehicles",
        details:
          "Use well-maintained, spacious vehicles that provide a comfortable ride for passengers, ensuring a pleasant experience before and after the game.",
      },
      {
        id: 4.2,
        title: "Timely Scheduling",
        details:
          "Establish a reliable schedule that allows for timely pickups and drop-offs, minimizing wait times and ensuring players arrive at the course without stress.",
      },
      {
        id: 4.3,
        title: "Knowledgeable Drivers",
        details:
          "Employ experienced drivers who are familiar with the area and can navigate efficiently, providing local insights and tips about the golf course and surroundings.",
      },
      {
        id: 4.4,
        title: "Group Coordination",
        details:
          "Facilitate group transportation options, such as shuttles or vans, to accommodate larger parties, fostering a social atmosphere and making it easier for players to travel together.",
      },
    ],
  },
  {
    id: 5,
    title: "Corporate & Event Logistics",
    slug: "corporate-events",
    copy: "VIP roadshows and conferences with onsite greeters, manifest tracking, and consolidated billing.",
    src: Corporate,
    src2: Corporate3,
    description:
      "Elevate your corporate roadshows and events with our end-to-end logistics support: professional greeters meet your guests, digital manifests keep attendance organized, and one consolidated invoice simplifies expense reporting. We handle every detail so you can focus on your agenda. Tailored service options include branded signage, on-site coordinators, and multi-vehicle synchronization for smooth transitions.",
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
        title: "Branded Signage Options",
        details:
          "Custom logo signs or banner stands for a polished, professional look.",
      },
    ],
  },
  {
    id: 6,
    title: "Special Events",
    slug: "special-events",
    copy: "Arrive in style for any occasion. We provide luxury vehicles and shuttle buses to suit all group sizes and event types.",
    src: Events,
    src2: Events2,
    description:
      "Make an entrance at weddings, galas, and social celebrations with our Special Events service, featuring luxury sedans, stretch limousines, or shuttle buses tailored to your guest count. Our team coordinates timing, signage, and on-site support so every arrival is flawless. Custom branding, champagne service, and red-carpet setups are available to elevate the experience.",
    features: [
      {
        id: 6.1,
        title: "Red-Carpet Welcome",
        details: "Roll out the red carpet for an unforgettable arrival.",
      },
      {
        id: 6.2,
        title: "Champagne Service",
        details: "Toast to the moment with chilled champagne on board.",
      },
      {
        id: 6.3,
        title: "Guest Counting",
        details: "We manage headcounts to ensure every guest is accounted for.",
      },
      {
        id: 6.4,
        title: "On-Site Coordination",
        details: "Dedicated staff coordinate vehicle staging and timing.",
      },
    ],
  },
  {
    id: 7,
    title: "Party Bus",
    slug: "party-bus",
    copy: "Elevate your celebration with our premium party buses. Featuring spacious interiors, entertainment systems, and professional chauffeurs.",
    src: Party,
    src2: Party2,
    description:
      "Turn any night into a moving celebration aboard our Party Buses, equipped with premium sound systems, LED lighting, and plush seating for up to 30 guests. Your personal chauffeur handles the road while you and your group enjoy onboard entertainment and VIP amenities. Perfect for bachelorette parties, birthday celebrations, or concert pre-shuttles.",
    features: [
      {
        id: 7.1,
        title: "LED Light Show",
        details: "Customizable lighting to set the mood.",
      },
      {
        id: 7.2,
        title: "Premium Sound System",
        details: "Bluetooth connectivity for your playlist.",
      },
      {
        id: 7.3,
        title: "Refreshment Station",
        details: "Mini-bar and cooler space for drinks and snacks.",
      },
      {
        id: 7.4,
        title: "Leather Lounge Seating",
        details: "Spacious, comfortable seating for socializing.",
      },
    ],
  },
  {
    id: 8,
    title: "Reoccurring Rides",
    slug: "reoccurring-rides",
    copy: "Dependable transportation for regular business needs. Scheduled rides ensure timely arrivals without ride-share uncertainties.",
    src: Reocurring,
    src2: Reocurring2,
    description:
      "Streamline your routine commutes or team shuttles with our Reoccurring Rides plan—set up daily, weekly, or custom schedules and we’ll dispatch the same experienced driver and vehicle each time. Enjoy consistency, reliability, and priority service without having to book each trip individually. Automated billing options simplify expense management for corporate accounts.",
    features: [
      {
        id: 8.1,
        title: "Consistent Driver Assignment",
        details: "Ride with the same chauffeur for familiarity and trust.",
      },
      {
        id: 8.2,
        title: "Custom Scheduling",
        details: "Choose specific days and times for your repeating rides.",
      },
      {
        id: 8.3,
        title: "Priority Dispatch",
        details:
          "Reoccurring customers receive top priority during peak hours.",
      },
      {
        id: 8.4,
        title: "Automated Billing",
        details:
          "Weekly or monthly invoicing directly to your corporate account.",
      },
    ],
  },
  {
    id: 9,
    title: "Long Distance Drives",
    slug: "long-distance",
    copy: "Comfortable intercity travel with professional drivers. Relax in our well-maintained vehicles while we handle the journey.",
    src: Distance,
    src2: Distance2,
    description:
      "Experience stress-free Long Distance Drives in climate-controlled comfort, whether you’re headed to Sedona’s red rocks or Tucson’s desert resorts. Our courteous chauffeurs navigate highways and scenic byways so you can work, rest, or take in the views without interruption. Every trip includes bottled water, phone chargers, and optional in-vehicle Wi-Fi to keep you connected.",
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
  {
    id: 10,
    title: "Golf Outing Transportation",
    slug: "golf-outing-transportation",
    copy: "Stress-free rides to TPC, We-Ko Pa, Troon and other courses. Vehicles for any group size with knowledgeable local drivers.",
    src: Golf,
    src2: Golf2,
    description:
      "Hit the links without the logistics headache: our Golf Outing Tours transport your group to top courses like TPC Scottsdale or Troon North in spacious SUVs or vans. Our drivers know each course’s layout and club rules, ensuring you arrive ready to play. Clubs and equipment can be pre-loaded to maximize your time on the green.",
    features: [
      {
        id: 10.1,
        title: "Comfortable Vehicles",
        details:
          "Use well-maintained, spacious vehicles that provide a comfortable ride for passengers, ensuring a pleasant experience before and after the game.",
      },
      {
        id: 10.2,
        title: "Timely Scheduling",
        details:
          "Establish a reliable schedule that allows for timely pickups and drop-offs, minimizing wait times and ensuring players arrive at the course without stress.",
      },
      {
        id: 10.3,
        title: "Knowledgeable Drivers",
        details:
          "Employ experienced drivers who are familiar with the area and can navigate efficiently, providing local insights and tips about the golf course and surroundings.",
      },
      {
        id: 10.4,
        title: "Group Coordination",
        details:
          "Facilitate group transportation options, such as shuttles or vans, to accommodate larger parties, fostering a social atmosphere and making it easier for players to travel together.",
      },
    ],
  },
  {
    id: 11,
    title: "Weddings",
    slug: "party-bus-weddings",
    copy: "LED lighting, Bluetooth sound, and wrap-around seating for unforgettable celebrations and seamless shuttles.",
    src: Wedding,
    src2: Wedding2,
    description:
      "Add a touch of luxury to your wedding day with our Wedding Shuttles or Party Buses—complete with ambient lighting, premium audio, and plush seating. We coordinate pickup times and routes so your entire party arrives together and on time. Personalized décor options and keepsake signage make your transportation as memorable as the ceremony itself.",
    features: [
      {
        id: 11.1,
        title: "Custom Décor Options",
        details: "Choose ribbons, flowers, or signage to match your theme.",
      },
      {
        id: 11.2,
        title: "Keepsake Signage",
        details: "Personalized boards to commemorate your special day.",
      },
      {
        id: 11.3,
        title: "Champagne Toast Setup",
        details: "Pre-chilled celebratory drinks served onboard.",
      },
      {
        id: 11.4,
        title: "Coordinated Bridal Party Pickup",
        details: "Staggered timing ensures everyone arrives together.",
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

export const fleetData: ReadonlyArray<Vehicle> = [
  {
    id: 1,
    title: "Chevy Suburban",
    slug: "chevy-suburban",
    class: "Full-Size SUV",
    heroLine: "Spacious comfort for families and small groups.",
    shortDesc:
      "Our flagship full-size SUV with generous legroom and cargo space—ideal for airport transfers and all-day charters.",
    longDesc:
      "The Suburban pairs highway stability with true carry-on capacity. It’s the sweet spot for families, golf outings, or executive travel where comfort and luggage room both matter.",
    seats: "7 seater",
    luggage: "5–7 standard bags (golf bags fit)",
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
      { src: Suburban, alt: "Chevy Suburban exterior" },
      { src: "/images/fleet/suburban-2.jpg", alt: "Chevy Suburban interior" },
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
        a: "Yes—please note the number of bags at booking and we’ll configure seating to maximize cargo.",
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
      metaTitle: "Chevy Suburban | Nier Transportation Fleet",
      metaDescription:
        "Book a spacious Chevy Suburban with professional chauffeur—ideal for families, golf trips, and airport transfers.",
    },
    desc: "Our flagship full-size SUV pairs tri-zone climate control with class-leading leg- and luggage-room—perfect for families or small groups.",
    src: Suburban,
  },
  {
    id: 2,
    title: "Cadillac Escalade ESV",
    slug: "cadillac-escalade-esv",
    class: "Extended Luxury SUV",
    heroLine: "Iconic luxury with extended cargo and elevated presence.",
    shortDesc:
      "The long-wheelbase Escalade ESV offers first-class comfort, premium finishes, and serious luggage capacity.",
    longDesc:
      "For VIP arrivals, black-tie events, or upscale business travel, the Escalade ESV delivers unmistakable presence, buttery ride quality, and an expansive cargo area for longer itineraries.",
    seats: "6 seater",
    luggage: "5–6 standard bags",
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
      { src: Escalade, alt: "Cadillac Escalade ESV exterior" },
      {
        src: "/images/fleet/escalade-2.jpg",
        alt: "Cadillac Escalade ESV interior",
      },
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
        a: "Absolutely. The ESV is our go-to for elevated occasions and VIP itineraries.",
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
        a: "Yes—captain’s chairs in the second row are standard on most units. Tell us your preference during booking and we’ll confirm availability.",
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
      metaTitle: "Cadillac Escalade ESV | Nier Transportation Fleet",
      metaDescription:
        "Arrive in style with an Escalade ESV. Extended luxury SUV with premium comfort for VIP travel and events.",
    },
    desc: "The pinnacle of luxury SUVs—premium leather, rear captain’s chairs, and magnetic ride control for a first-class travel experience.",
    src: Escalade,
  },
  {
    id: 3,
    title: "Mercedes-Benz Sprinter",
    slug: "mercedes-sprinter-executive-14",
    class: "Executive Sprinter",
    heroLine: "Boardroom-level comfort for groups.",
    shortDesc:
      "Captain’s chairs, headroom to stand, and power at every seat—group travel without compromise.",
    longDesc:
      "Our executive Sprinter brings business-class comfort to group itineraries. Great for team offsites, golf groups, wedding parties, and airport shuttles with luggage.",
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
      "Executive captain’s chairs",
      "Overhead storage (select models)",
      "Ideal for roadshows, offsites, and wedding parties",
    ],
    availabilityNotes: "Black exterior; conference layout varies by unit.",
    images: [
      { src: Sprinter, alt: "Executive Sprinter exterior" },
      {
        src: "/images/fleet/sprinter-exec-2.jpg",
        alt: "Executive Sprinter interior",
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
        a: "Yes—many groups use the Sprinter for mobile briefings.",
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
        a: "No—our 14-passenger executive Sprinters do not include restrooms. We’re happy to plan brief comfort stops for longer trips.",
      },
      {
        q: "Can we load banners or small signage for corporate groups?",
        a: "Yes—window clings or small removable signs are fine with prior approval. No adhesives that leave residue.",
      },
      {
        q: "What’s the best passenger/luggage mix?",
        a: "For 12–14 passengers with significant luggage, consider a luggage trailer or a second vehicle. Share your counts and we’ll advise.",
      },
    ],
    seo: {
      metaTitle: "Mercedes Sprinter Executive (14) | Nier Transportation Fleet",
      metaDescription:
        "Executive Sprinter with captain’s chairs and power at every seat—premium group travel for teams and events.",
    },
    desc: "Lounge-style cabin with stand-up headroom, USB-C charging at every seat, and onboard Wi-Fi—ideal for corporate teams and golf outings.",
    src: Sprinter,
  },
  {
    id: 4,
    title: "Mercedes-Benz E-Class Sedan",
    slug: "mercedes-e-class-sedan",
    class: "Executive Sedan",
    heroLine: "Executive comfort with a discreet profile.",
    shortDesc:
      "A refined executive sedan for one to three passengers who value a quiet, comfortable ride.",
    longDesc:
      "Ideal for airport runs and business dinners when a full-size SUV isn’t necessary. The E-Class blends comfort, technology, and a smaller footprint for effortless city travel.",
    seats: "3 seater",
    luggage: "2–3 standard bags",
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
      { src: MercedesSedan, alt: "Mercedes E-Class exterior" },
      { src: "/images/fleet/eclass-2.jpg", alt: "Mercedes E-Class interior" },
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
        a: "Yes—USB charging is available. If you need USB-C specifically, mention it and we’ll assign a suitable unit.",
      },
      {
        q: "Is the ride quiet enough for calls?",
        a: "Yes—the E-Class is known for excellent cabin isolation, making it ideal for calls and focused work.",
      },
      {
        q: "Can you provide a child seat for the sedan?",
        a: "Yes—add your request at booking and we’ll pre-install before pickup.",
      },
    ],
    seo: {
      metaTitle: "Mercedes-Benz E-Class | Nier Transportation Fleet",
      metaDescription:
        "Executive sedan for efficient city travel and airport transfers. Comfortable, quiet, and discreet.",
    },
    desc: "A refined executive sedan for solo travelers or couples who value discreet style, quiet comfort, and advanced safety tech.",
    src: MercedesSedan,
  },
  {
    id: 5,
    title: "Mini Party Bus",
    slug: "mini-party-bus-20",
    class: "Party/Limo Bus",
    heroLine: "Group celebrations with room to move.",
    shortDesc:
      "Open-plan seating, standing room, and lighting for a celebratory atmosphere—perfect for nights out and weddings.",
    longDesc:
      "Designed for celebrations and group fun with safety at the forefront. Great for bachelor/ette parties, concert nights, and wedding guest moves.",
    seats: "20 seater",
    luggage: "By request (best for people-moving)",
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
      { src: PartyBus, alt: "Mini party bus exterior" },
      { src: "/images/fleet/partybus-2.jpg", alt: "Mini party bus interior" },
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
        a: "Yes—share your schedule and we’ll build a safe loop with planned stops.",
      },
      {
        q: "Is there a restroom onboard?",
        a: "No—mini party buses do not include restrooms. We can schedule brief stops as needed.",
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
      metaTitle: "Mini Party Bus (20) | Nier Transportation Fleet",
      metaDescription:
        "Celebrate safely with a mini party bus—perfect for weddings, concerts, and group nights out.",
    },
    desc: "Color-changing LED lights, Bluetooth sound, and wrap-around seating keep the celebration rolling from door to door.",
    src: PartyBus,
  },
] as const;
