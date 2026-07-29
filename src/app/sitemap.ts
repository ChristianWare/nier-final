import { MetadataRoute } from "next";
import { servicesData } from "@/lib/services";
import { serviceAreaCities } from "@/lib/cities";
import { routesData } from "@/lib/routes";
import { airportsData } from "@/lib/airports";
import { client } from "@/sanity/lib/client";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.niertransportation.com";

  // Fetch all published blog posts from Sanity
  const posts = await client.fetch<{ slug: string; publishedAt: string }[]>(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
      "slug": slug.current,
      publishedAt
    }`,
    {},
    { next: { revalidate } },
  );

  // Static pages
  // Note: /corporate is the login-gated portal (middleware redirects it),
  // so it never belongs here. /corporate-accounts is the public page.
  const staticPages = [
    "",
    "/about",
    "/services",
    "/fleet",
    "/routes",
    "/airports",
    "/locations",
    "/wekopa",
    "/charter-bus-rental-phoenix",
    "/corporate-accounts",
    "/book",
    "/blog",
    "/contact",
    "/terms",
    "/privacy",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Dynamic blog post pages
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
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

  // Route ("A to B") money pages
  const routePages = routesData.map((route) => ({
    url: `${baseUrl}/routes/${route.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Per-airport money pages
  const airportPages = airportsData.map((airport) => ({
    url: `${baseUrl}/airports/${airport.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Service + city combo pages stay OUT of the sitemap on purpose —
  // they are noindexed (robots: index false, follow true) to avoid
  // scaled near-duplicate content. Do not re-add without curating.

  return [
    ...staticPages,
    ...blogPages,
    ...servicePages,
    ...locationPages,
    ...routePages,
    ...airportPages,
  ];
}
