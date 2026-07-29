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
