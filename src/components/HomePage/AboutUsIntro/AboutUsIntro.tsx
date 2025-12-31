import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AboutUsIntro.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Donut from "@/components/shared/icons/Donut/Donut";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";
import Cups from "@/components/shared/icons/Cups/Cups";
import SquareCircle from "@/components/shared/icons/SquareCircle/SquareCircle";

const data = [
  {
    id: 1,
    title: "Punctuality Guaranteed",
    description: "15‑minute on‑time guarantee or the first hour is free.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 2,
    title: "Professional Chauffeurs",
    description:
      "Uniformed, background‑checked, and trained in discreet service.",
    icon: <Sparkle className={styles.icon} />,
  },
  {
    id: 3,
    title: "Luxury Fleet",
    description:
      "Late‑model sedans, SUVs, and Sprinters maintained above DOT standards.",
    icon: <Cups className={styles.icon} />,
  },
  {
    id: 4,
    title: "24/7 Customer Support",
    description:
      "Available for booking changes, questions, or last-minute requests.",
    icon: <SquareCircle className={styles.icon} />,
  },
];

export default function AboutUsIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.l1}>
              <SectionHeading text='About Us' dot />
            </div>
            <div className={styles.l2}>
              <h2 className={styles.heading}>
                For over 20 years, we&apos;ve provided the best car service in
                Arizona.
              </h2>
              <p className={styles.copy}>
                Founded in 2004, Nier Transportation was born out of a passion
                for delivering exceptional transportation experiences.
              </p>
              <div className={styles.btnContanier}>
                <Button btnType='black' text='Book your ride' arrow />
              </div>
            </div>
          </div>
          <div className={styles.right}>
            <SectionHeading text='Why ride with us?' dot />
            <br />
            <div className={styles.mapDataContainer}>
              {data.map((item) => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardLeft}>
                    <div className={styles.iconContainer}>{item.icon}</div>
                  </div>
                  <div className={styles.cardRight}>
                    <h3 className={styles.title}>{item.title}</h3>
                    <p className={styles.desc}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
