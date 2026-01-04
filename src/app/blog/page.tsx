import { Suspense } from "react";
import AllBlogsPosts from "@/components/BlogPage/AllBlogsPosts/AllBlogsPosts";
import BlogPageIntro from "@/components/BlogPage/BlogPageIntro/BlogPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";
import LoadingPulse from "@/components/shared/LoadingPulse/LoadingPulse";

export default function BlogPage() {
  return (
    <main>
      <Suspense
        fallback={
            <LoadingPulse />
        }
      >
      <Nav background='cream' />

      <BlogPageIntro />
      {/* Anything that renders a client component using useSearchParams must be inside Suspense */}
        <AllBlogsPosts />
        <FinalCTA />
      </Suspense>
    </main>
  );
}
