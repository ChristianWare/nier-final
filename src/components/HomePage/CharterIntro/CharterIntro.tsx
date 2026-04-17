import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./CharterIntro.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export default function CharterIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Charter Bus Rental Phoenix' dot />
            <h2 className={`${styles.heading} h1`}>
              Phoenix charter bus rental: Nier Transportation&apos;s premier
              charter bus rental service in AZ
            </h2>
            <p className={styles.copy}>
              When your group needs to move through the Valley in comfort,
              style, and on schedule, Nier Transportation delivers the charter
              bus rental in Phoenix that gets it done right. Since 2004,
              we&apos;ve been the trusted name in luxury group transportation
              across the Phoenix metro area — and our 56-passenger charter bus
              is the flagship of our fleet. Whether you&apos;re coordinating a
              corporate outing, planning a wedding shuttle, or organizing a
              school trip, you&apos;ll find everything you need to know right
              here — and by the end, you&apos;ll be ready to book.
            </p>
            <div className={styles.btnContainer}>
              <Button
                href='/charter'
                text='More Charter Details'
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
