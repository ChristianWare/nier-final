// Related pages as cards, laid out like CharterBenefits: the heading on the
// left, a grid of icon cards on the right. Each card is a link.

import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Donut from "@/components/shared/icons/Donut/Donut";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";
import Cups from "@/components/shared/icons/Cups/Cups";
import SquareCircle from "@/components/shared/icons/SquareCircle/SquareCircle";
import styles from "./CharterMoreLinks.module.css";

const ICONS = [Donut, Sparkle, Cups, SquareCircle];

export default function CharterMoreLinks({
  eyebrow,
  heading,
  copy,
  links,
}: {
  eyebrow: string;
  heading: string;
  copy: string;
  links: { label: string; href: string; copy: string }[];
}) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.header}>
            <SectionHeading text={eyebrow} color='red' />
            <h2 className={`${styles.heading} h3`}>{heading}</h2>
            <p className={styles.subheading}>{copy}</p>
          </div>
          <div className={styles.grid}>
            {links.map((l, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <Link key={l.href} href={l.href} className={styles.card}>
                  <div className={styles.iconContainer}>
                    <Icon className={styles.icon} />
                  </div>
                  <h3 className={`${styles.cardTitle} h4`}>{l.label}</h3>
                  <p className={styles.cardCopy}>{l.copy}</p>
                  <span className={styles.more}>Read more →</span>
                </Link>
              );
            })}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
