import styles from "./FleetPageIntro.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function FleetPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <SectionHeading text='Our Fleet' />
          <h1 className={styles.heading}>
            Comfortable, impeccably maintained vehicles for all your needs.
          </h1>
          <p className={styles.copy}>
            From executive sedans to extended SUVs and premium Sprinters, every
            vehicle in our fleet is selected for ride quality, luggage capacity,
            and in-cabin comfort.
          </p>
          <div className={styles.btnContainer}>
            <Button
              href='/book'
              text='Book your Ride'
              btnType='underlinedBlack'
              arrow
            />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
