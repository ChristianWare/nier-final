import FleetPageIntro from "@/components/FleetpAge/FleetPageIntro/FleetPageIntro";
import FleetPostHero from "@/components/FleetpAge/FleetPostHero/FleetPostHero";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import { fleetData, fleetQuestions } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleet | Luxury Black Car & Limo Vehicles Phoenix",
  description:
    "Explore Nier Transportation's luxury fleet — executive sedans, SUVs, Sprinter vans, stretch limos, and party buses serving Phoenix and Scottsdale. Book online.",
};

const fleetSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Nier Transportation Fleet",
  url: "https://www.niertransportation.com/fleet",
  description:
    "Luxury black car and limousine fleet serving Phoenix, Scottsdale, and greater Metro Phoenix.",
  itemListElement: fleetData.map((vehicle, index) => ({
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
        seller: {
          "@type": "LocalBusiness",
          name: "Nier Transportation",
          url: "https://www.niertransportation.com",
        },
        areaServed: {
          "@type": "State",
          name: "Arizona",
        },
        ...(vehicle.rateRules?.hourlyFromUSD && {
          priceSpecification: {
            "@type": "PriceSpecification",
            price: vehicle.rateRules.hourlyFromUSD,
            priceCurrency: "USD",
            unitText: "HOUR",
          },
        }),
      },
    },
  })),
};

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

export default function FleetPage() {
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
      <Nav background='accent' />
      <FleetPageIntro />
      <FleetPostHero />
      <Fleet />
      <Faq items={fleetQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
