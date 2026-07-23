// app/services/[slug]/page.tsx  (server component)

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { servicesData } from "@/lib/services";
import ServiceDetailsClient from "./components/ServiceDetailsClient/ServiceDetailsClient";

type Params = { slug: string };

const SITE_URL = "https://www.niertransportation.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

/* Per-service overrides for search-targeted titles/descriptions.
   Default pattern still applies to any slug not listed here. */
const titleOverrides: Partial<Record<string, string>> = {
  "airport-transfers":
    "Black Car Service to Phoenix Sky Harbor Airport | Nier Transportation",
};

const descriptionOverrides: Partial<Record<string, string>> = {
  "airport-transfers":
    "Flat-rate airport black car service to PHX Sky Harbor, Scottsdale (SDL) & Mesa Gateway (AZA). Real-time flight tracking, 60-minute grace period, and meet & greet. Book in minutes.",
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
export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
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
    </>
  );
}