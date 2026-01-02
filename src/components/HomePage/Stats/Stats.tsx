import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Stats.module.css";
import Button from "@/components/shared/Button/Button";
import ImageMarquee from "@/components/shared/ImageMarquee/ImageMarquee";

type StatsProps = {
  flipped?: boolean;
};

export default function Stats({ flipped = false }: StatsProps) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={`${styles.content} ${flipped ? styles.flipped : ""}`}>
          <div className={styles.left}>
            <div className={styles.media}>
              <video
                preload='auto'
                autoPlay
                muted
                loop
                playsInline
                className={styles.video}
              >
                <source src='/videos/ladies.mp4' type='video/mp4' />
              </video>
              <div className={styles.imgOverlay} />
            </div>

            <div className={styles.statBox}>
              <div className={styles.statNumber}>250+</div>
              <h4 className={styles.subheading}>Systems deployed worldwide</h4>
              <p className={styles.copy}>
                Our proven track record shows the trust global leaders place in
                Modix to deliver reliable, future-ready industrial systems.
              </p>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.rightTop}>
              <h2 className={styles.heading}>
                We provide global solutions to enhance efficiency and
                sustainability.
              </h2>
              <div className={styles.btnContainer}>
                <Button
                  href='/book'
                  text='Book your Ride'
                  btnType='underlinedWhite'
                  arrow
                />
              </div>
            </div>

            <ImageMarquee />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
