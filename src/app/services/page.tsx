import { services } from "@/lib/data"; 
import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";
import ServicePageIntro from "@/components/ServicesPage/ServicePageIntro/ServicePageIntro";
import ServicesMission from "@/components/ServicesPage/ServicesMission/ServicesMission";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import Nav from "@/components/shared/Nav/Nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Services | Nier Transportation",
  description:
    "Luxury ground transportation in Scottsdale, Phoenix, and greater Metro Phoenix — airport transfers, hourly chauffeur, corporate events, weddings, party buses, and more.",
};

const servicesSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Nier Transportation Services",
  description:
    "Luxury ground transportation services serving Scottsdale, Phoenix, and greater Metro Phoenix",
  itemListElement: services.map((service, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Service",
      name: service.title,
      description: service.description,
      url: `https://www.niertransportation.com/services/${service.slug}`,
      provider: {
        "@type": "LocalBusiness",
        name: "Nier Transportation",
      },
      areaServed: "Phoenix Metro, Arizona",
      category: "Ground Transportation",
    },
  })),
};

export default function ServicesPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesSchema) }}
      />
      <Nav background='cream' />
      <ServicePageIntro />
      <ServicesMission />
      <ServicesPreview />
      <HowItWorks />
      <AboutNumbers />
    </main>
  );
}
