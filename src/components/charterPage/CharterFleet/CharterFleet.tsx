import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./CharterFleet.module.css";

import { fleetDataii } from "@/lib/data";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export default function CharterFleet() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <h2 className={styles.heading}>Our Charter Bus Fleet</h2>
          <p className={styles.copy}>
            From our 56-passenger full-size coach bus with onboard restroom and
            entertainment to minibus options for smaller groups — every vehicle
            is maintained above DOT standards and ready to move your group
            across Phoenix on schedule.
          </p>
        </div>
        <div className={styles.content}>
          {fleetDataii.map((x) => (
            <div className={styles.card} key={x.id}>
              <div className={styles.left}>
                <h3 className={`${styles.title} cardTitle h4`}>{x.title}</h3>{" "}
                <SectionHeading text='Available' dot />
                <div className={styles.imgContainer}>
                  <Image
                    src={x.src}
                    fill
                    alt='Charter bus rental Phoenix — Nier Transportation'
                    title='Charter bus rental Phoenix — Nier Transportation'
                    className={styles.img}
                  />
                </div>
              </div>
              <div className={styles.right}>
                <div className={styles.featureContainer}>
                  <p className={styles.detail}>{x.desc}</p>
                </div>
                <div className={styles.featureContainer}>
                  <span className={styles.feature}>Seats:</span>
                  <p className={styles.detail}>{x.seats}</p>
                </div>
                <div className={styles.featureContainer}>
                  <span className={styles.feature}>Cargo:</span>
                  <p className={styles.detail}>{x.cargo}</p>
                </div>

                <div className={styles.btnContainer}>
                  <Button
                    href={`/fleet/${x.slug}`}
                    btnType='black'
                    text='More Details'
                    arrow
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </LayoutWrapper>
    </section>
  );
}
