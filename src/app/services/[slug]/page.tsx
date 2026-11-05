// app/services/[slug]/page.tsx  (server component)

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { servicesData } from "@/lib/services";
import { routesData } from "@/lib/routes";
import ServiceDetailsClient from "./components/ServiceDetailsClient/ServiceDetailsClient";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import promoStyles from "./PopularRoutes.module.css";
import { BUSINESS_REF } from "@/lib/schema";
import { BUS_SIZE_GUIDE } from "@/components/charterPage/CharterGuide/CharterGuide";
import guideStyles from "@/components/charterPage/CharterGuide/CharterGuide.module.css";

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
  // The Sky Harbor airport page owns "black car service phoenix airport".
  "airport-transfers":
    "Airport Transfers in Phoenix: PHX, Scottsdale & Mesa Gateway | Nier",
  "hourly-chauffeur":
    "Phoenix Chauffeur Service: Hourly Chauffeur | Nier Transportation",
  "limo-service": "Limo Service Phoenix & Scottsdale | Limousine Rental | Nier",
  "long-distance-drives":
    "Long-Distance Car Service from Phoenix | Nier Transportation",
  "party-bus":
    "Party Bus Rentals in Phoenix & Scottsdale | Nier Transportation",
  weddings: "Wedding Limo Service & Transportation in Phoenix | Nier",
  "group-transportation":
    "Group Transportation Phoenix, AZ: Buses, Sprinters & Shuttles | Nier",
  "black-truck-service": "Black Truck Service Phoenix | Nier Transportation",
};

const descriptionOverrides: Partial<Record<string, string>> = {
  "hourly-chauffeur":
    "Chauffeur service in Phoenix by the hour: a professional chauffeur with a sedan, SUV or Sprinter on standby for meetings, events and nights out. Car service by the hour with a 2-hour minimum, 24/7.",
  "limo-service":
    "Limo service and limo rental in Phoenix & Scottsdale: rent a chauffeured stretch limousine by the hour for weddings, proms, anniversaries and nights out. Instant quotes, 2-hour minimum.",
  "party-bus":
    "Party bus rentals in Phoenix & Scottsdale: a 20–40 passenger mini party bus with a professional driver for birthdays, bachelorettes, concerts and game days. Party bus for hire by the hour.",
  weddings:
    "Wedding limo service in Phoenix & Scottsdale: stretch limousines for the couple, Sprinters and party buses for the wedding party, and guest shuttles, all on one timeline.",
  "airport-transfers":
    "Flat-rate airport black car service to PHX Sky Harbor, Scottsdale (SDL) & Mesa Gateway (AZA). Real-time flight tracking, 60-minute grace period, and meet & greet. Book in minutes.",
  "group-transportation":
    "Group transportation in Phoenix, AZ: Sprinters for up to 14, 28–40 passenger mini buses and 56-passenger motor coaches, with as many buses as you need. One coordinator, one invoice, no surge pricing.",
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
    titleOverrides[svc.slug] ?? `${svc.title} in Phoenix | Nier Transportation`;
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
    provider: BUSINESS_REF,
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

      {svc.slug === "group-transportation" && (
        <section className={promoStyles.section}>
          <LayoutWrapper>
            <h2 className={`${promoStyles.heading} h3`}>
              Which vehicle fits your group?
            </h2>
            <p className={promoStyles.copy}>
              Pick by headcount, then leave a few seats free for luggage on
              airport runs. Totals are what recent group charters with us have
              typically come to, with a 2-hour minimum. Your exact price shows
              in the booking tool before you book.
            </p>
            <div className={guideStyles.tableWrap}>
              <table className={guideStyles.table}>
                <thead>
                  <tr>
                    <th scope='col'>Group size</th>
                    <th scope='col'>Vehicle</th>
                    <th scope='col'>Typical total</th>
                    <th scope='col'>Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {BUS_SIZE_GUIDE.map((row) => (
                    <tr key={row.group}>
                      <td className={guideStyles.strong}>{row.group}</td>
                      <td>
                        <Link href={row.href} className={guideStyles.link}>
                          {row.bus}
                        </Link>
                      </td>
                      <td>{row.typical}</td>
                      <td>{row.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={promoStyles.list} style={{ marginTop: "3rem" }}>
              <li className={promoStyles.item}>
                <Link
                  href='/charter-bus-rental-phoenix'
                  className={promoStyles.link}
                >
                  Charter bus rental in Phoenix
                </Link>
              </li>
              <li className={promoStyles.item}>
                <Link
                  href='/charter-bus-rental-scottsdale'
                  className={promoStyles.link}
                >
                  Charter bus rental in Scottsdale
                </Link>
              </li>
              <li className={promoStyles.item}>
                <Link
                  href='/blog/charter-bus-rental-cost-phoenix'
                  className={promoStyles.link}
                >
                  How much a charter bus costs
                </Link>
              </li>
              <li className={promoStyles.item}>
                <Link
                  href='/services/corporate-and-event-logistics'
                  className={promoStyles.link}
                >
                  Corporate and event logistics
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
