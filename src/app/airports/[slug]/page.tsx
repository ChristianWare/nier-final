import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { airportsData } from "@/lib/airports";
import Nav from "@/components/shared/Nav/Nav";
import Button from "@/components/shared/Button/Button";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Faq from "@/components/shared/Faq/Faq";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import styles from "./AirportPage.module.css";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import { SITE_URL } from "@/lib/site";

type Params = { slug: string };

const OG_IMAGE = `${SITE_URL}/og-image.png`;

export function generateStaticParams() {
  return airportsData.map((a) => ({ slug: a.slug }));
}

/* ——— metadata ——— */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const airport = airportsData.find((a) => a.slug === slug);
  if (!airport) return { title: "Airport Not Found" };

  const canonical = `${SITE_URL}/airports/${airport.slug}`;

  return {
    title: airport.metaTitle,
    description: airport.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: airport.metaTitle,
      description: airport.metaDescription,
      url: canonical,
      type: "website",
      siteName: "Nier Transportation",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `Nier Transportation — ${airport.shortName} Airport Car Service`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: airport.metaTitle,
      description: airport.metaDescription,
      images: [OG_IMAGE],
    },
  };
}

/* ——— page component ——— */
export default async function AirportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const airport = airportsData.find((a) => a.slug === slug);

  if (!airport) notFound();

  const canonical = `${SITE_URL}/airports/${airport.slug}`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${airport.shortName} Airport Car Service`,
    description: airport.metaDescription,
    serviceType: "Airport Ground Transportation",
    url: canonical,
    areaServed: [
      {
        "@type": "Airport",
        name: airport.name,
        iataCode: airport.code,
      },
      { "@type": "City", name: "Phoenix" },
      { "@type": "City", name: "Scottsdale" },
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
    mainEntity: airport.faqs.map((f) => ({
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
          { name: "Airports", href: "/airports" },
          { name: airport.shortName },
        ]}
      />

      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading
              text={`${airport.code} · ${airport.shortName}`}
              color='cream'
            />
            <h1 className={`${styles.heading} h1`}>{airport.h1}</h1>
            <p className={styles.lead}>{airport.heroLine}</p>
            <div className={styles.ctas}>
              <Button
                href='/book'
                text='Book airport transfer'
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

      {/* Airport details */}
      <section className={styles.overview}>
        <LayoutWrapper>
          <div className={styles.overviewGrid}>
            <div className={styles.overviewLeft}>
              <h2 className='h3'>Private Car Service at {airport.name}</h2>
              {airport.overview.map((paragraph, i) => (
                <p key={i} className={styles.desc}>
                  {paragraph}
                </p>
              ))}
              <div className={styles.specs}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Airport Code</span>
                  <span className={styles.specValue}>{airport.code}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Terminals</span>
                  <span className={styles.specValue}>{airport.terminals}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Drive Time</span>
                  <span className={styles.specValue}>{airport.driveTime}</span>
                </div>
              </div>
            </div>
            <div className={styles.overviewRight}>
              <div className={styles.amenities}>
                <h3 className='h5'>How pickup works</h3>
                <ul className={styles.amenitiesList}>
                  {airport.pickupHighlights.map((point, i) => (
                    <li key={i} className={styles.amenityItem}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.bookCard}>
                <p className={styles.bookCardCopy}>{airport.bookCardCopy}</p>
                <Button
                  href='/book'
                  text='Book airport transfer'
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
        items={airport.faqs.map((f, i) => ({
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
