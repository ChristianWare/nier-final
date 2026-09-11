// /components/shared/BlogSection/BlogSection.tsx
import styles from "./BlogSection.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import BlogCardOne from "@/components/BlogPage/BlogCardOne/BlogCardOne";
import BlogCardTwo from "@/components/BlogPage/BlogCardTwo/BlogCardTwo";
import Button from "@/components/shared/Button/Button";
import SectionHeading from "../SectionHeading/SectionHeading";
import { getAllPosts, isEventPost } from "@/lib/blog";

export default function BlogSection() {
  // Same rule as the old Sanity query: event posts stay out of this section
  const posts = getAllPosts().filter((p) => !isEventPost(p));
  const primary = posts[0];
  const secondary = posts.slice(1, 3);

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='blog' dot />
            <h2 className={`${styles.heading} h2`}>
              Insights, updates, and <br /> practical knowledge
            </h2>
            <p className={styles.copy}>
              Stay informed with our latest posts on travel tips, Phoenix
              events, and what to expect from a premium black car experience.
            </p>
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
                    imageUrl: primary.coverImage?.src,
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
                    imageUrl: p.coverImage?.src,
                    imageAlt: p.coverImage?.alt ?? p.title,
                  }}
                />
              ))}
            </div>
          </div>
          <div className={styles.btnContainer}>
            <Button href='/blog' btnType='black' text='All blog posts' arrow />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
