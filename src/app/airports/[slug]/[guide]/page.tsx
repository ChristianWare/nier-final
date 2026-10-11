// src/app/airports/[slug]/[guide]/page.tsx
//
// Sky Harbor terminal guides: /airports/phx-sky-harbor/terminal-3, etc.
// Content lives in src/lib/airportGuides.ts; this file only lays it out.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/shared/Nav/Nav";
import Faq from "@/components/shared/Faq/Faq";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import GuideHero from "@/components/shared/GuideHero/GuideHero";
import RelatedLinks from "@/components/shared/RelatedLinks/RelatedLinks";
import Breadcrumbs from "@/components/shared/Breadcrumbs/Breadcrumbs";
import RideBox from "@/components/BlogPage/RideBox/RideBox";
import { airportsData } from "@/lib/airports";
import {
  airportGuides,
  CHECKED_ON,
  getAirportGuide,
  guidesForAirport,
} from "@/lib/airportGuides";
import { bookingLink } from "@/lib/booking/linkPrefill";
import { getBookingWidgetData } from "@/lib/booking/widgetData";
import { BUSINESS_REF } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";
import styles from "./GuidePage.module.css";

type Params = { slug: string; guide: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return airportGuides.map((g) => ({ slug: g.airportSlug, guide: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, guide } = await params;
  const g = getAirportGuide(slug, guide);
  if (!g) return { title: "Guide Not Found" };
  const canonical = `${SITE_URL}/airports/${g.airportSlug}/${g.slug}`;
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: g.metaTitle,
      description: g.metaDescription,
      url: canonical,
      type: "article",
      siteName: "Nier Transportation",
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: g.metaTitle,
      description: g.metaDescription,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

/** Hero video for guides that don't set their own. */
const DEFAULT_HERO = {
  video: "/videos/phx.mp4",
  poster: "/videos/phx-poster.png",
  alt: "Black car waiting at the curb at Phoenix Sky Harbor",
};

const checkedLabel = new Date(`${CHECKED_ON}T12:00:00Z`).toLocaleDateString(
  "en-US",
  { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" },
);

export default async function AirportGuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, guide } = await params;
  const g = getAirportGuide(slug, guide);
  const airport = airportsData.find((a) => a.slug === slug);
  if (!g || !airport) notFound();

  const widget = await getBookingWidgetData();
  const canonical = `${SITE_URL}/airports/${g.airportSlug}/${g.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.h1,
    description: g.metaDescription,
    url: canonical,
    mainEntityOfPage: canonical,
    dateModified: CHECKED_ON,
    about: { "@type": "Airport", name: airport.name, iataCode: airport.code },
    author: BUSINESS_REF,
    publisher: BUSINESS_REF,
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const relatedLinks = [
    ...guidesForAirport(slug)
      .filter((o) => o.slug !== g.slug)
      .map((o) => ({
        label: `Sky Harbor ${o.shortName} guide`,
        href: `/airports/${o.airportSlug}/${o.slug}`,
      })),
    {
      label: "Black car service to Sky Harbor",
      href: `/airports/${airport.slug}`,
    },
    {
      label: "Scottsdale to Sky Harbor car service",
      href: "/routes/scottsdale-to-sky-harbor",
    },
    {
      label: "Tempe to Sky Harbor car service",
      href: "/routes/tempe-to-sky-harbor",
    },
    {
      label: "Phoenix to Sedona private shuttle",
      href: "/routes/phoenix-to-sedona",
    },
    {
      label: "Sky Harbor guide: what's new in 2026",
      href: "/blog/sky-harbor-airport-guide",
    },
  ];

  // Booking box after the second section: readers who got the answer they
  // came for are deciding how to get to (or from) the terminal.
  const boxAfter = Math.min(1, g.sections.length - 1);

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='cream' />
      <Breadcrumbs
        items={[
          { name: "Airports", href: "/airports" },
          { name: airport.shortName, href: `/airports/${airport.slug}` },
          { name: g.shortName },
        ]}
      />

      <GuideHero
        eyebrow={`${airport.code} · Airport Guide`}
        heading={g.h1}
        lead={g.lead}
        media={g.hero ?? DEFAULT_HERO}
        primaryCta={{
          href: bookingLink("from-airport", airport.code),
          text: `Book a pickup at ${airport.code}`,
        }}
        secondaryCta={{
          href: bookingLink("to-airport", airport.code),
          text: `Book a ride to ${airport.code}`,
        }}
        scrollTo='guide-body'
        facts={g.facts}
      />

      <section id='guide-body' className={styles.body}>
        <LayoutWrapper>
          <article className={styles.article}>
            {g.sections.map((s, i) => (
              <div key={s.heading} className={styles.section}>
                <h2 className={`${styles.sectionHeading} h3`}>{s.heading}</h2>
                {s.paragraphs?.map((p) => (
                  <p key={p.slice(0, 40)} className={styles.p}>
                    {p}
                  </p>
                ))}
                {s.bullets && (
                  <ul className={styles.bullets}>
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
                {s.table && (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      {s.table.caption && (
                        <caption className={styles.caption}>
                          {s.table.caption}
                        </caption>
                      )}
                      <thead>
                        <tr>
                          {s.table.head.map((h) => (
                            <th key={h} scope='col'>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.table.rows.map((r) => (
                          <tr key={r.join("|")}>
                            {r.map((c, ci) => (
                              <td key={ci}>{c}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {i === boxAfter && (
                  <div className={styles.rideBox}>
                    <RideBox
                      data={widget}
                      source={`airport-guide:${g.slug}`}
                      title={g.rideBox.title}
                      copy={g.rideBox.copy}
                    />
                  </div>
                )}
              </div>
            ))}

            <div className={styles.sources}>
              <p className={styles.sourcesTitle}>
                Sources, checked {checkedLabel}
              </p>
              <ul>
                {g.sources.map((src) => (
                  <li key={src.href}>
                    <a href={src.href} target='_blank' rel='noopener'>
                      {src.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className={styles.sourcesNote}>
                Airlines occasionally move between terminals; check with your
                airline before you fly. Need a ride?{" "}
                <Link href={`/airports/${airport.slug}`}>
                  Book black car service to Sky Harbor
                </Link>
                .
              </p>
            </div>
          </article>
        </LayoutWrapper>
      </section>

      <Faq
        items={g.faqs.map((f, i) => ({ id: i, question: f.q, answer: f.a }))}
      />

      <RelatedLinks
        title='More Sky Harbor guides & airport rides'
        links={relatedLinks}
      />
    </main>
  );
}
