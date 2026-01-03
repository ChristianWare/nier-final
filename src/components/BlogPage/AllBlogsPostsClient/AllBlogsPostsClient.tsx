// components/BlogPage/AllBlogsPosts/AllBlogsPostsClient.tsx
"use client";

import { useMemo, useState } from "react";
import styles from "../AllBlogsPosts/AllBlogsPosts.module.css";
import BlogCardTwo from "../BlogCardTwo/BlogCardTwo";
import { urlFor } from "@/sanity/lib/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

export default function AllBlogsPostsClient({
  posts,
  tags,
}: {
  posts: Post[];
  tags: Tag[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tagOptions = useMemo(
    () => [{ _id: "all", name: "All", slug: { current: "all" } }, ...tags],
    [tags]
  );

  const initialSlug =
    searchParams.get("tag") &&
    (searchParams.get("tag") === "all" ||
      tags.some((t) => t.slug.current === searchParams.get("tag")))
      ? (searchParams.get("tag") as string)
      : "all";

  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);

  const filtered = useMemo(() => {
    if (selectedSlug === "all") return posts;
    return posts.filter((p) =>
      p.tags?.some((t) => t.slug.current === selectedSlug)
    );
  }, [posts, selectedSlug]);

  function selectTag(slug: string) {
    setSelectedSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") params.delete("tag");
    else params.set("tag", slug);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <section>
      <ul className={styles.tags}>
        {tagOptions.map((t) => (
          <li key={t._id}>
            <button
              type='button'
              onClick={() => selectTag(t.slug.current)}
              className={[
                styles.tagChip,
                selectedSlug === t.slug.current ? styles.tagChipActive : "",
              ].join(" ")}
            >
              {t.name}
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.content}>
        {filtered.map((p) => (
          <BlogCardTwo
            key={p._id}
            post={{
              title: p.title,
              href: `/blog/${p.slug.current}`,
              date: p.publishedAt,
              excerpt: p.excerpt ?? "",
              imageUrl: p.coverImage
                ? urlFor(p.coverImage).width(800).height(600).fit("crop").url()
                : undefined,
              imageAlt: p.coverImage?.alt ?? p.title,
            }}
          />
        ))}
      </div>
    </section>
  );
}
