import styles from "./MoreInsights.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import BlogCardTwo from "../BlogCardTwo/BlogCardTwo";
import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import Button from "@/components/shared/Button/Button";

type Post = {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  excerpt?: string;
  coverImage?: { asset: { _ref: string }; alt?: string };
};

async function getMorePosts(currentSlug: string): Promise<Post[]> {
  const query = `
    *[_type == "post" && slug.current != $slug]
      | order(publishedAt desc)[0..2]{
        _id,
        title,
        slug,
        publishedAt,
        excerpt,
        coverImage{asset, alt}
      }
  `;
  return client.fetch(
    query,
    { slug: currentSlug },
    { next: { revalidate: 60 } }
  );
}

export default async function MoreInsights({
  currentSlug,
}: {
  currentSlug: string;
}) {
  const posts = await getMorePosts(currentSlug);

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='More Insights' />
          </div>
          <div className={styles.bottom}>
            {posts.map((p) => (
              <BlogCardTwo
                key={p._id}
                post={{
                  title: p.title,
                  href: `/blog/${p.slug.current}`,
                  date: p.publishedAt,
                  excerpt: p.excerpt ?? "",
                  imageUrl: p.coverImage
                    ? urlFor(p.coverImage)
                        .width(800)
                        .height(600)
                        .fit("crop")
                        .url()
                    : undefined,
                  imageAlt: p.coverImage?.alt ?? p.title,
                }}
              />
            ))}
          </div>
          <div className={styles.btnContainer}>
            <Button href='/blog' btnType='black' text='See all blog posts' />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
