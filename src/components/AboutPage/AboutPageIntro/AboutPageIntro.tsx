import styles from "./AboutPageIntro.module.css";
import Button from "@/components/shared/Button/Button";
import Marquee from "@/components/shared/Marquee/Marquee";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function AboutPageIntro() {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.left}>
          <div className={styles.leftContent}>
            <div className={styles.top}>
              <SectionHeading text='Nier Transportation' dot />
              <h1 className={`${styles.heading} h2`}>
                {/* We&apos;ve been at the forefront of the travel industry for over
                a decade.{" "} */}
                Nier Transportation is a black car company serving the Phoenix -
                metro area.
              </h1>
              <p className={styles.copy}>
                {/* At Nier Transportation, we are passionate about connecting
                travelers with unforgettable experiences. */}
                We’re more than a car service; we’re
                your trusted partner in high end transportation.
              </p>
              <div className={styles.btnContainer}>
                <Button
                  text='Book your ride'
                  btnType='red'
                  href='/contact'
                  arrow
                />
                <Button
                  text='Our Solutions'
                  btnType='cream'
                  href='/services'
                  arrow
                />
              </div>
            </div>
            <div className={styles.bottom}>
              <p className={styles.bottomCopy}>
                Our commitment to excellence and innovation has made us a
                trusted partner for travelers worldwide.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <video
            preload='auto'
            autoPlay
            muted
            loop
            playsInline
            className={styles.video}
          >
            <source src='/videos/about.mp4' type='video/mp4' />
          </video>

          <div className={styles.videoOverlay} />

          <div className={styles.marqueeWrap}>
            <Marquee
              words={[
                "Nier",
                "Transportation",
                "Nier",
                "Transportation",
                "Nier",
                "Transportation",
              ]}
              speedSeconds={90}
              background='none'
              color='cream'
            />
          </div>
        </div>
      </div>
    </section>
  );
}
