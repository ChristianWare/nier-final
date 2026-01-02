import styles from "./ServicesMission.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

export default function ServicesMission() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <SectionHeading text='Mission' color='red' />
          <h2 className={styles.heading}>
            Our mission is to provide a seamless booking experience that allows
            our clients to focus on what truly matters – their journey.
          </h2>
          <div className={styles.btnContainer}>
            <Button text='Learn More' btnType='black' href={"/about"} arrow />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
