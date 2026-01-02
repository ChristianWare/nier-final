import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./FleetPostHero.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Stats from "@/components/HomePage/Stats/Stats";

export default function FleetPostHero() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.left}>
              <SectionHeading text='Explore Our Fleet' dot />
            </div>
            <div className={styles.right}>
              <h2 className={styles.heading}>
                Our fleet is maintained for top safety, comfort, and
                performance.
              </h2>
              <p className={styles.copy}>
                Each vehicle is thoroughly inspected and cleaned before every
                ride, guaranteeing a pristine environment for our clients. We
                take pride in offering a diverse selection of vehicles to cater
                to various preferences and needs, from sleek sedans to spacious
                SUVs and luxurious vans.
              </p>
            </div>
          </div>
        </div>
      </LayoutWrapper>
      <Stats flipped />
    </section>
  );
}
