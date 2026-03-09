import type { NextConfig } from "next";

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

  outputFileTracingExcludes: {
    "/admin/assets": ["./public/images/**/*", "./public/videos/**/*"],
  },

  ...(isProd ? {} : { turbopack: {} }),
};

export default nextConfig;
