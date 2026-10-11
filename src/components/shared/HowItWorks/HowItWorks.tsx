import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./HowItWorks.module.css";

import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export type HowItWorksStep = { title: string; description: string };

const defaultSteps: HowItWorksStep[] = [
  {
    title: "Choose Your Ride",
    description:
      "Browse our wide selection of vehicles and choose the one that suits your needs and budget.",
  },
  {
    title: "Book Your Ride",
    description:
      "Select your pickup location, date, and time, then confirm your booking with just a few clicks.",
  },
  {
    title: "Enjoy Your Journey",
    description:
      "Sit back, relax, and enjoy your ride. Our professional drivers will ensure you reach your destination safely and on time.",
  },
];

/**
 * Three staggered step cards under a centered heading. Most pages use the
 * defaults (booking steps); other pages pass their own words.
 */
export default function HowItWorks({
  eyebrow = "How It Works",
  heading,
  cta = { text: "Book your ride", href: "/book" },
  steps = defaultSteps,
  headingTag: HeadingTag = "h3",
}: {
  eyebrow?: string;
  /** Defaults to the booking-steps heading. */
  heading?: string;
  cta?: { text: string; href: string };
  steps?: readonly HowItWorksStep[];
  /** "h2" when this is a main section of the page. Looks the same either way. */
  headingTag?: "h2" | "h3";
}) {
  return (
    <div className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text={eyebrow} dot />
            <HeadingTag className={`${styles.heading} h3`}>
              {heading ?? (
                <>
                  Book your ride in just three simple steps – <br /> it&#39;s
                  fast, easy, and hassle-free!
                </>
              )}
            </HeadingTag>
            <div className={styles.btnClusterContainer}>
              <Button href={cta.href} text={cta.text} btnType='red' arrow />
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.mapDataContainer}>
              {steps.map((item, i) => (
                <div key={item.title} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={`${styles.index} stat`}>0{i + 1}</span>
                  </div>
                  <div className={styles.cardBottom}>
                    <h4 className={styles.title}>{item.title}</h4>
                    <p className={styles.desc}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </div>
  );
}
