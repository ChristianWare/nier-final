import { Suspense } from "react";
import AllBlogsPosts from "@/components/BlogPage/AllBlogsPosts/AllBlogsPosts";
import BlogPageIntro from "@/components/BlogPage/BlogPageIntro/BlogPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";
import LoadingPulse from "@/components/shared/LoadingPulse/LoadingPulse";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Nier Transportation",
  description:
    "Tips, guides, and insights on luxury ground transportation, airport travel, and getting around Scottsdale and Phoenix in style.",
};

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Nier Transportation Blog",
  description:
    "Tips, guides, and insights on luxury ground transportation, airport travel, and getting around Scottsdale and Phoenix in style.",
  url: "https://www.niertransportation.com/blog",
  publisher: {
    "@type": "Organization",
    name: "Nier Transportation",
    logo: "https://www.niertransportation.com/nierLogo.png",
  },
};

export default function BlogPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <Suspense fallback={<LoadingPulse />}>
        <Nav background='cream' />
        <BlogPageIntro />
        <AllBlogsPosts />
        <FinalCTA />
      </Suspense>
    </main>
  );
}
