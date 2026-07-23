import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fleetData } from "@/lib/data";
import type { VehicleData } from "@/lib/types/fleet";
import FleetDetails from "./components/FleetDetails/FleetDetails";
import FleetSlugPageIntro from "./components/FleetSlugPageIntro/FleetSlugPageIntro";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import Nav from "@/components/shared/Nav/Nav";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v: VehicleData | undefined = fleetData.find((f) => f.slug === slug);
  return {
    title: v?.seo?.metaTitle ?? v?.title ?? "Vehicle",
    description:
      v?.seo?.metaDescription ?? v?.shortDesc ?? v?.desc ?? v?.longDesc,
    alternates: {
      canonical: `https://www.niertransportation.com/fleet/${slug}`,
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const vehicle: VehicleData | undefined = fleetData.find(
    (f) => f.slug === slug,
  );
  if (!vehicle) notFound();

  const vehicleSchema = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: vehicle.title,
    description: vehicle.longDesc ?? vehicle.shortDesc ?? vehicle.desc,
    vehicleConfiguration: vehicle.class,
    seatingCapacity: vehicle.seats,
    url: `https://www.niertransportation.com/fleet/${vehicle.slug}`,
    provider: {
      "@type": "LocalBusiness",
      name: "Nier Transportation",
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
        areaServed: "Phoenix Metro, Arizona",
      },
    }),
  };

  const faqJsonLd =
    vehicle.faqs && vehicle.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: vehicle.faqs.map((faq) => ({
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleSchema) }}
      />
      {faqJsonLd && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Nav background='accent' />
      <FleetSlugPageIntro vehicle={vehicle} />
      <FleetDetails vehicle={vehicle} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}