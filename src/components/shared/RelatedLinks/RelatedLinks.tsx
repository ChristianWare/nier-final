import Link from "next/link";
import LayoutWrapper from "../LayoutWrapper";
import styles from "./RelatedLinks.module.css";

export type RelatedLink = {
  label: string;
  href: string;
};

export default function RelatedLinks({
  title,
  links,
}: {
  title: string;
  links: RelatedLink[];
}) {
  if (!links.length) return null;

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <h2 className={`${styles.title} h5`}>{title}</h2>
        <ul className={styles.list}>
          {links.map((link) => (
            <li key={link.href} className={styles.item}>
              <Link href={link.href} className={styles.link}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </LayoutWrapper>
    </section>
  );
}
