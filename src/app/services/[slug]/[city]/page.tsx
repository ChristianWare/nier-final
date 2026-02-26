import styles from "./ServiceCityPage.module.css";
import { notFound } from "next/navigation";
import { servicesData as services } from "@/lib/services";
import { serviceAreaCities } from "@/lib/cities";
import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Faq from "@/components/shared/Faq/Faq";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import ServiceCityFleet from "@/components/ServiceCityPage/ServiceCityFleet/ServiceCityFleet";
import ServiceCityPricing from "@/components/ServiceCityPage/ServiceCityPricing/ServiceCityPricing";
import ServiceCityCTA from "@/components/ServiceCityPage/ServiceCityCTA/ServiceCityCTA";
import ServiceCityNearby from "@/components/ServiceCityPage/ServiceCityNearby/ServiceCityNearby";
import Logo from "@/components/shared/Logo/Logo";

type Params = { slug: string; city: string };

export function generateStaticParams() {
  return services.flatMap((service) =>
    serviceAreaCities.map((city) => ({
      slug: service.slug,
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
  const service = services.find((s) => s.slug === slug);
  const city = serviceAreaCities.find((c) => c.slug === citySlug);
  if (!service || !city) return {};

  return {
    title: `${service.title} in ${city.name} | Nier Transportation`,
    description: `Professional ${service.title.toLowerCase()} in ${city.name}, Arizona. ${service.copy}`,
    alternates: {
      canonical: `https://www.niertransportation.com/services/${service.slug}/${city.slug}`,
    },
  };
}

export default async function ServiceCityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, city: citySlug } = await params;
  const service = services.find((s) => s.slug === slug);
  const city = serviceAreaCities.find((c) => c.slug === citySlug);
  if (!service || !city) notFound();

  const bookHref = `/book?service=${encodeURIComponent(service.slug)}`;

  const nearbyCities = serviceAreaCities
    .filter((c) => c.slug !== city.slug)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.title} in ${city.name}, AZ`,
    description: service.description,
    url: `https://www.niertransportation.com/services/${service.slug}/${city.slug}`,
    serviceType: "Ground Transportation",
    provider: {
      "@type": "LocalBusiness",
      name: "Nier Transportation",
      url: "https://www.niertransportation.com",
      telephone: "+1-480-300-6003",
      address: {
        "@type": "PostalAddress",
        streetAddress: "10105 E Via Linda, Ste A-105",
        addressLocality: "Scottsdale",
        addressRegion: "AZ",
        postalCode: "85258",
        addressCountry: "US",
      },
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "State",
        name: "Arizona",
      },
    },
  };

  const faqJsonLd =
    service.faqs && service.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: service.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.a,
            },
          })),
        }
      : null;

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Nav background='cream' />

      {/* Hero / Intro */}
      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading
              text={`Nier Transportation · ${city.name}, AZ`}
              dot
            />
            <h1 className={`${styles.heading} underline`}>
              {service.title} in {city.name}, AZ
            </h1>
            <p className={styles.lead}>
              Professional {service.title.toLowerCase()} serving {city.name},{" "}
              {city.note}. Available 24/7 with no surge pricing.
            </p>
            <div className={styles.btnContainer}>
              <Button
                href={bookHref}
                text='Book your ride'
                btnType='black'
                arrow
              />
              <Button
                href={`/services/${service.slug}`}
                text='Learn more'
                btnType='underlinedBlack'
                arrow
              />
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* Service Description */}
      <section className={styles.overview}>
        <LayoutWrapper>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewLeft}>
              <h2 className='h3'>
                {service.title} for {city.name} Residents & Visitors
              </h2>
              <p className={styles.desc}>{service.description}</p>
              <p className={styles.cityNote}>
                Whether you&apos;re heading to Sky Harbor, hosting a corporate
                event, or need a reliable ride across {city.name}, our
                professional chauffeurs are available around the clock. All
                vehicles are fully licensed, insured, and maintained to the
                highest standards.
              </p>
            </div>
            <div className={styles.overviewRight}>
              {service.features && service.features.length > 0 && (
                <div className={styles.features}>
                  <h3 className='h4 underline'>What&apos;s included</h3>
                  {service.features.map((feature) => (
                    <div
                      className={styles.featureItem}
                      key={String(feature.id)}
                    >
                      <div className={styles.featureTitle}>
                        <Logo className={styles.logo} />
                        {feature.title}
                      </div>
                      <p className={styles.featureDesc}>{feature.details}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.bookCard}>
                <p className={styles.bookCardCopy}>{service.copy}</p>
                <Button
                  href={bookHref}
                  text='Book your ride'
                  btnType='white'
                  arrow
                />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* Pricing */}
      <ServiceCityPricing service={service} city={city} />

      {/* Fleet */}
      <ServiceCityFleet city={city} />

      <HowItWorks />

      {/* FAQ */}
      {service.faqs && service.faqs.length > 0 && (
        <Faq
          items={service.faqs.map((f, i) => ({
            id: i,
            question: f.q,
            answer: f.a,
          }))}
        />
      )}

      {/* CTA */}
      <ServiceCityCTA service={service} city={city} />

      <AboutTestimonials />

      {/* Nearby Cities */}
      <ServiceCityNearby
        service={service}
        city={city}
        nearbyCities={nearbyCities}
      />

      <AboutNumbers />
    </main>
  );
}
