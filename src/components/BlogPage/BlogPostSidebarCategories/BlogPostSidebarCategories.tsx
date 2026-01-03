/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useMemo, useState } from "react";
import styles from "./BlogPostSidebarCategories.module.css";
import Link from "next/link";

type Tag = { _id: string; name: string; slug?: { current?: string } };

export default function BlogPostSidebarCategories({
  tags,
  initialSlug = "all",
}: {
  tags: Tag[];
  initialSlug?: string;
}) {
  const cleanTags = useMemo(() => tags.filter((t) => t.slug?.current), [tags]);

  const tagOptions = useMemo(
    () => [{ _id: "all", name: "All", slug: { current: "all" } }, ...cleanTags],
    [cleanTags]
  );

  return (
    <div className={styles.tagsSelectWrap}>
      <ul className={styles.tags}>
        {tagOptions.slice(1, 6).map((t) => (
          <li key={t._id} className={styles.tagItem}>
            <Link
              href={
                t.slug?.current === "all"
                  ? "/blog"
                  : `/blog?tag=${t.slug?.current}`
              }
              className={styles.tagLink}
            >
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
