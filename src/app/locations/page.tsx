import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import { serviceAreaCities } from "@/lib/cities";
import { servicesData as services } from "@/lib/services";
import styles from "./LocationsPage.module.css";
import Button from "@/components/shared/Button/Button";
import Image from "next/image";
import HeroImg from "../../../public/images/vehicles/sub.png";

export const metadata: Metadata = {
  title: "Service Areas | Nier Transportation",
  description:
    "The 40 Arizona cities Nier Transportation serves, from Scottsdale and Phoenix to Sedona and Tucson. Pick your city to see local services, airport times and rates.",
  alternates: {
    canonical: "https://www.niertransportation.com/locations",
  },
};

const locationSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Nier Transportation Service Areas",
  description:
    "Cities and communities served by Nier Transportation across Metro Phoenix and Arizona",
  itemListElement: serviceAreaCities.map((city, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "City",
      name: city.name,
      url: `https://www.niertransportation.com/locations/${city.slug}`,
    },
  })),
};

export default function LocationsPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(locationSchema) }}
      />
      <Nav background='cream' />

      {/* Intro */}
      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <div className={styles.left}>
              <SectionHeading text='Service Areas' dot />
              <h1 className={`${styles.heading} h1`}>
                40 Arizona Cities, One Chauffeur Team
              </h1>
              <p className={styles.lead}>
                Our{" "}
                <Link href='/'>
                  black car service in Phoenix &amp; Scottsdale
                </Link>{" "}
                reaches 40 cities across the Valley and greater Arizona, with{" "}
                <Link href='/airports/phx-sky-harbor'>
                  Sky Harbor transfers
                </Link>{" "}
                from every one. Select your city below to see the services,
                airport times and neighborhoods we cover there.
              </p>
            </div>
            <div className={styles.right}>
              <div className={styles.imgContainerMain}>
                <Image
                  src={HeroImg}
                  alt='Nier Transportation chauffeured SUV'
                  title='Nier Transportation chauffeured SUV'
                  fill
                  className={styles.imgMain}
                />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* City Grid */}
      <section className={styles.citiesSection}>
        <LayoutWrapper>
          <div className={styles.citiesGrid}>
            {serviceAreaCities.map((city) => (
              <div key={city.slug} className={styles.cityCard}>
                <div className={styles.cityHeader}>
                  <h2 className={`${styles.cityName} h4 cardTitle`}>
                    {city.name}
                  </h2>
                  <div className={styles.imgContainer}>
                    <Image
                      src={city.src}
                      alt={city.name}
                      title={city.name}
                      fill
                      className={styles.img}
                    />
                  </div>
                  <p className={styles.cityNote}>{city.note}</p>
                </div>
                <ul className={styles.serviceList}>
                  {services.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={`/services/${service.slug}`}
                        className={styles.serviceLink}
                      >
                        {service.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Button
                  href={`/locations/${city.slug}`}
                  text={`View all services in ${city.name} →`}
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
