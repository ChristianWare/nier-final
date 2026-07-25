// src/components/shared/Breadcrumbs/Breadcrumbs.tsx
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Breadcrumbs.module.css";

const SITE_URL = "https://www.niertransportation.com";

export type Crumb = {
  /** Visible label, e.g. "Airport Transfers" */
  name: string;
  /** Site-relative path, e.g. "/services/airport-transfers".
   *  Omit on the final (current) crumb so it renders as plain text. */
  href?: string;
};

/**
 * Renders a visible breadcrumb trail plus matching BreadcrumbList JSON-LD.
 * "Home" is prepended automatically — pass only the crumbs after it.
 *
 * Example:
 *   <Breadcrumbs items={[
 *     { name: "Services", href: "/services" },
 *     { name: "Airport Transfers" },
 *   ]} />
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ name: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label='Breadcrumb' className={styles.wrapper}>
        <LayoutWrapper>
          <ol className={styles.list}>
            {trail.map((crumb, i) => {
              const isLast = i === trail.length - 1;
              return (
                <li key={`${crumb.name}-${i}`} className={styles.item}>
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className={styles.link}>
                      {crumb.name}
                    </Link>
                  ) : (
                    <span className={styles.current} aria-current='page'>
                      {crumb.name}
                    </span>
                  )}
                  {!isLast && (
                    <span className={styles.separator} aria-hidden='true'>
                      /
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </LayoutWrapper>
      </nav>
    </>
  );
}
