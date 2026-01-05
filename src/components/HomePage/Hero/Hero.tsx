import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Hero.module.css";
import Button from "@/components/shared/Button/Button";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Marquee from "@/components/shared/Marquee/Marquee";

export default function Hero() {
  return (
    <section className={styles.container}>
      <div className={styles.media}>
        <video
          preload='auto'
          autoPlay
          muted
          loop
          playsInline
          className={styles.video}
        >
          <source src='/videos/hero.mp4' type='video/mp4' />
        </video>
        <div className={styles.imgOverlay} />
        <div className={styles.marqueeWrap}>
          <div className={styles.cc2}>
            <div className={styles.left2}>
              <p className={styles.copyii}>
                Trusted by manufacturers and logistics leaders with 100+
                successful system deployments worldwide.
              </p>
            </div>
            <div className={styles.right2}>
              <p className={styles.copyii}>Discover more</p>
              <Arrow className={styles.arrow} />
            </div>
          </div>
          <Marquee
            words={[
              "Phoenix",
              "Scottsdale",
              "Mesa",
              "Chandler",
              "Goodyear",
              "Peoria",
            ]}
            speedSeconds={90}
          />
        </div>
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.contentChildren}>
            <div className={styles.cc1}>
              <div className={styles.left}>
                <div className={styles.btnContainerii}>
                  <Button
                    href='/book'
                    text='Book your Ride'
                    btnType='underlinedWhite'
                    arrow
                  />
                </div>
              </div>
              <div className={styles.right}>
                <h1 className={styles.heading}>
                  We&apos;ve been at the forefront of the travel industry for
                  over a decade.
                </h1>
                <p className={styles.copy}>
                  At Nier Transportation, we are passionate about connecting
                  travelers with unforgettable experiences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
