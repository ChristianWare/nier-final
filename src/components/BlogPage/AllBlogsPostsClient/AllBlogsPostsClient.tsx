// components/BlogPage/AllBlogsPostsClient/AllBlogsPostsClient.tsx
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
    [tags],
  );

  const initialSlug =
    searchParams.get("tag") &&
    (searchParams.get("tag") === "all" ||
      tags.some((t) => t.slug.current === searchParams.get("tag")))
      ? (searchParams.get("tag") as string)
      : "all";

  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);

  // Read search query from URL
  const searchQuery = searchParams.get("q")?.toLowerCase().trim() ?? "";

  const filtered = useMemo(() => {
    let result = posts;

    // Filter by tag
    if (selectedSlug !== "all") {
      result = result.filter((p) =>
        p.tags?.some((t) => t.slug.current === selectedSlug),
      );
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter((p) => {
        const title = p.title.toLowerCase();
        const excerpt = (p.excerpt ?? "").toLowerCase();
        const postTags = (p.tags ?? [])
          .map((t) => t.name.toLowerCase())
          .join(" ");
        return (
          title.includes(searchQuery) ||
          excerpt.includes(searchQuery) ||
          postTags.includes(searchQuery)
        );
      });
    }

    return result;
  }, [posts, selectedSlug, searchQuery]);

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

      {searchQuery && (
        <p className={styles.searchStatus}>
          {filtered.length === 0
            ? `No posts found for "${searchParams.get("q")}"`
            : `${filtered.length} post${filtered.length === 1 ? "" : "s"} found for "${searchParams.get("q")}"`}
        </p>
      )}

      <div className={styles.content}>
        {filtered.map((p) => (
          <div className={styles.cardContainer} key={p._id}>
            <BlogCardTwo
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
          </div>
        ))}
      </div>
    </section>
  );
}
