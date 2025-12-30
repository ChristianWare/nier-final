import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Hero.module.css";

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
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.contentChildren}>
            <h1 className={styles.heading}>
              Reliable black car service <br className={styles.br} /> across
              phoenix &amp; beyond.
            </h1>
            <p className={styles.copy}>
              At Nier Transportation, we’re more than a car service; we’re your
              trusted partner in high end transportation.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
