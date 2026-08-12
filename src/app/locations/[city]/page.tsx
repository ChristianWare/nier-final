import { notFound } from "next/navigation";
import Link from "next/link";
import { serviceAreaCities } from "@/lib/cities";
import type { CityData } from "@/lib/cities";
import { servicesData as services } from "@/lib/services";
import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import AboutTestimonials from "@/components/AboutPage/AboutTestimonials/AboutTestimonials";
import Faq from "@/components/shared/Faq/Faq";
import Button from "@/components/shared/Button/Button";
import LocationCityIntro from "@/components/LocationCityPage/LocationCityIntro/LocationCityIntro";
import LocationCityMission from "@/components/LocationCityPage/LocationCityMission/LocationCityMission";
import LocationCityServicesGrid from "@/components/LocationCityPage/LocationCityServicesGrid/LocationCityServicesGrid";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import styles from "./LocationCityPage.module.css";

type Params = { city: string };

const SITE_URL = "https://www.niertransportation.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const descriptionOverrides: Partial<Record<string, string>> = {
  scottsdale:
    "Scottsdale's trusted black car service since 2004. Airport transfers to PHX & SDL, hourly chauffeur, golf course transportation, corporate rides, and weddings. Flat rates, no surge pricing.",
  phoenix:
    "Phoenix car service trusted since 2004 — black car and airport transfers to Sky Harbor, hourly chauffeur, corporate transport, and events. Flat rates, 24/7.",
  tempe:
    "Black car service in Tempe, AZ — airport transfers to PHX & AZA, hourly chauffeur near ASU and Tempe Marketplace, and corporate rides. Flat rates, no surge pricing.",
  chandler:
    "Black car service in Chandler, AZ — trusted by corporate and tech professionals in the East Valley. Airport transfers, hourly chauffeur, and events. Flat rates, available 24/7.",
  mesa: "Black car service in Mesa, AZ — airport transfers to PHX and Phoenix-Mesa Gateway Airport (AZA), hourly chauffeur, and corporate transportation. Flat rates, no surge pricing.",
  "paradise-valley":
    "Luxury black car service in Paradise Valley, AZ — discreet, professional chauffeurs for resort transfers, airport rides, and private events. Flat rates, available 24/7.",
  glendale:
    "Airport transportation and black car service in Glendale, AZ — Sky Harbor transfers, State Farm Stadium events, hourly chauffeur, and corporate rides. Flat rates, no surge pricing.",
  gilbert:
    "Black car service in Gilbert, AZ — one of the fastest-growing East Valley communities. Airport transfers, hourly chauffeur, corporate rides, and events. Flat rates, no surge pricing.",
  peoria:
    "Black car service in Peoria, AZ — Peoria Sports Complex area transfers, airport rides to PHX, hourly chauffeur, and corporate transportation. Flat rates, available 24/7.",
  "fountain-hills":
    "Black car service in Fountain Hills, AZ — luxury chauffeur service near TPC Scottsdale and Fountain Park. Airport transfers, golf outings, and events. Flat rates, no surge pricing.",
  "cave-creek":
    "Black car service in Cave Creek, AZ — luxury chauffeur service for desert retreats, resort transfers, and airport rides to PHX. Flat rates, no surge pricing.",
  sedona:
    "Black car service from Phoenix to Sedona, AZ — private door-to-door transfers to the red rocks without the drive. Long distance rides, flat rates, no surge pricing.",
  flagstaff:
    "Black car service from Phoenix to Flagstaff, AZ — private transfers near the Grand Canyon and northern Arizona. Long distance rides, flat rates, no surge pricing.",
  tucson:
    "Black car service from Phoenix to Tucson, AZ — private intercity transfers covering 115 miles in comfort. Long distance rides, flat rates, no surge pricing.",
  prescott:
    "Black car service from Phoenix to Prescott, AZ — private transfers to the charming mountain city. Long distance rides, flat rates, no surge pricing.",
};

const titleOverrides: Partial<Record<string, string>> = {
  glendale: "Airport Transportation & Car Service in Glendale, AZ | Nier",
  phoenix: "Phoenix Car Service — Black Car & Airport Transfers | Nier",
};

export function generateStaticParams() {
  return serviceAreaCities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = serviceAreaCities.find((c) => c.slug === citySlug) as
    CityData | undefined;
  if (!city) return {};

  const title =
    titleOverrides[city.slug] ??
    `Black Car Service ${city.name}, AZ | Nier Transportation`;
  const description =
    descriptionOverrides[city.slug] ??
    `Black car service in ${city.name}, AZ — ${city.note.toLowerCase()}. Airport transfers, hourly chauffeur, and corporate rides with flat rates and no surge pricing. Available 24/7.`;
  const canonical = `${SITE_URL}/locations/${city.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "Nier Transportation",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `Nier Transportation — Black Car Service ${city.name}, AZ`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export default async function LocationCityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolvedParams = await params;
  const citySlug = resolvedParams.city;
  const city = serviceAreaCities.find((c) => c.slug === citySlug) as
    CityData | undefined;

  if (!city) notFound();

  const pageUrl = `${SITE_URL}/locations/${city.slug}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Nier Transportation Services in ${city.name}, AZ`,
    description: `Luxury ground transportation services available in ${city.name}, Arizona`,
    url: pageUrl,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: `${service.title} in ${city.name}`,
        description: service.description,
        url: `${SITE_URL}/services/${service.slug}`,
        provider: {
          "@type": "LocalBusiness",
          name: "Nier Transportation",
          url: SITE_URL,
        },
        areaServed: { "@type": "City", name: city.name },
        serviceType: "Ground Transportation",
      },
    })),
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LimousineBusService",
    name: "Nier Transportation",
    url: pageUrl,
    telephone: "+1-480-300-6003",
    email: "info@niertransportation.com",
    logo: `${SITE_URL}/nierLogo.png`,
    image: `${SITE_URL}/nierLogo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "10105 E Via Linda, Ste A-105",
      addressLocality: "Scottsdale",
      addressRegion: "AZ",
      postalCode: "85258",
      addressCountry: "US",
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "State", name: "Arizona" },
    },
    priceRange: "$$",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
    sameAs: ["https://www.instagram.com/niertransportation"],
  };

  const faqJsonLd =
    city.faqs && city.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: city.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      {faqJsonLd && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Nav background='cream' />
      <Breadcrumbs
        items={[{ name: "Locations", href: "/locations" }, { name: city.name }]}
      />
      <LocationCityIntro city={city} />
      <LocationCityMission city={city} />

      {/* City-specific unique content — critical for Google indexing */}
      {(city.localContext || city.airportNote || city.corporateNote) && (
        <section className={styles.cityContext}>
          <LayoutWrapper>
            <div className={styles.cityContextGrid}>
              <div className={styles.cityContextLeft}>
                <h2 className={styles.cityContextHeading}>
                  Black Car Service in {city.name}
                </h2>
                {city.localContext && (
                  <p className={styles.cityContextCopy}>{city.localContext}</p>
                )}
                {city.airportNote && (
                  <p className={styles.cityContextCopy}>{city.airportNote}</p>
                )}
                {city.corporateNote && (
                  <p className={styles.cityContextCopy}>{city.corporateNote}</p>
                )}
                {city.routePromo && (
                  <p className={styles.cityContextCopy}>
                    {city.routePromo.blurb}{" "}
                    <Link
                      href={city.routePromo.href}
                      className={styles.routeLink}
                    >
                      {city.routePromo.anchor}
                    </Link>
                    .
                  </p>
                )}
                <div className={styles.ctaRow}>
                  <Button
                    href='/book'
                    text='Book a ride'
                    btnType='black'
                    arrow
                  />
                  <a href='tel:+14803006003' className={styles.callLink}>
                    Or call (480) 300-6003
                  </a>
                </div>
              </div>
              {city.localLandmarks && city.localLandmarks.length > 0 && (
                <div className={styles.cityContextRight}>
                  <h3 className={styles.landmarksHeading}>
                    Areas & landmarks we serve
                  </h3>
                  <ul className={styles.landmarksList}>
                    {city.localLandmarks.map((landmark) => (
                      <li key={landmark} className={styles.landmarkItem}>
                        {landmark}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </LayoutWrapper>
        </section>
      )}

      <LocationCityServicesGrid city={city} />
      <HowItWorks />

      {city.faqs && city.faqs.length > 0 && (
        <Faq
          items={city.faqs.map((f, i) => ({
            id: i,
            question: f.q,
            answer: f.a,
          }))}
        />
      )}

      <AboutTestimonials />
      <AboutNumbers />
    </main>
  );
}
