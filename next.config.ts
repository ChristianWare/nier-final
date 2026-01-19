import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },

  // Needed because Sanity (and some Sanity plugins) import styled-components.
  // This does NOT affect your CSS modules/global CSS unless you're actually using styled-components.
  compiler: {
    styledComponents: true,
  },

  // If you ever add Turbopack config, make sure it’s NOT on in prod:
  ...(isProd ? {} : { turbopack: {} }),
};

export default nextConfig;
