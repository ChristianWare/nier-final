"use client";

// A dashboard's navigation on tablets and phones (1068px and below), where
// it replaces the side nav: a bar fixed along the bottom of the screen with
// the main pages and More. More opens a sheet from the bottom with the
// rest, the person's other dashboards and Log out. The current page is in
// the accent, as on desktop.

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import {
  activePortalHref,
  type PortalExtraLink,
  type PortalNavItem,
} from "./portalNav";
import styles from "./PortalBottomBar.module.css";

type Props = {
  /** Every page, in order. */
  items: PortalNavItem[];
  /** The pages that get a tab (four); the rest go under More. */
  tabKeys: string[];
  rootHref: string;
  label: string;
  extraLinks?: PortalExtraLink[];
  /** Pages with their own bar at the bottom, where this one stays away. */
  hideOn?: RegExp;
};

export default function PortalBottomBar({
  items,
  tabKeys,
  rootHref,
  label,
  extraLinks = [],
  hideOn,
}: Props) {
  const pathname = usePathname() ?? "";

  // The sheet is open only on the page it was opened on, so following a
  // link in it closes it.
  const [sheetOpenOn, setSheetOpenOn] = useState<string | null>(null);
  const sheetOpen = sheetOpenOn === pathname;
  const closeSheet = () => setSheetOpenOn(null);

  const tabs = items.filter((i) => tabKeys.includes(i.key));
  const more = items.filter((i) => !tabKeys.includes(i.key));
  const activeHref = activePortalHref(
    pathname,
    items.map((i) => i.href),
    rootHref,
  );
  const isActive = (href: string) => href === activeHref;
  const moreActive = more.some((i) => isActive(i.href));
  const moreBadge = more.reduce((n, i) => n + (i.badge ?? 0), 0);

  // Escape closes the sheet; the page behind it doesn't scroll.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpenOn(null);
    };
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  if (hideOn?.test(pathname)) return null;

  return (
    <>
      <nav className={styles.bar} aria-label={label} data-portal-bar>
        <ul className={styles.tabs}>
          {tabs.map((t) => {
            const active = isActive(t.href);
            return (
              <li key={t.key}>
                <Link
                  href={t.href}
                  className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={styles.icon} aria-hidden='true'>
                    {t.icon}
                    {t.badge && t.badge > 0 ? (
                      <span className={styles.badge}>
                        <BadgeCount value={t.badge} max={99} />
                      </span>
                    ) : null}
                  </span>
                  {t.short}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type='button'
              className={`${styles.tab} ${moreActive || sheetOpen ? styles.tabActive : ""}`}
              onClick={() => setSheetOpenOn(sheetOpen ? null : pathname)}
              aria-expanded={sheetOpen}
              aria-controls='portal-more'
            >
              <span className={styles.icon} aria-hidden='true'>
                <span className={styles.dots}>
                  <span />
                  <span />
                  <span />
                </span>
                {moreBadge > 0 ? (
                  <span className={styles.badge}>
                    <BadgeCount value={moreBadge} max={99} />
                  </span>
                ) : null}
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      {/* More: a sheet up from the bottom, over a dimmed page. */}
      <div
        className={`${styles.overlay} ${sheetOpen ? styles.overlayOpen : ""}`}
        onClick={closeSheet}
        aria-hidden='true'
      />
      <div
        id='portal-more'
        className={`${styles.sheet} ${sheetOpen ? styles.sheetOpen : ""}`}
        role='dialog'
        aria-modal='true'
        aria-label='More'
        aria-hidden={!sheetOpen}
        inert={!sheetOpen}
      >
        <span className={styles.handle} aria-hidden='true' />
        <ul className={styles.sheetLinks}>
          {more.map((m) => {
            const active = isActive(m.href);
            return (
              <li key={m.key}>
                <Link
                  href={m.href}
                  className={`${styles.sheetLink} ${active ? styles.sheetLinkActive : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={closeSheet}
                >
                  <span className={styles.sheetIcon} aria-hidden='true'>
                    {m.icon}
                  </span>
                  {m.title}
                  {m.badge && m.badge > 0 ? (
                    <BadgeCount value={m.badge} max={99} />
                  ) : null}
                  <Arrow className={styles.sheetArrow} aria-hidden='true' />
                </Link>
              </li>
            );
          })}
          {extraLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={styles.sheetLink}
                onClick={closeSheet}
              >
                <span className={styles.sheetIcon} aria-hidden='true' />
                {l.title}
                <Arrow className={styles.sheetArrow} aria-hidden='true' />
              </Link>
            </li>
          ))}
        </ul>
        <button
          type='button'
          className={styles.logOut}
          onClick={() => {
            closeSheet();
            signOut();
          }}
        >
          Log out
        </button>
      </div>
    </>
  );
}
