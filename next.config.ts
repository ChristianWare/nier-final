import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
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
