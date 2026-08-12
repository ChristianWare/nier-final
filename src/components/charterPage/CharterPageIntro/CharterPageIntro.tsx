import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./CharterPageIntro.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export default function CharterPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading text='Charter Bus Rental Phoenix' dot />
            <h1 className={styles.heading}>
              Charter Bus & Motor Coach Rental in Phoenix, Arizona
            </h1>
            <p className={styles.copy}>
              When your group needs to move through the Valley in comfort,
              style, and on schedule, Nier Transportation delivers the charter
              bus rental in Phoenix that gets it done right. Since 2004,
              we&apos;ve been the trusted name in luxury group transportation
              across the Phoenix metro area — and our 56-passenger motor coach
              is the flagship of our fleet. Whether you&apos;re coordinating a
              corporate outing, planning a wedding shuttle, or organizing a
              school trip, you&apos;ll find everything you need to know right
              here — and by the end, you&apos;ll be ready to book.
            </p>
            <div className={styles.btnContainer}>
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
