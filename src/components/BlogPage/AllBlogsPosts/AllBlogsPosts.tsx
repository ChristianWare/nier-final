// components/BlogPage/AllBlogsPosts/AllBlogsPosts.tsx
import styles from "./AllBlogsPosts.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import AllBlogsPostsClient from "../AllBlogsPostsClient/AllBlogsPostsClient";
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

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <AllBlogsPostsClient posts={posts} tags={tags} />
      </LayoutWrapper>
    </section>
  );
}
