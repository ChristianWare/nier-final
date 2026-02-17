"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import styles from "../BlogPageIntro/BlogPageIntro.module.css";

export default function BlogSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const updateURL = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  // Debounce: update URL 300ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, updateURL]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      updateURL(query);
    }
  }

  return (
    <div className={styles.searchBar}>
      <input
        type='text'
        placeholder='Search the blog'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className={styles.searchInput}
      />
      <button
        type='button'
        onClick={() => setQuery("")}
        className={styles.clearBtn}
        aria-label='Clear search'
        style={{ visibility: query ? "visible" : "hidden" }}
      >
        &times;
      </button>
    </div>
  );
}
