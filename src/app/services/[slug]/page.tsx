// app/services/[slug]/page.tsx  (server component)

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { servicesData } from "@/lib/services";
import { routesData } from "@/lib/routes";
import ServiceDetailsClient from "./components/ServiceDetailsClient/ServiceDetailsClient";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import promoStyles from "./PopularRoutes.module.css";

type Params = { slug: string };

const SITE_URL = "https://www.niertransportation.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

/* Airport runs vs. intercity runs — used to route each set of links to
   the service page where they're thematically relevant. */
const airportRoutes = routesData.filter((r) => r.destination === "Sky Harbor");
const intercityRoutes = routesData.filter(
  (r) => r.destination !== "Sky Harbor",
);

/* Per-service overrides for search-targeted titles/descriptions.
   Default pattern still applies to any slug not listed here. */
const titleOverrides: Partial<Record<string, string>> = {
  "airport-transfers":
    "Black Car Service to Phoenix Sky Harbor Airport | Nier Transportation",
  "group-transportation": "Group Transportation Phoenix | Nier Transportation",
  "black-truck-service": "Black Truck Service Phoenix | Nier Transportation",
};

const descriptionOverrides: Partial<Record<string, string>> = {
  "airport-transfers":
    "Flat-rate airport black car service to PHX Sky Harbor, Scottsdale (SDL) & Mesa Gateway (AZA). Real-time flight tracking, 60-minute grace period, and meet & greet. Book in minutes.",
  "group-transportation":
    "Group transportation in Phoenix — executive sprinters, mini party buses & full-size motorcoaches. One coordinator, one invoice, no surge pricing. Corporate, weddings & events.",
  "black-truck-service":
    "Black truck service in Phoenix — chauffeured Cadillac Escalade ESV & luxury black SUVs. Flat rates, airport transfers, events & corporate. The blacked-out SUV, driven for you.",
};

export function generateStaticParams() {
  return servicesData.map((s) => ({ slug: s.slug }));
}

/* ——— metadata ——— */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const svc = servicesData.find((s) => s.slug === slug);
  if (!svc) return { title: "Service Not Found" };

  const title =
    titleOverrides[svc.slug] ??
    `${svc.title} | Luxury Black Car Service Phoenix`;
  const description =
    descriptionOverrides[svc.slug] ??
    svc.description ??
    svc.marketingCopy ??
    svc.copy ??
    "";
  const canonical = `${SITE_URL}/services/${svc.slug}`;

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
          alt: `Nier Transportation — ${svc.title}`,
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

/* ——— page component ——— */
export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const svc = servicesData.find((s) => s.slug === slug);

  if (!svc) notFound();

  const canonical = `${SITE_URL}/services/${svc.slug}`;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: svc.title,
    description: svc.description ?? svc.marketingCopy ?? svc.copy,
    serviceType: "Ground Transportation",
    url: canonical,
    areaServed: {
      "@type": "State",
      name: "Arizona",
    },
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

  const faqJsonLd =
    svc.faqs && svc.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: svc.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      {faqJsonLd && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <ServiceDetailsClient service={svc} />

      {svc.slug === "airport-transfers" && (
        <section className={promoStyles.section}>
          <LayoutWrapper>
            <h2 className={`${promoStyles.heading} h3`}>
              Airport Routes &amp; Terminals
            </h2>
            <p className={promoStyles.copy}>
              Every Valley airport, covered — terminal-by-terminal pickup guides
              and flat-rate routes from the cities we serve most.
            </p>
            <ul className={promoStyles.list}>
              <li className={promoStyles.item}>
                <Link
                  href='/airports/phx-sky-harbor'
                  className={promoStyles.link}
                >
                  PHX Sky Harbor airport car service
                </Link>
              </li>
              <li className={promoStyles.item}>
                <Link
                  href='/airports/mesa-gateway'
                  className={promoStyles.link}
                >
                  Mesa Gateway (AZA) airport car service
                </Link>
              </li>
              <li className={promoStyles.item}>
                <Link
                  href='/airports/scottsdale-airport'
                  className={promoStyles.link}
                >
                  Scottsdale Airport (SDL) car service
                </Link>
              </li>
              {airportRoutes.map((route) => (
                <li key={route.slug} className={promoStyles.item}>
                  <Link
                    href={`/routes/${route.slug}`}
                    className={promoStyles.link}
                  >
                    {route.origin} to {route.destination} car service
                  </Link>
                </li>
              ))}
              <li className={promoStyles.item}>
                <Link href='/airports' className={promoStyles.link}>
                  View all airports →
                </Link>
              </li>
            </ul>
          </LayoutWrapper>
        </section>
      )}

      {svc.slug === "long-distance-drives" && (
        <section className={promoStyles.section}>
          <LayoutWrapper>
            <h2 className={`${promoStyles.heading} h3`}>
              Popular Long-Distance Routes
            </h2>
            <p className={promoStyles.copy}>
              Flat-rate, door-to-door private transfers on the routes we run
              most — both directions, any day.
            </p>
            <ul className={promoStyles.list}>
              {intercityRoutes.map((route) => (
                <li key={route.slug} className={promoStyles.item}>
                  <Link
                    href={`/routes/${route.slug}`}
                    className={promoStyles.link}
                  >
                    {route.origin} to {route.destination} car service
                  </Link>
                </li>
              ))}
            </ul>
          </LayoutWrapper>
        </section>
      )}
    </>
  );
}
