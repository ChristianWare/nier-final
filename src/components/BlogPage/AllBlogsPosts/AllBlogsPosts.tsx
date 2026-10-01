// components/BlogPage/AllBlogsPosts/AllBlogsPosts.tsx
import { Suspense } from "react";
import styles from "./AllBlogsPosts.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import AllBlogsPostsClient from "../AllBlogsPostsClient/AllBlogsPostsClient";
import BlogCardTwo from "../BlogCardTwo/BlogCardTwo";
import { getAllPosts, getAllTags } from "@/lib/blog";

export default function AllBlogsPosts() {
  const posts = getAllPosts().map((p) => ({
    _id: p._id,
    title: p.title,
    slug: p.slug,
    publishedAt: p.publishedAt,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    tags: p.tags,
  }));
  const tags = getAllTags();

  /* AllBlogsPostsClient reads ?tag= / ?q= with useSearchParams(). On this
     static route Next renders that subtree in the browser only, so the
     static HTML gets this <Suspense> fallback. Making the fallback the full,
     unfiltered post list means Google (and no-JS visitors) still get every
     post link; the client takes over after hydration and applies filters. */
  const fallback = (
    <section>
      <div className={styles.content}>
        {posts.map((p) => (
          <div className={styles.cardContainer} key={p._id}>
            <BlogCardTwo
              post={{
                title: p.title,
                href: `/blog/${p.slug.current}`,
                date: p.publishedAt,
                excerpt: p.excerpt ?? "",
                imageUrl: p.coverImage?.src,
                imageAlt: p.coverImage?.alt ?? p.title,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <Suspense fallback={fallback}>
          <AllBlogsPostsClient posts={posts} tags={tags} />
        </Suspense>
      </LayoutWrapper>
    </section>
  );
}
