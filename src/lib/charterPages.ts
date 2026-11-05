// src/lib/charterPages.ts
//
// Content for the charter bus pages: /charter-bus-rental-phoenix and
// /charter-bus-rental-scottsdale. Trip distances and drive times are
// approximate, by highway, without traffic or stops.

import type { CharterTrip } from "@/components/charterPage/CharterGuide/CharterGuide";

export const PHOENIX_CHARTER_TRIPS: CharterTrip[] = [
  {
    destination: "Scottsdale",
    distance: "About 12 miles",
    time: "20–30 min",
    note: "Resort conferences, Old Town nights, TPC Scottsdale",
    href: "/charter-bus-rental-scottsdale",
  },
  {
    destination: "Tucson",
    distance: "About 115 miles",
    time: "About 1¾–2 hrs",
    note: "University of Arizona games, conferences, Tucson airport",
    href: "/routes/tucson-to-phoenix",
  },
  {
    destination: "Sedona",
    distance: "About 115 miles",
    time: "About 2 hrs",
    note: "Day trips, tours and wine country; most groups book a full day",
    href: "/routes/phoenix-to-sedona",
  },
  {
    destination: "Prescott",
    distance: "About 100 miles",
    time: "About 1¾ hrs",
    note: "Whiskey Row, Prescott Valley events, summer escapes",
    href: "/routes/phoenix-to-prescott",
  },
  {
    destination: "Flagstaff",
    distance: "About 145 miles",
    time: "About 2¼ hrs",
    note: "NAU, Snowbowl ski trips, Route 66",
    href: "/routes/flagstaff-to-phoenix",
  },
  {
    destination: "Grand Canyon (South Rim)",
    distance: "About 230 miles",
    time: "About 3½–4 hrs",
    note: "A long day or an overnight; driver-hour limits apply",
    href: "/routes/phoenix-to-grand-canyon",
  },
  {
    destination: "Las Vegas",
    distance: "About 300 miles",
    time: "About 5 hrs",
    note: "Usually an overnight trip, quoted case by case",
  },
];

export const PHOENIX_CHARTER_VENUES = [
  "Phoenix Sky Harbor Airport",
  "Phoenix Convention Center",
  "State Farm Stadium",
  "Chase Field",
  "Footprint Center",
  "Desert Diamond Arena",
  "Talking Stick Resort Amphitheatre",
  "Arizona State University",
  "Grand Canyon University",
  "Arizona State Fairgrounds",
  "Phoenix Raceway",
  "Spring training ballparks",
  "Downtown Phoenix hotels",
  "Desert Ridge resorts",
];

export const SCOTTSDALE_CHARTER_TRIPS: CharterTrip[] = [
  {
    destination: "Phoenix Sky Harbor (PHX)",
    distance: "About 15 miles",
    time: "20–30 min",
    note: "Group arrivals and departures for resort conferences and weddings",
    href: "/routes/scottsdale-to-sky-harbor",
  },
  {
    destination: "Downtown Phoenix",
    distance: "About 12 miles",
    time: "25–35 min",
    note: "Chase Field, Footprint Center, the Convention Center",
    href: "/charter-bus-rental-phoenix",
  },
  {
    destination: "State Farm Stadium",
    distance: "About 30 miles",
    time: "40–50 min",
    note: "Cardinals games, concerts, the Fiesta Bowl",
    href: "/blog/state-farm-stadium-parking-guide",
  },
  {
    destination: "Sedona",
    distance: "About 115 miles",
    time: "About 2 hrs",
    note: "Red rock day trips; most groups book a full day",
    href: "/routes/phoenix-to-sedona",
  },
  {
    destination: "Tucson",
    distance: "About 125 miles",
    time: "About 2 hrs",
    note: "University of Arizona games and events",
    href: "/routes/tucson-to-phoenix",
  },
  {
    destination: "Grand Canyon (South Rim)",
    distance: "About 230 miles",
    time: "About 3½–4 hrs",
    note: "A long day or an overnight; driver-hour limits apply",
    href: "/routes/phoenix-to-grand-canyon",
  },
];

export const SCOTTSDALE_CHARTER_VENUES = [
  "TPC Scottsdale",
  "WestWorld of Scottsdale",
  "Salt River Fields at Talking Stick",
  "Scottsdale Stadium",
  "Old Town Scottsdale",
  "Talking Stick Resort",
  "Fairmont Scottsdale Princess",
  "The Phoenician",
  "The Westin Kierland Resort",
  "JW Marriott Camelback Inn",
  "Four Seasons Troon North",
  "Troon North Golf Club",
  "Kierland Commons",
  "Scottsdale Airport (SDL)",
  "Taliesin West",
];

export const SCOTTSDALE_CHARTER_INTRO = {
  eyebrow: "Why Scottsdale groups charter",
  heading: "Scottsdale moves in groups",
  paragraphs: [
    "Scottsdale's biggest weeks are group weeks. The WM Phoenix Open fills TPC Scottsdale every February, Barrett-Jackson takes over WestWorld in January, and spring training brings the Giants to Scottsdale Stadium and the Diamondbacks and Rockies to Salt River Fields. Parking at all of them is far, slow and expensive, and a charter bus drops the whole group at the gate and picks everyone up together.",
    "The rest of the year it's resort conferences, weddings and golf. Conference groups shuttle between the Princess, the Phoenician, Kierland and Camelback Inn and the Sky Harbor terminals. Desert wedding venues in North Scottsdale often sit at the end of long, narrow private drives, which is where a 28- or 40-passenger mini bus fits better than a full-size coach. We check access with the venue before your date.",
    "We're based in Scottsdale on Via Linda and have driven these roads since 2004, so we know which resorts load coaches at the front drive, which use a service entrance, and how long the 101 takes at 5 pm.",
  ],
};

export const SCOTTSDALE_CHARTER_FAQS = [
  {
    id: "sc1",
    question: "How much does a charter bus cost in Scottsdale?",
    answer:
      "Charters are booked by the hour with a 2-hour minimum. Recent charters with us have typically come to about $1,000–$1,500 for a 56-passenger motor coach, about $675–$1,400 for a 28- or 40-passenger mini bus, and about $360–$1,300 for an executive Sprinter. Your exact price shows in the booking tool before you book.",
    link: {
      href: "/blog/charter-bus-rental-cost-phoenix",
      label: "Charter bus cost guide",
    },
  },
  {
    id: "sc2",
    question:
      "Can a full-size coach get into Scottsdale resorts and wedding venues?",
    answer:
      "Most Scottsdale resorts have a motor coach loading area, at the front drive or a service entrance. Some North Scottsdale wedding venues and private estates have narrow drives, gates or tight turnarounds, where a mini bus is the better fit. We confirm access with the venue before your date.",
  },
  {
    id: "sc3",
    question: "Do you run group transportation for the WM Phoenix Open?",
    answer:
      "Yes. Tournament week is the busiest week of the year in Scottsdale, so book early. We plan drop-off and pickup around the tournament's traffic plan, and groups often book a shuttle loop between their hotel and the course for several days on one booking.",
    link: {
      href: "/blog/wm-phoenix-open-parking-transportation",
      label: "WM Phoenix Open parking and transportation guide",
    },
  },
  {
    id: "sc4",
    question:
      "Can we charter a bus to spring training at Salt River Fields or Scottsdale Stadium?",
    answer:
      "Yes. Spring training runs from late February through March, and game-day traffic around Salt River Fields and Old Town gets heavy. A charter drops your group near the gate and waits for the final out, so nobody hunts for parking or a ride home.",
  },
  {
    id: "sc5",
    question: "Do you drive groups to Barrett-Jackson at WestWorld?",
    answer:
      "Yes. Barrett-Jackson runs at WestWorld of Scottsdale each January. We run groups from resorts and hotels across the Valley, and for multi-day visits you can book every day as one trip.",
  },
  {
    id: "sc6",
    question: "Can we book a bus for a night out in Old Town Scottsdale?",
    answer:
      "Yes. A mini bus is popular for birthdays, bachelor and bachelorette parties and company nights out. Alcohol is allowed for passengers 21 and over, consumed responsibly, and the bus stays with your group all night.",
  },
  {
    id: "sc7",
    question: "Are you a local Scottsdale company?",
    answer:
      "Yes. Nier Transportation is headquartered in Scottsdale on Via Linda and has served the Valley since 2004. Scottsdale is home, not a service-area checkbox.",
  },
  {
    id: "sc8",
    question: "Can you provide more than one bus?",
    answer:
      "Yes. For conventions, tournaments and big weddings we send as many coaches and mini buses as your group needs, all on one booking with one coordinator and one invoice.",
  },
];
