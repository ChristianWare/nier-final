import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import Faq from "@/components/shared/Faq/Faq";
import RelatedLinks from "@/components/shared/RelatedLinks/RelatedLinks";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import { arizonaAirportsDirectory } from "@/lib/arizonaAirports"; 
import { SITE_URL } from "@/lib/site";
import styles from "./PrivateAviation.module.css";

const canonical = `${SITE_URL}/airports/private-aviation`;

export const metadata: Metadata = {
  title: "Private Jet & FBO Car Service in Phoenix & Scottsdale | Nier",
  description:
    "Ground transportation for private aviation across the Phoenix area — FBO lobby and planeside pickups at Scottsdale, Deer Valley, Falcon Field, Chandler, Glendale, and Goodyear airports. Tail-number tracking, crew transport, corporate accounts, flat rates.",
  alternates: { canonical },
  openGraph: {
    title: "Private Jet & FBO Car Service in Phoenix & Scottsdale | Nier",
    description:
      "FBO-side chauffeured car service at all six Phoenix-area reliever airports. Tail-number tracking, planeside pickups, crew transport, flat rates.",
    url: canonical,
    type: "website",
    siteName: "Nier Transportation",
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
};

const PHOENIX_RELIEVERS = ["SDL", "DVT", "FFZ", "CHD", "GEU", "GYR"] as const;

const fboDetails: Partial<Record<string, string>> = {
  SDL: "FBOs include Signature Aviation and Jet Aviation; JSX also flies from its own private terminal.",
  DVT: "Cutter Aviation is the FBO — we stage in the lobby or planeside.",
  FFZ: "Corporate aircraft alongside a major flight academy and Boeing's Mesa facility.",
  CHD: "Minutes from the Price Road tech corridor — a frequent corporate landing point.",
  GEU: "Around 200 based aircraft; ten minutes from State Farm Stadium and Westgate.",
  GYR: "A long I-10 corridor runway used by business jets and airline training flights.",
};

const airports = PHOENIX_RELIEVERS.map((code) =>
  arizonaAirportsDirectory.find((a) => a.faa === code)!,
);

const faqs = [
  {
    q: "Do you pick up at the FBO or at a terminal?",
    a: "At the FBO. Reliever airports have no airline terminal — your chauffeur waits inside the FBO lobby with your name, or meets you planeside on the ramp where the FBO permits it. Just tell us the airport, the FBO, and your tail number.",
  },
  {
    q: "Can you track a private flight?",
    a: "Yes. We track aircraft by tail number the same way we track commercial flights, so your pickup adjusts to your actual arrival — an early landing or a weather hold never leaves anyone waiting.",
  },
  {
    q: "Do you handle flight crew transportation?",
    a: "Daily — crew runs between the FBO, hotels, and Sky Harbor, booked under a corporate account with one monthly invoice. Charter operators and flight departments are among our longest-standing clients.",
  },
  {
    q: "Can a charter broker or executive assistant book on behalf of the passenger?",
    a: "Most private-aviation rides are booked by a third party. Open a corporate account for portal booking and invoicing, or call (480) 300-6003 and dispatch will set it up immediately.",
  },
  {
    q: "Which vehicles are available for FBO pickups?",
    a: "Executive sedans, black SUVs, and Sprinter vans for larger parties and crews with luggage. Tell us the headcount and bag count and we match the vehicle to the aircraft's manifest.",
  },
  {
    q: "Do you also serve the FBOs at Sky Harbor?",
    a: "Yes — Sky Harbor's general-aviation side, including Cutter Aviation at PHX, is covered the same way: FBO pickup, tail-number tracking, flat rate. Private aviation at Phoenix's main airport is just another FBO to us.",
  },
];

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Private Aviation & FBO Car Service",
  description: metadata.description,
  serviceType: "Private Aviation Ground Transportation",
  url: canonical,
  areaServed: airports.map((a) => ({
    "@type": "Airport",
    name: a.name,
    ...(a.iata && { iataCode: a.iata }),
  })),
  provider: {
    "@type": "LocalBusiness",
    name: "Nier Transportation",
    telephone: "+1-480-300-6003",
    url: SITE_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "10105 E Via Linda, Ste A-105",
      addressLocality: "Scottsdale",
      addressRegion: "AZ",
      postalCode: "85258",
      addressCountry: "US",
    },
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const relatedLinks = [
  { label: "Deer Valley Airport car service", href: "/airports/deer-valley" },
  {
    label: "Scottsdale Airport car service",
    href: "/airports/scottsdale-airport",
  },
  {
    label: "PHX Sky Harbor airport car service",
    href: "/airports/phx-sky-harbor",
  },
  { label: "Corporate accounts", href: "/corporate-accounts" },
  { label: "All Arizona airports →", href: "/airports" },
];

export default function PrivateAviationPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='cream' />
      <Breadcrumbs
        items={[
          { name: "Airports", href: "/airports" },
          { name: "Private Aviation" },
        ]}
      />

      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading text='Private Aviation · FBO Pickups' dot />
            <h1 className={`${styles.heading} h1`}>
              Private Jet & FBO Car Service in Phoenix & Scottsdale
            </h1>
            <p className={styles.lead}>
              Six reliever airports ring the Phoenix metro, and none of them
              have a curb to wait at. We meet private flights where they
              actually arrive — inside the FBO or on the ramp — with the
              aircraft tracked by tail number, luggage loaded from the plane,
              and a flat rate to wherever the trip is really going.
            </p>
            <div className={styles.ctas}>
              <Button
                href='/book'
                text='Book an FBO pickup'
                btnType='black'
                arrow
              />
              <a href='tel:+14803006003' className={styles.callLink}>
                Or call dispatch: (480) 300-6003
              </a>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      <section className={styles.howSection}>
        <LayoutWrapper>
          <div className={styles.howGrid}>
            <div className={styles.howLeft}>
              <h2 className={`${styles.howHeading} h3`}>
                How an FBO pickup works
              </h2>
              <p className={styles.howCopy}>
                Private aviation runs on your schedule, not a published one, so
                the ground half has to be built the same way.
              </p>
            </div>
            <ul className={styles.howList}>
              <li className={styles.howItem}>
                <strong>Tail number, not flight number.</strong> Send it when
                you book and we track the aircraft from wheels-up — an early
                landing or a weather hold moves your pickup automatically.
              </li>
              <li className={styles.howItem}>
                <strong>Lobby or planeside.</strong> Your chauffeur waits inside
                the FBO with your name, or on the ramp where the FBO permits it.
                No signs unless you want one.
              </li>
              <li className={styles.howItem}>
                <strong>Luggage from the aircraft.</strong> Bags go from the
                hold to the vehicle. Golf clubs, cases, and crew gear included.
              </li>
              <li className={styles.howItem}>
                <strong>Crew and passengers, one account.</strong> Flight crews
                to hotels, passengers to the resort, the return leg tomorrow —
                all under one corporate account and one invoice.
              </li>
              <li className={styles.howItem}>
                <strong>Flat rates, any hour.</strong> No surge, no meter. A 2am
                arrival costs what a 2pm arrival costs.
              </li>
            </ul>
          </div>
        </LayoutWrapper>
      </section>

      <section className={styles.airportsSection}>
        <LayoutWrapper>
          <div className={styles.sectionHead}>
            <SectionHeading text='Reliever Airports' dot />
            <h2 className={`${styles.sectionHeading} h3`}>
              The six Phoenix-area airports we cover
            </h2>
          </div>
          <div className={styles.airportGrid}>
            {airports.map((a) => (
              <div key={a.faa} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.badge}>{a.iata ?? a.faa}</span>
                  <span className={styles.cardCity}>{a.city}</span>
                </div>
                <h3 className={styles.cardName}>
                  {a.href && a.href !== "/airports/private-aviation" ? (
                    <Link href={a.href} className={styles.cardLink}>
                      {a.name}
                    </Link>
                  ) : (
                    a.name
                  )}
                </h3>
                <p className={styles.cardCopy}>{fboDetails[a.faa]}</p>
                {a.driveFromPhoenix && (
                  <p className={styles.cardMeta}>Drive: {a.driveFromPhoenix}</p>
                )}
              </div>
            ))}
          </div>
          <p className={styles.gaNote}>
            Sky Harbor's general-aviation side — including Cutter Aviation at
            PHX — is covered the same way. See the{" "}
            <Link href='/airports/phx-sky-harbor' className={styles.inlineLink}>
              Sky Harbor page
            </Link>{" "}
            for terminal pickups.
          </p>
        </LayoutWrapper>
      </section>

      <section className={styles.whoSection}>
        <LayoutWrapper>
          <div className={styles.whoGrid}>
            <div className={styles.whoCard}>
              <h3 className={styles.whoTitle}>Corporate flight departments</h3>
              <p className={styles.whoCopy}>
                Executives from the ramp to the meeting, on account, with the
                same chauffeur team every trip.
              </p>
            </div>
            <div className={styles.whoCard}>
              <h3 className={styles.whoTitle}>Charter operators & brokers</h3>
              <p className={styles.whoCopy}>
                Book on behalf of your passengers through a corporate portal —
                dispatch-to-dispatch coordination, one monthly invoice.
              </p>
            </div>
            <div className={styles.whoCard}>
              <h3 className={styles.whoTitle}>Flight crews</h3>
              <p className={styles.whoCopy}>
                FBO-to-hotel runs, positioning between airports, and early show
                times handled like clockwork.
              </p>
            </div>
            <div className={styles.whoCard}>
              <h3 className={styles.whoTitle}>Aircraft owners</h3>
              <p className={styles.whoCopy}>
                The car is waiting when you land at your home field, every time,
                without a phone call from the ramp.
              </p>
            </div>
          </div>
          <div className={styles.whoCta}>
            <Button
              href='/corporate-accounts'
              text='Open a corporate account'
              btnType='black'
              arrow
            />
          </div>
        </LayoutWrapper>
      </section>

      <HowItWorks />

      <Faq
        items={faqs.map((f, i) => ({ id: i, question: f.q, answer: f.a }))}
        limit={faqs.length}
      />

      <RelatedLinks title='Related airports' links={relatedLinks} />

      <AboutTestimonials />
      <AboutNumbers />
    </main>
  );
}
