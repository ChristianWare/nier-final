import { Suspense } from "react";
import AllBlogsPosts from "@/components/BlogPage/AllBlogsPosts/AllBlogsPosts";
import BlogPageIntro from "@/components/BlogPage/BlogPageIntro/BlogPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import FinalCTA from "@/components/shared/FinalCTA/FinalCTA";

export default function BlogPage() {
  return (
    <main>
      <Nav background='cream' />

      <BlogPageIntro />
      {/* Anything that renders a client component using useSearchParams must be inside Suspense */}
      <Suspense
        fallback={
          <section style={{ padding: "2rem 0" }}>
            <p>Loading posts…</p>
          </section>
        }
      >
        <AllBlogsPosts />
        <FinalCTA />
      </Suspense>
    </main>
  );
}
