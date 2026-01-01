import Button from "../Button/Button";
import LayoutWrapper from "../LayoutWrapper";
import SectionHeading from "../SectionHeading/SectionHeading";
import styles from "./FinalCTA.module.css";

export default function FinalCTA() {
  return (
    <section className={styles.container}>
      <div className={styles.left}>
        <LayoutWrapper>
          <div className={styles.content}>
            <div className={styles.top}>
              <SectionHeading text='Contat Us' />
              <h2 className={`${styles.heading} h1`}>
                Take the first step toward an elevated travel experience.
              </h2>
            </div>
            <div className={styles.bottom}>
              <p className={`${styles.copy} h4`}>
                Schedule your ride today and experience the comfort and
                reliability of our premium black car service.
              </p>
              <div className={styles.btnContainer}>
                <Button
                  as='span'
                  text='Read More'
                  btnType='underlinedBlack'
                  arrow
                />
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </div>
      <div className={styles.right}></div>
    </section>
  );
}
