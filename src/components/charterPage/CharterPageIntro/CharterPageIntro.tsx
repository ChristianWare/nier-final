import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./CharterPageIntro.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

import type { ReactNode } from "react";

/**
 * The charter page hero: heading, intro copy, buttons and the bus video.
 * Defaults are the Phoenix page; the Scottsdale page passes its own copy.
 */
export default function CharterPageIntro({
  eyebrow = "Charter Bus Rental Phoenix",
  heading = "Charter Bus & Coach Bus Rental in Phoenix, AZ",
  children,
}: {
  eyebrow?: string;
  heading?: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text={eyebrow} dot />
            <h1 className={styles.heading}>{heading}</h1>
            {children ?? (
              <p className={styles.copy}>
                When your group needs to move through the Valley in comfort,
                style, and on schedule, Nier Transportation delivers the charter
                bus rental in Phoenix that gets it done right, from coach bus
                and motor coach rental for conventions to Arizona charter bus
                trips to Sedona, Tucson and the Grand Canyon. Since 2004,
                we&apos;ve been a trusted name in group transportation across
                the Phoenix metro, with 56-passenger motor coaches, 28- and
                40-passenger mini buses and executive Sprinters. Need more than
                one bus? We send as many as your group needs, on one booking.
                Whether you&apos;re coordinating a corporate outing, a wedding
                shuttle, a game day or a school trip, you&apos;ll find prices,
                bus sizes and trip times right here.
              </p>
            )}
            <div className={styles.btnContainer}>
              <Button
                href='/book'
                text='See Your Price'
                btnType='black'
                arrow
              />
              <Button
                href='/contact'
                text='Get a Free Quote'
                btnType='underlinedBlack'
                arrow
              />
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.media}>
              <video
                preload='none'
                autoPlay
                muted
                loop
                playsInline
                className={styles.video}
              >
                <source src='/videos/bus.mp4' type='video/mp4' />
              </video>
              <div className={styles.imgOverlay} />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
