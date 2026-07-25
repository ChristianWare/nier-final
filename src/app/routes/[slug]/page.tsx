// src/app/routes/[slug]/page.tsx  (server component)
//
// SETUP: this template reuses the FleetCityPage class names. Copy
// src/app/fleet/[slug]/[city]/FleetCityPage.module.css to
// src/app/routes/[slug]/RoutePage.module.css — every class used below
// already exists in that file.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routesData } from "@/lib/routes";
import Nav from "@/components/shared/Nav/Nav";
import Button from "@/components/shared/Button/Button";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Faq from "@/components/shared/Faq/Faq";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import styles from "./RoutePage.module.css";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";

type Params = { slug: string };

const SITE_URL = "https://www.niertransportation.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export function generateStaticParams() {
  return routesData.map((r) => ({ slug: r.slug }));
}

/* ——— metadata ——— */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const route = routesData.find((r) => r.slug === slug);
  if (!route) return { title: "Route Not Found" };

  const canonical = `${SITE_URL}/routes/${route.slug}`;

  return {
    title: route.metaTitle,
    description: route.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: route.metaTitle,
      description: route.metaDescription,
      url: canonical,
      type: "website",
      siteName: "Nier Transportation",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `Nier Transportation — ${route.origin} to ${route.destination} Car Service`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: route.metaTitle,
      description: route.metaDescription,
      images: [OG_IMAGE],
    },
  };
}

/* ——— page component ——— */
export default async function RoutePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const route = routesData.find((r) => r.slug === slug);

  if (!route) notFound();

  const canonical = `${SITE_URL}/routes/${route.slug}`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${route.origin} to ${route.destination} Car Service`,
    description: route.metaDescription,
    serviceType: "Ground Transportation",
    url: canonical,
    areaServed: [
      { "@type": "City", name: route.origin },
      { "@type": "City", name: route.destination },
    ],
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: route.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Nav background='accent' />
      <Breadcrumbs
        items={[
          { name: "Routes", href: "/routes" },
          { name: `${route.origin} to ${route.destination}` },
        ]}
      />

      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading
              text={`${route.origin} to ${route.destination}`}
              color='cream'
            />
            <h1 className={`${styles.heading} h1`}>
              {route.origin} to {route.destination} Car Service
            </h1>
            <p className={styles.lead}>{route.heroLine}</p>
            <div className={styles.ctas}>
              <Button
                href='/book'
                text='Book this route'
                btnType='black'
                arrow
              />
              <Button
                href='/contact'
                text='Get an instant quote'
                btnType='underlinedWhite'
                arrow
              />
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* Route details */}
      <section className={styles.overview}>
        <LayoutWrapper>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewLeft}>
              <h2 className='h3'>
                Private Car Service Between {route.origin} and{" "}
                {route.destination}
              </h2>
              {route.overview.map((paragraph, i) => (
                <p key={i} className={styles.desc}>
                  {paragraph}
                </p>
              ))}
              <div className={styles.specs}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Distance</span>
                  <span className={styles.specValue}>{route.distance}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Drive Time</span>
                  <span className={styles.specValue}>{route.driveTime}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Vehicles</span>
                  <span className={styles.specValue}>{route.vehicles}</span>
                </div>
              </div>
            </div>
            <div className={styles.overviewRight}>
              <div className={styles.amenities}>
                <h3 className='h5'>Why ride private</h3>
                <ul className={styles.amenitiesList}>
                  {route.whyPrivate.map((point, i) => (
                    <li key={i} className={styles.amenityItem}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.bookCard}>
                <p className={styles.bookCardCopy}>{route.bookCardCopy}</p>
                <Button
                  href='/book'
                  text='Book this route'
                  btnType='white'
                  arrow
                />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>

      <HowItWorks />

      <Faq
        items={route.faqs.map((f, i) => ({
          id: i,
          question: f.q,
          answer: f.a,
        }))}
      />

      <AboutTestimonials />
      <AboutNumbers />
    </main>
  );
}
