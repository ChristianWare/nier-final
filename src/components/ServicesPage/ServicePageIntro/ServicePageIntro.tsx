import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ServicePageIntro.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/services.jpg";
import Img2 from "../../../../public/images/linda.jpg";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function ServicePageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text='services' dot />
              <h1 className={styles.heading}>
                Chauffeur services
                <br className={styles.br} /> tailored to every journey.
              </h1>
              <p className={styles.copy}>
                Whether it&lsquo;s airport transfers, corporate travel, or
                special events, we ensure a seamless and comfortable ride every
                time.
              </p>
            </div>
            <div className={styles.right}>
              <div className={styles.statBox}>
                <div className={`${styles.stat} h6`}>
                  &ldquo;Have used this service multiple times. The drivers are
                  great. Always very professional and prompt. You can tell they
                  care about safety and a great customer experience, would
                  definitely recommend it.&rdquo;
                </div>
                {/* <div className={styles.statii}>Years of experience</div> */}

                <div className={styles.statiii}>
                  <Image
                    src={Img2}
                    alt='hero image'
                    width={60}
                    height={60}
                    className={styles.imgSmall}
                  />
                  <div className={styles.statiiiText}>— Illeana L.</div>
                </div>
              </div>
              <div className={styles.imgContainer}>
                <Image
                  src={Img1}
                  alt='hero image'
                  className={styles.img}
                  priority
                  fill
                />
              </div>
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.imgContainer}>
              <Image
                src={Img1}
                alt='hero image'
                className={styles.img}
                priority
                fill
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
