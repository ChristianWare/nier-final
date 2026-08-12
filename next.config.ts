import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "niertransportation.com" }],
        destination: "https://www.niertransportation.com/:path*",
        permanent: true,
      },
      {
        source:
          "/blog/elevate-your-travel-experience-with-the-best-black-car-service-in-phoenix-az",
        destination: "/services/airport-transfers",
        permanent: true,
      },
      // ── Legacy URL cleanup (GSC soft-404s + stale crawl paths) ──
      {
        source: "/services/charter-bus-rental-phoenix",
        destination: "/charter-bus-rental-phoenix",
        permanent: true,
      },
      {
        source: "/services/long-distance",
        destination: "/services/long-distance-drives",
        permanent: true,
      },
      {
        source: "/services/corporate-events",
        destination: "/services/corporate-and-event-logistics",
        permanent: true,
      },
      {
        source: "/services/recurring-rides",
        destination: "/services/reoccurring-rides",
        permanent: true,
      },
      {
        source: "/services/party-bus-weddings",
        destination: "/services/party-bus",
        permanent: true,
      },
      {
        source: "/california",
        destination: "/locations",
        permanent: true,
      },
      // ── Combo-matrix teardown (Aug 2026) ──────────────────────────────
      // The service×city and fleet×city pages are gone. Winners first:
      // airport/long-distance combos with a matching /routes page keep
      // the equity they earned. ORDER MATTERS — Next.js applies the first
      // matching rule, so these specific rules must stay ABOVE the two
      // catch-alls at the bottom.
      {
        source: "/services/airport-transfers/scottsdale",
        destination: "/routes/scottsdale-to-sky-harbor",
        permanent: true,
      },
      {
        source: "/services/airport-transfers/paradise-valley",
        destination: "/routes/paradise-valley-to-sky-harbor",
        permanent: true,
      },
      {
        source: "/services/airport-transfers/chandler",
        destination: "/routes/chandler-to-sky-harbor",
        permanent: true,
      },
      {
        source: "/services/airport-transfers/tempe",
        destination: "/routes/tempe-to-sky-harbor",
        permanent: true,
      },
      {
        source: "/services/airport-transfers/buckeye",
        destination: "/routes/buckeye-to-sky-harbor",
        permanent: true,
      },
      {
        source: "/services/long-distance-drives/tucson",
        destination: "/routes/tucson-to-phoenix",
        permanent: true,
      },
      {
        source: "/services/long-distance-drives/sedona",
        destination: "/routes/phoenix-to-sedona",
        permanent: true,
      },
      {
        source: "/services/long-distance-drives/flagstaff",
        destination: "/routes/flagstaff-to-phoenix",
        permanent: true,
      },
      {
        source: "/services/long-distance-drives/prescott",
        destination: "/routes/phoenix-to-prescott",
        permanent: true,
      },
      // Everything else in the matrix collapses to its parent page.
      // (Two segments only — real one-segment pages are untouched.)
      {
        source: "/services/:slug/:city",
        destination: "/services/:slug",
        permanent: true,
      },
      {
        source: "/fleet/:slug/:city",
        destination: "/fleet/:slug",
        permanent: true,
      },
    ];
  },

  experimental: {
    optimizeCss: true,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  compiler: {
    styledComponents: true,
  },

  ...(isProd ? {} : { turbopack: {} }),
};

export default withBundleAnalyzer(nextConfig);
