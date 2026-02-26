import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/driver", "/book/confirmation"],
      },
    ],
    sitemap: "https://www.niertransportation.com/sitemap.xml",
  };
}
