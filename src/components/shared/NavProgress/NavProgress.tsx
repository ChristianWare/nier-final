"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navProgress } from "./navProgress";
import styles from "./NavProgress.module.css";

const SHOW_AFTER_MS = 120; // quick updates never flash the bar
const GIVE_UP_MS = 15_000;

/**
 * A thin red bar along the bottom of the nav while a page is loading. It
 * grows from left to right: quickly at first, then slowing as it nears the
 * end, and fills the rest the moment the new page arrives. (A page load
 * doesn't report real progress, so this shows "working" and "done".)
 */
export default function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let trickle: ReturnType<typeof setInterval> | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let progress = 0;
    let visible = false;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const set = (p: number) => {
      progress = p;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const clear = () => {
      clearTimeout(showTimer);
      clearInterval(trickle);
      clearTimeout(giveUp);
      clearTimeout(hideTimer);
    };

    const begin = () => {
      clear();
      giveUp = setTimeout(() => navProgress.done(), GIVE_UP_MS);
      showTimer = setTimeout(() => {
        const el = bar.current;
        if (!el) return;
        visible = true;
        el.hidden = false;
        el.style.opacity = "1";
        document.documentElement.dataset.navLoading = "1";
        if (reduce) return set(1);
        set(0.2);
        trickle = setInterval(
          () => set(progress + (0.9 - progress) * 0.12),
          300,
        );
      }, SHOW_AFTER_MS);
    };

    const finish = () => {
      clear();
      delete document.documentElement.dataset.navLoading;
      const el = bar.current;
      if (!el || !visible) {
        set(0);
        return;
      }
      set(1);
      hideTimer = setTimeout(() => {
        el.style.opacity = "0";
        hideTimer = setTimeout(() => {
          visible = false;
          el.hidden = true;
          set(0);
        }, 300);
      }, 200);
    };

    const unsubscribe = navProgress.subscribe((on) =>
      on ? begin() : finish(),
    );

    // Clicking a link to another page in the site starts the bar too.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !a ||
        (a.target && a.target !== "_self") ||
        a.hasAttribute("download")
      ) {
        return;
      }
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return; // same page (or just a #section on it)
      }
      // Downloads and API calls don't load a new page.
      if (
        url.pathname.startsWith("/api/") ||
        url.pathname.endsWith("/export")
      ) {
        return;
      }
      navProgress.start();
    };
    document.addEventListener("click", onClick, true);

    return () => {
      unsubscribe();
      clear();
      document.removeEventListener("click", onClick, true);
      delete document.documentElement.dataset.navLoading;
    };
  }, []);

  // The new page (or new filters) is on screen.
  useEffect(() => {
    navProgress.done();
  }, [pathname, search]);

  return (
    <div
      ref={bar}
      className={styles.bar}
      role='progressbar'
      aria-label='Loading'
      hidden
    />
  );
}
