// components/BlogPage/AllBlogsPosts/AllBlogsPosts.tsx
import { client } from "@/sanity/lib/client";
import styles from "./AllBlogsPosts.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import AllBlogsPostsClient from "../AllBlogsPostsClient/AllBlogsPostsClient";

type Tag = { _id: string; name: string; slug: { current: string } };
type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  coverImage?: {
    _type: "image";
    asset: { _ref: string; _type: "reference" };
    alt?: string;
  };
  tags?: Tag[];
};

async function getPosts(): Promise<Post[]> {
  const query = `
    *[_type == "post"] | order(publishedAt desc) {
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      coverImage{asset, alt, _type},
      tags[]->{ _id, name, slug }
    }
  `;
  return client.fetch(query, {}, { next: { revalidate: 60 } });
}

async function getAllTags(): Promise<Tag[]> {
  const query = `
    *[_type == "tag"] | order(name asc) {
      _id,
      name,
      slug
    }
  `;
  return client.fetch(query, {}, { next: { revalidate: 60 } });
}

export default async function AllBlogsPosts() {
  const [posts, tags] = await Promise.all([getPosts(), getAllTags()]);

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <AllBlogsPostsClient posts={posts} tags={tags} />
      </LayoutWrapper>
    </section>
  );
}
