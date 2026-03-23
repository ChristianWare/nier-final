"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BlogPostPage.module.css";

type Heading = { text: string; id: string };

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const headingElements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    // Track which headings are visible and pick the topmost one
    const visibleHeadings = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleHeadings.add(entry.target.id);
          } else {
            visibleHeadings.delete(entry.target.id);
          }
        });

        // Pick the first heading (in DOM order) that is currently visible
        if (visibleHeadings.size > 0) {
          const firstVisible = headingElements.find((el) =>
            visibleHeadings.has(el.id),
          );
          if (firstVisible) setActiveId(firstVisible.id);
        } else {
          // Nothing visible — find the last heading that scrolled past
          const scrollY = window.scrollY + 140;
          let lastPassed = "";
          for (const el of headingElements) {
            if (el.offsetTop <= scrollY) {
              lastPassed = el.id;
            }
          }
          if (lastPassed) setActiveId(lastPassed);
        }
      },
      {
        rootMargin: "-120px 0px -60% 0px",
        threshold: 0,
      },
    );

    headingElements.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className={styles.toc}>
      <span className={styles.tocTitle}>Table of contents</span>
      <ul className={styles.tocList}>
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`${styles.tocLink} ${activeId === h.id ? styles.tocLinkActive : ""}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(h.id);
                if (el) {
                  const offset = 110;
                  const top =
                    el.getBoundingClientRect().top + window.scrollY - offset;
                  window.scrollTo({ top, behavior: "smooth" });
                }
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
