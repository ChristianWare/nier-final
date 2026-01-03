// /components/shared/BlogSection/BlogSection.tsx
import styles from "./BlogSection.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import BlogCardOne from "../BlogCardOne/BlogCardOne";
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
  coverImage?: {
    _type: "image";
    asset: { _ref: string; _type: "reference" };
    alt?: string;
  };
};

async function getPosts(): Promise<Post[]> {
  const query = `
    *[_type == "post"] | order(publishedAt desc) 
    {
      _id,
      title,
      slug,
      publishedAt,
      excerpt,
      coverImage{asset, alt, _type}
    }
  `;
  return client.fetch(query, {}, { next: { revalidate: 60 } });
}

export default async function BlogSection() {
  const posts = await getPosts();
  const primary = posts[0];
  const secondary = posts.slice(1, 3);

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <h2 className={`${styles.heading} h4`}>Latest insights</h2>
          </div>

          <div className={styles.bottom}>
            <div className={styles.bottomLeft}>
              {primary && (
                <BlogCardOne
                  post={{
                    title: primary.title,
                    href: `/blog/${primary.slug.current}`,
                    date: primary.publishedAt,
                    excerpt: primary.excerpt ?? "",
                    imageUrl: primary.coverImage
                      ? urlFor(primary.coverImage)
                          .width(1400)
                          .height(900)
                          .fit("crop")
                          .url()
                      : undefined,
                    imageAlt: primary.coverImage?.alt ?? primary.title,
                  }}
                />
              )}
            </div>

            <div className={styles.bottomRight}>
              {secondary.map((p) => (
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
          </div>
          <div className={styles.btnContainer}>
            <Button href='/blog' btnType='black' text='All blog posts' />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
