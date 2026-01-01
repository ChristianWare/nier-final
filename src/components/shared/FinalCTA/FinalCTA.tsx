import Button from "../Button/Button";
import LayoutWrapper from "../LayoutWrapper";
import SectionHeading from "../SectionHeading/SectionHeading";
import styles from "./FinalCTA.module.css";
import Image from "next/image";
import Img1 from "../../../../public/images/airport2.jpg";

export default function FinalCTA() {
  return (
    <section className={styles.parent}>
      <div className={styles.container}>
        <div className={styles.left}>
          <LayoutWrapper>
            <div className={styles.content}>
              <div className={styles.top}>
                <SectionHeading text='Contat Us' />
                <h2 className={`${styles.heading} h1`}>
                  Take the first step toward an elevated travel experience.
                </h2>
                <p className={`${styles.copy} h4`}>
                  Schedule your ride today and experience the comfort and
                  reliability of our premium black car service.
                </p>
              </div>
              <div className={styles.bottom}>
                <div className={styles.btnContainer}>
                  <Button
                    as='span'
                    text='Contact Us'
                    btnType='underlinedWhite'
                    arrow
                  />
                </div>
              </div>
            </div>
          </LayoutWrapper>
        </div>
        <div className={styles.right}>
          <div className={styles.imgContainer}>
            <Image src={Img1} fill alt='Airport Ride' className={styles.img} />
          </div>
        </div>
      </div>
    </section>
  );
}
