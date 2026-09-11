import { MetadataRoute } from "next";
import { servicesData } from "@/lib/services";
import { serviceAreaCities } from "@/lib/cities";
import { routesData } from "@/lib/routes";
import { airportsData } from "@/lib/airports";
import { fleetData } from "@/lib/data";
import { getAllPosts } from "@/lib/blog";

const baseUrl = "https://www.niertransportation.com";

// Honest lastmod. Google ignores <lastmod> when every URL claims "now" on
// every request (which is what `new Date()` did). Bump a date here whenever
// a page actually changes; everything else falls back to the last broad
// site update. Blog posts carry their own dates from frontmatter.
const DEFAULT_LAST_MOD = "2026-07-29";
const LAST_MOD: Partial<Record<string, string>> = {
  "/charter-bus-rental-phoenix": "2026-08-12",
  "/services/airport-transfers": "2026-08-12",
  "/services/group-transportation": "2026-08-12",
  "/locations/glendale": "2026-08-12",
  "/locations/phoenix": "2026-08-12",
  "/routes/tempe-to-sky-harbor": "2026-08-11",
  "/routes/buckeye-to-sky-harbor": "2026-08-11",
};

function lastMod(path: string): Date {
  return new Date(LAST_MOD[path] ?? DEFAULT_LAST_MOD);
}

export default function sitemap(): MetadataRoute.Sitemap {
  // All published blog posts from /content/blog (drafts are already
  // excluded by getAllPosts in production builds)
  const posts = getAllPosts();

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
    lastModified: lastMod(route),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug.current}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const servicePages = servicesData.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: lastMod(`/services/${service.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const locationPages = serviceAreaCities.map((city) => ({
    url: `${baseUrl}/locations/${city.slug}`,
    lastModified: lastMod(`/locations/${city.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const routePages = routesData.map((route) => ({
    url: `${baseUrl}/routes/${route.slug}`,
    lastModified: lastMod(`/routes/${route.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const airportPages = airportsData.map((airport) => ({
    url: `${baseUrl}/airports/${airport.slug}`,
    lastModified: lastMod(`/airports/${airport.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Vehicle pages
  const fleetPages = fleetData.map((vehicle) => ({
    url: `${baseUrl}/fleet/${vehicle.slug}`,
    lastModified: lastMod(`/fleet/${vehicle.slug}`),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Service + city combo pages are gone (301'd to parents) and must never
  // be re-added here.

  return [
    ...staticPages,
    ...blogPages,
    ...servicePages,
    ...locationPages,
    ...routePages,
    ...airportPages,
    ...fleetPages,
  ];
}
