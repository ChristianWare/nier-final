import { MetadataRoute } from "next";
import { servicesData } from "@/lib/services";
import { serviceAreaCities } from "@/lib/cities";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.niertransportation.com";

  // Static pages
  const staticPages = [
    "",
    "/about",
    "/services",
    "/fleet",
    "/contact",
    "/corporate",
    "/blog",
    "/locations",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Dynamic service pages
  const servicePages = servicesData.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Dynamic location pages
  const locationPages = serviceAreaCities.map((city) => ({
    url: `${baseUrl}/locations/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dynamic service + city pages
  const serviceCityPages = servicesData.flatMap((service) =>
    serviceAreaCities.map((city) => ({
      url: `${baseUrl}/services/${service.slug}/${city.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  );

  return [
    ...staticPages,
    ...servicePages,
    ...locationPages,
    ...serviceCityPages,
  ];
}
