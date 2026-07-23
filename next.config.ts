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