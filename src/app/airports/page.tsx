import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { airportsData } from "@/lib/airports";
import { SITE_URL } from "@/lib/site";
import styles from "./AirportsPage.module.css";

export const metadata: Metadata = {
  title:
    "Airport Car Service | Sky Harbor, Mesa Gateway & Scottsdale | Nier Transportation",
  description:
    "Flight-tracked, flat-rate airport car service across all three Valley airports — Phoenix Sky Harbor (PHX), Mesa Gateway (AZA), and Scottsdale Airport (SDL). Meet & greet, curbside, and FBO pickups, available 24/7.",
  alternates: {
    canonical: `${SITE_URL}/airports`,
  },
};

const airportsSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Nier Transportation Airport Services",
  description:
    "Airports served by Nier Transportation with private car service across Metro Phoenix",
  itemListElement: airportsData.map((airport, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Service",
      name: `${airport.shortName} Airport Car Service`,
      url: `${SITE_URL}/airports/${airport.slug}`,
    },
  })),
};

export default function AirportsPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(airportsSchema) }}
      />
      <Nav background='cream' />

      {/* Intro */}
      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading text='Airport Transfers' dot />
            <h1 className={`${styles.heading} h1`}>
              Every Valley Airport, One Car Service
            </h1>
            <p className={styles.lead}>
              Sky Harbor, Mesa Gateway, and Scottsdale Airport — flight-tracked
              pickups, flat rates locked at booking, and chauffeurs who know
              every terminal, curb, and FBO. Pick your airport below for pickup
              details, rates, and answers.
            </p>
          </div>
        </LayoutWrapper>
      </section>

      {/* Airport Grid */}
      <section className={styles.airportsSection}>
        <LayoutWrapper>
          <div className={styles.airportsGrid}>
            {airportsData.map((airport) => (
              <div key={airport.slug} className={styles.airportCard}>
                <div className={styles.airportHeader}>
                  <h2 className={`${styles.airportName} h4 cardTitle`}>
                    {airport.shortName}
                  </h2>
                  <ul className={styles.metaRow}>
                    <li className={styles.metaItem}>{airport.code}</li>
                    <li className={styles.metaItem}>{airport.terminals}</li>
                    <li className={styles.metaItem}>{airport.driveTime}</li>
                  </ul>
                </div>
                <p className={styles.airportCopy}>{airport.heroLine}</p>
                <Button
                  href={`/airports/${airport.slug}`}
                  text='Pickup details & rates →'
                  btnType='black'
                  arrow
                />
              </div>
            ))}
          </div>
        </LayoutWrapper>
      </section>

      <AboutNumbers />
    </main>
  );
}
