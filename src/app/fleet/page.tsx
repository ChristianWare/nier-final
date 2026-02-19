import FleetPageIntro from "@/components/FleetpAge/FleetPageIntro/FleetPageIntro";
import FleetPostHero from "@/components/FleetpAge/FleetPostHero/FleetPostHero";
import Fleet from "@/components/HomePage/Fleet/Fleet";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import BlogSection from "@/components/shared/BlogSection/BlogSection";
import Faq from "@/components/shared/Faq/Faq";
import Nav from "@/components/shared/Nav/Nav";
import { fleetData, homeQuestions } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Fleet | Nier Transportation",
  description:
    "Explore Nier Transportation's luxury fleet — executive sedans, SUVs, sprinter vans, stretch limos, party buses, and motorcoaches serving Scottsdale, Phoenix, and greater Metro Phoenix.",
};

const fleetSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Nier Transportation Fleet",
  description:
    "Luxury black car and limousine fleet serving Scottsdale, Phoenix, and greater Metro Phoenix",
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
          "@type": "Organization",
          name: "Nier Transportation",
        },
        ...(vehicle.rateRules?.hourlyFromUSD && {
          priceSpecification: {
            "@type": "PriceSpecification",
            price: vehicle.rateRules.hourlyFromUSD,
            priceCurrency: "USD",
            unitText: "per hour",
          },
        }),
        areaServed: "Metro Phoenix, AZ",
      },
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
      <Nav background='accent' />
      <FleetPageIntro />
      <FleetPostHero />
      <Fleet />
      <Faq items={homeQuestions} />
      <BlogSection />
      <AboutNumbers />
    </main>
  );
}
