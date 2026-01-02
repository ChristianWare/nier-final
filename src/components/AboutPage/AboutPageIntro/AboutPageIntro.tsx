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
              <SectionHeading text='About us' dot />
              <h1 className={styles.heading}>
                We&apos;ve been at the forefront of the travel industry for over a
                decade.{" "}
              </h1>
              <p className={styles.copy}>
                At Nier Transportation, we are passionate about connecting
                travelers with unforgettable experiences.
              </p>
              <div className={styles.btnContainer}>
                <Button
                  text='Get in touch'
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
                "Phoenix",
                "Scottsdale",
                "Mesa",
                "Chandler",
                "Goodyear",
                "Peoria",
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
