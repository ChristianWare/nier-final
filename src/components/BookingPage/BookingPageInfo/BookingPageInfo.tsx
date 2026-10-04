// The readable part of the booking page, below the booking tool: how
// booking works, what every ride includes, popular rides, and an FAQ (also
// published as FAQ structured data for search results).

import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Faq from "@/components/shared/Faq/Faq";
import styles from "./BookingPageInfo.module.css";

const STEPS = [
  {
    title: "Get your quote",
    copy: "Choose your service, pickup time, route and vehicle. Your flat-rate price shows before you send anything.",
  },
  {
    title: "We confirm",
    copy: "A dispatcher reviews your request, confirms your ride and emails you a secure payment link.",
  },
  {
    title: "Ride",
    copy: "Your chauffeur arrives on time. Airport pickups are tracked against your flight, so delays are handled for you.",
  },
];

const INCLUDED = [
  "A flat rate quoted up front, with no surge pricing",
  "A professional, vetted chauffeur",
  "Flight tracking on every airport ride",
  "Sedans, SUVs, Sprinters, a stretch limousine and party buses",
  "Service 24/7 across Phoenix, Scottsdale and the Valley",
];

const POPULAR = [
  {
    href: "/airports/phx-sky-harbor",
    label: "Black car service to Phoenix Sky Harbor",
  },
  { href: "/locations/scottsdale", label: "Scottsdale car service" },
  {
    href: "/services/limo-service",
    label: "Limo service in Phoenix & Scottsdale",
  },
  { href: "/services/hourly-chauffeur", label: "Hourly chauffeur service" },
  { href: "/services/weddings", label: "Wedding transportation" },
  { href: "/routes/phoenix-to-sedona", label: "Phoenix to Sedona car service" },
];

export const BOOKING_FAQS = [
  {
    id: "price",
    question: "How is my price calculated?",
    answer:
      "Your quote is a flat rate based on the service, vehicle, distance and time you choose, and you see the full price before you send your request. There's no surge pricing.",
  },
  {
    id: "pay",
    question: "When do I pay?",
    answer:
      "After a dispatcher confirms your ride, we email you a secure link to pay by card.",
  },
  {
    id: "delay",
    question: "What happens if my flight is delayed?",
    answer:
      "Nothing you need to manage. We track the flight, not the clock, and your chauffeur's arrival adjusts to the actual landing time at no extra charge.",
  },
  {
    id: "advance",
    question: "How far in advance should I book?",
    answer:
      "We recommend 24 hours for standard rides and 48 hours or more for event nights and holiday weekends. We take last-minute bookings whenever a vehicle is available, so call (480) 300-6003 to check.",
  },
  {
    id: "gratuity",
    question: "Is gratuity included?",
    answer:
      "Gratuity is optional and can be added at checkout or after the ride.",
  },
  {
    id: "area",
    question: "Where do you pick up?",
    answer:
      "Anywhere in Phoenix, Scottsdale and the rest of the Valley, including Sky Harbor, Scottsdale Airport and Mesa Gateway, plus long-distance rides to Sedona, Flagstaff and Tucson.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: BOOKING_FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function BookingPageInfo() {
  return (
    <section className={styles.container} aria-labelledby='how-booking-works'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <LayoutWrapper>
        <div className={styles.grid}>
          <div>
            <h2 id='how-booking-works' className={`${styles.heading} h3`}>
              How booking works
            </h2>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s.title} className={styles.step}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <div>
                    <div className={styles.stepTitle}>{s.title}</div>
                    <p className={styles.copy}>{s.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className={`${styles.heading} h3`}>Every ride includes</h2>
            <ul className={styles.included}>
              {INCLUDED.map((x) => (
                <li key={x} className={styles.copy}>
                  {x}
                </li>
              ))}
            </ul>
            <h2 className={`${styles.heading} h3`}>Popular rides</h2>
            <ul className={styles.links}>
              {POPULAR.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className={styles.link}>
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </LayoutWrapper>
      <Faq items={BOOKING_FAQS} limit={BOOKING_FAQS.length} />
    </section>
  );
}
