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
          <Marquee
            words={[
              "Direct booking websites",
              "Stripe deposits",
              "SMS reminders",
              "Premium design",
              "Fast launch",
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
                <p className={styles.copy}>
                  At Nier Transportation, we’re more than a car service; we’re
                  your trusted partner in high end transportation.
                </p>
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
                  Nier Transportation is a black car service company across
                  phoenix &amp; beyond.
                </h1>
              </div>
            </div>

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
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
