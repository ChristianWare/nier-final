import { notFound } from "next/navigation";
import { fleetData } from "@/lib/data";
import { serviceAreaCities } from "@/lib/cities";
import type { Metadata } from "next";
import type { VehicleData } from "@/lib/types/fleet";
import Nav from "@/components/shared/Nav/Nav";
import Button from "@/components/shared/Button/Button";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Faq from "@/components/shared/Faq/Faq";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./FleetCityPage.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

type Params = { slug: string; city: string };

export function generateStaticParams() {
  return fleetData.flatMap((vehicle) =>
    serviceAreaCities.map((city) => ({
      slug: vehicle.slug,
      city: city.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, city: citySlug } = await params;
  const vehicle = fleetData.find((v) => v.slug === slug) as
    | VehicleData
    | undefined;
  const city = serviceAreaCities.find((c) => c.slug === citySlug);
  if (!vehicle || !city) return {};

  return {
    title: `${vehicle.title} Service in ${city.name}, AZ | Nier Transportation`,
    robots: { index: false, follow: true },
    description: `Book a ${vehicle.title} in ${city.name}, Arizona. ${vehicle.shortDesc}`,
    alternates: {
      canonical: `https://www.niertransportation.com/fleet/${vehicle.slug}/${city.slug}`,
    },
  };
}

export default async function FleetCityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, city: citySlug } = await params;
  const vehicle = fleetData.find((v) => v.slug === slug) as
    | VehicleData
    | undefined;
  const city = serviceAreaCities.find((c) => c.slug === citySlug);
  if (!vehicle || !city) notFound();

  const bookHref = `/book?vehicle=${encodeURIComponent(vehicle.slug)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${vehicle.title} — ${city.name}, AZ`,
    description: vehicle.longDesc ?? vehicle.shortDesc,
    vehicleConfiguration: vehicle.class,
    seatingCapacity: vehicle.seats,
    url: `https://www.niertransportation.com/fleet/${vehicle.slug}/${city.slug}`,
    provider: {
      "@type": "LocalBusiness",
      name: "Nier Transportation",
      telephone: "+1-480-300-6003",
    },
    ...(vehicle.rateRules?.hourlyFromUSD && {
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: vehicle.rateRules.hourlyFromUSD,
        unitText: "per hour",
        seller: {
          "@type": "Organization",
          name: "Nier Transportation",
        },
        areaServed: {
          "@type": "City",
          name: city.name,
        },
      },
    }),
    ...(vehicle.faqs &&
      vehicle.faqs.length > 0 && {
        mainEntityOfPage: {
          "@type": "FAQPage",
          mainEntity: vehicle.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.a,
            },
          })),
        },
      }),
  };

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav background='accent' />

      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading
              text={`${vehicle.title} in ${city.name}`}
              color='cream'
            />
            <h1 className={`${styles.heading} h1`}>
              {vehicle.title} Service in {city.name}, AZ
            </h1>
            <p className={styles.lead}>
              {vehicle.heroLine} Serving {city.name}, {city.note}. Available
              24/7 with professional chauffeurs and no surge pricing.
            </p>
            <div className={styles.ctas}>
              <Button
                href={bookHref}
                text='Book this vehicle'
                btnType='black'
                arrow
              />
              <Button
                href={`/fleet/${vehicle.slug}`}
                text='View full details'
                btnType='underlinedWhite'
                arrow
              />
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* Vehicle Details */}
      <section className={styles.overview}>
        <LayoutWrapper>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewLeft}>
              <h2 className='h3'>
                {vehicle.title} in {city.name}
              </h2>
              <p className={styles.desc}>{vehicle.longDesc}</p>
              <div className={styles.specs}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Capacity</span>
                  <span className={styles.specValue}>{vehicle.seats}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Luggage</span>
                  <span className={styles.specValue}>{vehicle.luggage}</span>
                </div>
                {vehicle.rateRules?.hourlyFromUSD && (
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>From</span>
                    <span className={styles.specValue}>
                      ${vehicle.rateRules.hourlyFromUSD}/hr
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.overviewRight}>
              {vehicle.amenities && vehicle.amenities.length > 0 && (
                <div className={styles.amenities}>
                  <h3 className='h5'>Amenities</h3>
                  <ul className={styles.amenitiesList}>
                    {vehicle.amenities.map((a, i) => (
                      <li key={i} className={styles.amenityItem}>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className={styles.bookCard}>
                <p className={styles.bookCardCopy}>{vehicle.shortDesc}</p>
                <Button
                  href={bookHref}
                  text='Book this vehicle'
                  btnType='white'
                  arrow
                />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      <HowItWorks />

      {vehicle.faqs && vehicle.faqs.length > 0 && (
        <Faq
          items={vehicle.faqs.map((f, i) => ({
            id: i,
            question: f.q,
            answer: f.a,
          }))}
        />
      )}

      <AboutTestimonials />
      <Fleet />
      <AboutNumbers />
    </main>
  );
}
