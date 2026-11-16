"use client";

// How far down the page you are, in the bottom-right corner: a circle whose
// red border grows clockwise as you scroll, with the percentage inside. At
// the bottom the number turns into an up-arrow and a click takes you back
// to the top.
//
// It fades in once you've scrolled a little and stays away on pages too
// short to scroll. Not on the dashboards, admin or booking pages, which
// have their own bars along the bottom.
//
// The ring and the number are updated directly, once a frame while you
// scroll, so scrolling doesn't re-render the component.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import styles from "./ScrollProgress.module.css";

/** Pages it stays off (and everything under them). */
const HIDDEN_ON = [
  "/admin",
  "/dashboard",
  "/driver-dashboard",
  "/corporate",
  "/account",
  "/book",
  "/pay",
  "/studio",
];

const R = 22;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function ScrollProgress() {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_ON.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const [shown, setShown] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const arcRef = useRef<SVGCircleElement | null>(null);
  const numRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (hidden) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (arcRef.current)
        arcRef.current.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - p));
      if (numRef.current)
        numRef.current.textContent = `${Math.round(p * 100)}%`;
      setShown(max > 200 && window.scrollY > 80);
      setAtBottom(p >= 0.99);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The page can grow after load (images, maps, content below the fold).
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, [hidden, pathname]);

  if (hidden) return null;

  const toTop = () => {
    const instant = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: instant ? "auto" : "smooth" });
  };

  return (
    <button
      type='button'
      className={`${styles.circle} ${shown ? styles.shown : ""} ${atBottom ? styles.atBottom : ""}`}
      // Not `disabled`: it stops being "at the bottom" the moment the page
      // starts scrolling up, and disabling the focused button there would
      // cut the scroll short.
      onClick={atBottom ? toTop : undefined}
      aria-disabled={!atBottom}
      aria-label={atBottom ? "Back to top" : "How far down the page you are"}
      aria-hidden={!shown}
      tabIndex={shown && atBottom ? 0 : -1}
    >
      <svg className={styles.ring} viewBox='0 0 52 52' aria-hidden='true'>
        <circle className={styles.track} cx='26' cy='26' r={R} />
        <circle
          ref={arcRef}
          className={styles.arc}
          cx='26'
          cy='26'
          r={R}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <span ref={numRef} className={styles.num} aria-hidden='true'>
        0%
      </span>
      <Arrow className={styles.arrow} aria-hidden='true' />
    </button>
  );
}
