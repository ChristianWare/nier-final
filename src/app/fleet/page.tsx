import FleetPageIntro from "@/components/FleetpAge/FleetPageIntro/FleetPageIntro";
import FleetPostHero from "@/components/FleetpAge/FleetPostHero/FleetPostHero";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import { fleetData, fleetQuestions } from "@/lib/data";
import type { Metadata } from "next";
import { BUSINESS_REF } from "@/lib/schema";
import { getFleetRatesBySlug } from "@/lib/booking/publicRates";

// Prices come from Admin → Vehicle Categories (refreshed on save).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fleet | Luxury Black Car & Limo Vehicles Phoenix",
  description:
    "Explore Nier Transportation's luxury fleet — executive sedans, SUVs, Sprinter vans, stretch limos, and party buses serving Phoenix and Scottsdale. Book online.",
};

function fleetSchemaFor(
  rates: Awaited<ReturnType<typeof getFleetRatesBySlug>>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Nier Transportation Fleet",
    url: "https://www.niertransportation.com/fleet",
    description:
      "Luxury black car and limousine fleet serving Phoenix, Scottsdale, and greater Metro Phoenix.",
    itemListElement: fleetData.map((vehicle, index) => {
      const r = rates.get(vehicle.slug);
      const hourly =
        r && !r.callForPricing && r.hourlyRateCents
          ? r.hourlyRateCents / 100
          : null;
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Vehicle",
          name: vehicle.title,
          description: vehicle.longDesc,
          vehicleConfiguration: vehicle.class,
          seatingCapacity: vehicle.seats,
          url: `https://www.niertransportation.com/fleet/${vehicle.slug}`,
          offers: {
            "@type": "Offer",
            seller: BUSINESS_REF,
            areaServed: {
              "@type": "State",
              name: "Arizona",
            },
            ...(hourly && {
              priceSpecification: {
                "@type": "PriceSpecification",
                price: hourly,
                priceCurrency: "USD",
                unitText: "HOUR",
              },
            }),
          },
        },
      };
    }),
  };
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: fleetQuestions.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default async function FleetPage() {
  const fleetSchema = fleetSchemaFor(await getFleetRatesBySlug());
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(fleetSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='white' />
      <FleetPageIntro />
      <FleetPostHero />
      <Fleet />
      <Faq items={fleetQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
