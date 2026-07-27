import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // NOTE: robots rules are prefix matches. "/corporate/" (with the
        // trailing slash) blocks the portal's subpages WITHOUT blocking
        // the public /corporate-accounts page, which "/corporate" would.
        disallow: [
          "/admin",
          "/api",
          "/driver",
          "/dashboard",
          "/corporate/",
          "/account",
          "/pay",
          "/studio",
          "/book/confirmation",
        ],
      },
    ],
    sitemap: "https://www.niertransportation.com/sitemap.xml",
  };
}
