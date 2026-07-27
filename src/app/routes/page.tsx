import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { routesData } from "@/lib/routes";
import { SITE_URL } from "@/lib/site";
import styles from "./RoutesPage.module.css";

export const metadata: Metadata = {
  title:
    "Popular Routes | Flat-Rate Car Service Across Arizona | Nier Transportation",
  description:
    "Private, flat-rate car service on Arizona's most-traveled routes — Phoenix to Scottsdale, Sedona, Tucson, Flagstaff, and Prescott. Door-to-door, no surge pricing, available 24/7 in both directions.",
  alternates: {
    canonical: `${SITE_URL}/routes`,
  },
};

const routesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Nier Transportation Popular Routes",
  description:
    "Point-to-point private car service routes served by Nier Transportation across Arizona",
  itemListElement: routesData.map((route, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Service",
      name: `${route.origin} to ${route.destination} Car Service`,
      url: `${SITE_URL}/routes/${route.slug}`,
    },
  })),
};

export default function RoutesPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(routesSchema) }}
      />
      <Nav background='cream' />

      {/* Intro */}
      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading text='Popular Routes' dot />
            <h1 className={`${styles.heading} h1`}>
              Flat-Rate Car Service on Arizona&apos;s Busiest Routes
            </h1>
            <p className={styles.lead}>
              Point-to-point private transportation, priced flat and covered in
              both directions — no surge, no meters, no shared stops. Pick your
              route below to see rates, drive times, and what&apos;s included.
            </p>
          </div>
        </LayoutWrapper>
      </section>

      {/* Route Grid */}
      <section className={styles.routesSection}>
        <LayoutWrapper>
          <div className={styles.routesGrid}>
            {routesData.map((route) => (
              <div key={route.slug} className={styles.routeCard}>
                <div className={styles.routeHeader}>
                  <h2 className={`${styles.routeName} h4 cardTitle`}>
                    {route.origin} ↔ {route.destination}
                  </h2>
                  <ul className={styles.metaRow}>
                    <li className={styles.metaItem}>{route.driveTime}</li>
                    <li className={styles.metaItem}>{route.distance}</li>
                    <li className={styles.metaItem}>{route.vehicles}</li>
                  </ul>
                </div>
                <p className={styles.routeCopy}>{route.heroLine}</p>
                <Button
                  href={`/routes/${route.slug}`}
                  text='View route & rates →'
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
