import { notFound } from "next/navigation";
import { serviceAreaCities } from "@/lib/cities";
import { servicesData as services } from "@/lib/services";
import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import HowItWorks from "@/components/shared/HowItWorks/HowItWorks";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import LocationCityIntro from "@/components/LocationCityPage/LocationCityIntro/LocationCityIntro";
import LocationCityMission from "@/components/LocationCityPage/LocationCityMission/LocationCityMission";
import LocationCityServicesGrid from "@/components/LocationCityPage/LocationCityServicesGrid/LocationCityServicesGrid";
// import ServicesPreview from "@/components/HomePage/ServicesPreview/ServicesPreview";

type Params = { city: string };

export function generateStaticParams() {
  return serviceAreaCities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = serviceAreaCities.find((c) => c.slug === citySlug);
  if (!city) return {};

  return {
    title: `Luxury Black Car Service in ${city.name}, AZ | Nier Transportation`,
    description: `Premium chauffeur services in ${city.name}, Arizona — airport transfers, hourly chauffeur, corporate events, weddings, and more. Available 24/7 with no surge pricing.`,
    alternates: {
      canonical: `https://www.niertransportation.com/locations/${city.slug}`,
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

  console.log("citySlug:", citySlug);
  console.log(
    "available slugs:",
    serviceAreaCities.map((c) => c.slug),
  );

  const city = serviceAreaCities.find((c) => c.slug === citySlug);

  console.log("found city:", city);

  if (!city) notFound();

  const citySchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Nier Transportation Services in ${city.name}, AZ`,
    description: `Luxury ground transportation services available in ${city.name}, Arizona`,
    url: `https://www.niertransportation.com/locations/${city.slug}`,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: `${service.title} in ${city.name}`,
        description: service.description,
        url: `https://www.niertransportation.com/services/${service.slug}/${city.slug}`,
        provider: {
          "@type": "LocalBusiness",
          name: "Nier Transportation",
        },
        areaServed: {
          "@type": "City",
          name: city.name,
        },
        category: "Ground Transportation",
      },
    })),
  };

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(citySchema) }}
      />
      <Nav background='cream' />
      <LocationCityIntro city={city} />
      <LocationCityMission city={city} />
      <LocationCityServicesGrid city={city} />
      {/* <ServicesPreview /> */}
      <HowItWorks />
      <AboutNumbers />
    </main>
  );
}
