// One service as a card, in the same design as the fleet cards (HomePage
// Fleet): the name in a cream title box, "Available 24/7", the photo, the
// short copy, two of its highlights as rows with a rule between, and a
// full-width black button to the service's page.
//
// Used by ServicesPreview (home, /services, the service pages) and the
// city pages' services grid.

import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import type { ServiceShape } from "@/lib/services";
import styles from "./ServiceCard.module.css";

export default function ServiceCard({ service: x }: { service: ServiceShape }) {
  const highlights = (x.features ?? []).slice(0, 2);

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <h3 className={`${styles.title} cardTitle h4`}>{x.title}</h3>
        <SectionHeading text='Available 24/7' dot />
        {x.src ? (
          <div className={styles.imgContainer}>
            <Image
              src={x.src}
              alt={x.title}
              title={x.title}
              fill
              className={styles.img}
              sizes='(max-width: 768px) 100vw, (max-width: 1268px) 50vw, 33vw'
            />
          </div>
        ) : null}
      </div>

      <div className={styles.right}>
        <div className={styles.featureContainer}>
          <p className={styles.detail}>{x.copy}</p>
        </div>
        {highlights.map((f, i) => (
          <div
            key={`${x.slug}-${String(f.id)}-${i}`}
            className={styles.featureContainer}
          >
            <span className={styles.feature}>{f.title}:</span>
            <p className={`${styles.detail} ${styles.clamp}`}>{f.details}</p>
          </div>
        ))}

        <div className={styles.btnContainer}>
          <Button
            href={`/services/${x.slug}`}
            btnType='black'
            text='Learn More'
            arrow
          />
        </div>
      </div>
    </div>
  );
}
