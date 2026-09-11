import styles from "./MoreInsights.module.css";
// import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import BlogCardTwo from "../BlogCardTwo/BlogCardTwo";
import Button from "@/components/shared/Button/Button";
import { getAllPosts } from "@/lib/blog";

function getMorePosts(currentSlug: string) {
  return getAllPosts()
    .filter((p) => p.slug.current !== currentSlug)
    .slice(0, 3);
}

export default function MoreInsights({ currentSlug }: { currentSlug: string }) {
  const posts = getMorePosts(currentSlug);

  return (
    <section className={styles.container}>
      {/* <LayoutWrapper> */}
      <div className={styles.content}>
        {/* <div className={styles.top}>
            <SectionHeading text='More Insights' />
          </div> */}
        <div className={styles.bottom}>
          {posts.map((p) => (
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
        <div className={styles.btnContainer}>
          <Button
            href='/blog'
            btnType='black'
            text='See all blog posts'
            arrow
          />
        </div>
      </div>
      {/* </LayoutWrapper> */}
    </section>
  );
}
