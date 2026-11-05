// The "why groups charter here" section, laid out like the location pages'
// LocationCityTopServices: a tall photo on the left, the heading, a lead
// line and short titled points on the right.

import Image, { type StaticImageData } from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import styles from "./CharterWhy.module.css";

export default function CharterWhy({
  eyebrow,
  heading,
  lead,
  points,
  image,
  imageAlt,
}: {
  eyebrow: string;
  heading: string;
  lead: string;
  points: { title: string; copy: string }[];
  image: StaticImageData;
  imageAlt: string;
}) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.grid}>
          <div className={styles.imgContainer}>
            <Image
              src={image}
              alt={imageAlt}
              title={imageAlt}
              fill
              className={styles.img}
              placeholder='blur'
            />
          </div>

          <div className={styles.right}>
            <SectionHeading text={eyebrow} dot />
            <h2 className={styles.heading}>{heading}</h2>
            <p className={styles.copy}>{lead}</p>
            <div className={styles.features}>
              {points.map((p) => (
                <div key={p.title} className={styles.feature}>
                  <SectionHeading text={p.title} dot />
                  <p className={styles.featureCopy}>{p.copy}</p>
                </div>
              ))}
            </div>
            <div className={styles.btnContainer}>
              <Button href='/book' text='See Your Price' btnType='red' arrow />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
