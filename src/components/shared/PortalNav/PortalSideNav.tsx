"use client";

// A dashboard's side nav on desktop: the pages in groups, the current one
// in the accent, then links to the person's other dashboards and Sign out.
// While a page loads, the panel shows a pulse so a second tap doesn't
// queue another. At 1068px and below the layout hides it and
// PortalBottomBar takes over.

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";
import LoadingPulse from "@/components/shared/LoadingPulse/LoadingPulse";
import {
  activePortalHref,
  type PortalExtraLink,
  type PortalNavGroup,
} from "./portalNav";
import styles from "./PortalSideNav.module.css";

type Props = {
  groups: PortalNavGroup[];
  /** The dashboard's home, e.g. "/dashboard". */
  rootHref: string;
  label: string;
  extraLinks?: PortalExtraLink[];
};

export default function PortalSideNav({
  groups,
  rootHref,
  label,
  extraLinks = [],
}: Props) {
  const pathname = usePathname() ?? "";
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const navigating = navigatingTo !== null && navigatingTo !== pathname;
  const activeHref = activePortalHref(
    pathname,
    groups.flatMap((g) => g.items.map((i) => i.href)),
    rootHref,
  );

  // The new page has arrived: drop the pulse.
  useEffect(() => {
    const t = setTimeout(() => setNavigatingTo(null), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <nav
      className={`${styles.container} ${navigating ? styles.navigating : ""}`}
      aria-label={label}
    >
      {navigating && (
        <div className={styles.loadingOverlay}>
          <LoadingPulse />
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <p className={styles.groupLabel}>{group.label}</p>
          <ul className={styles.group}>
            {group.items.map((item) => {
              const active = item.href === activeHref;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      if (!active) setNavigatingTo(item.href);
                    }}
                  >
                    <span className={styles.navIcon} aria-hidden='true'>
                      {item.icon}
                    </span>
                    <span className={styles.title}>{item.title}</span>
                    {item.badge && item.badge > 0 ? (
                      <BadgeCount value={item.badge} max={99} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className={styles.actions}>
        {extraLinks.map((l) => (
          <Link key={l.href} href={l.href} className={styles.actionBtn}>
            {l.title} <Arrow className={styles.arrow} aria-hidden='true' />
          </Link>
        ))}
        <button
          type='button'
          className={styles.actionBtn}
          onClick={() => signOut()}
        >
          Sign out <Arrow className={styles.arrow} aria-hidden='true' />
        </button>
      </div>
    </nav>
  );
}
