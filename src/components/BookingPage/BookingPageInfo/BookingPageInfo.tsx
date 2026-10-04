// The readable part of the booking page, below the booking tool, laid out
// like the About page's Story section: how booking works (three cards with
// photos), what every ride includes, popular rides, then the FAQ (also
// published as FAQ structured data for search results).

import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Faq from "@/components/shared/Faq/Faq";
import QuoteImg from "../../../../public/images/other/point.jpg";
import ConfirmImg from "../../../../public/images/other/airport2.jpg";
import RideImg from "../../../../public/images/other/chauffeur.jpg";
import styles from "./BookingPageInfo.module.css";

const STEPS = [
  {
    title: "Get your quote",
    copy: "Choose your service, pickup time, route and vehicle. Your flat-rate price shows before you send anything.",
    src: QuoteImg,
    alt: "Planning a route on a map",
  },
  {
    title: "We confirm",
    copy: "A dispatcher reviews your request, confirms your ride and emails you a secure payment link.",
    src: ConfirmImg,
    alt: "A chauffeur holding the car door open",
  },
  {
    title: "Ride",
    copy: "Your chauffeur arrives on time. Airport pickups are tracked against your flight, so delays are handled for you.",
    src: RideImg,
    alt: "A passenger relaxing in the back seat",
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

function Intro() {
  return (
    <>
      <SectionHeading text='Booking With Nier' dot />
      <p className={`${styles.headingMain} h6`}>
        Book a sedan, SUV or Sprinter in a couple of minutes. You see your
        flat-rate price before you send anything, and a real dispatcher confirms
        every ride.
      </p>
    </>
  );
}

function Label({ text }: { text: string }) {
  return (
    <div className={styles.label}>
      <SectionHeading text={text} dot />
    </div>
  );
}

export default function BookingPageInfo() {
  return (
    <>
      <section className={styles.container} aria-label='How booking works'>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <LayoutWrapper>
          <div className={styles.top}>
            <div className={styles.left}>
              <Intro />
            </div>
            <div className={styles.right}>
              <h2 className={styles.heading}>
                One flat price, a real dispatcher, and a chauffeur who&apos;s
                already watching your flight.
              </h2>
              <p className={styles.copy}>
                From early airport runs to wedding days, every booking gets the
                same care: a price you see up front, a person who confirms the
                details, and a professional chauffeur on time, anywhere in
                Phoenix, Scottsdale and the Valley.
              </p>
              <div className={styles.leftii}>
                <Intro />
              </div>

              <div className={styles.block}>
                <Label text='How booking works' />
                <ol className={styles.bottom}>
                  {STEPS.map((s, i) => (
                    <li key={s.title} className={styles.card}>
                      <div>
                        <h3 className={`${styles.title} cardTitle bgWhite h5`}>
                          <span className={styles.stepNum}>{i + 1}</span>
                          {s.title}
                        </h3>
                        <p className={styles.desc}>{s.copy}</p>
                      </div>
                      <div className={styles.imgContainer}>
                        <Image
                          src={s.src}
                          alt={s.alt}
                          fill
                          sizes='(max-width: 568px) 100vw, (max-width: 1268px) 50vw, 30vw'
                          className={styles.img}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className={styles.block}>
                <Label text='Every ride includes' />
                <ul className={styles.included}>
                  {INCLUDED.map((x) => (
                    <li key={x} className={styles.includedItem}>
                      <svg
                        className={styles.check}
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.5'
                        aria-hidden='true'
                      >
                        <path d='M5 12.5l4.5 4.5L19 7.5' />
                      </svg>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.block}>
                <Label text='Popular rides' />
                <ul className={styles.chips}>
                  {POPULAR.map((p) => (
                    <li key={p.href}>
                      <Link href={p.href} className={styles.chip}>
                        {p.label}
                        <span aria-hidden='true'>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>
      <Faq items={BOOKING_FAQS} limit={BOOKING_FAQS.length} />
    </>
  );
}
