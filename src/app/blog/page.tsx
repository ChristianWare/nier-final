import AllBlogsPosts from "@/components/BlogPage/AllBlogsPosts/AllBlogsPosts";
import BlogPageIntro from "@/components/BlogPage/BlogPageIntro/BlogPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { BUSINESS_REF } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Blog | Luxury Transportation Tips & Travel Guides",
  description:
    "Tips, guides, and insights on luxury ground transportation, airport travel, and getting around Scottsdale and Phoenix in style.",
  alternates: {
    // ?tag= and ?q= views are filtered copies of this page, so they canonical here.
    canonical: `${SITE_URL}/blog`,
  },
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Nier Transportation Blog",
  description:
    "Tips, guides, and insights on luxury ground transportation, airport travel, and getting around Scottsdale and Phoenix in style.",
  url: "https://www.niertransportation.com/blog",
  inLanguage: "en-US",
  publisher: BUSINESS_REF,
};

export default function BlogPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <Nav background='cream' />
      <BlogPageIntro />
      <AllBlogsPosts />
      <FinalCTA />
    </main>
  );
}
