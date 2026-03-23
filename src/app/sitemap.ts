import { MetadataRoute } from "next";
import { servicesData } from "@/lib/services";
import { serviceAreaCities } from "@/lib/cities";
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
    ...blogPages,
    ...servicePages,
    ...locationPages,
    ...serviceCityPages,
  ];
}
