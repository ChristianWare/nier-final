import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhyCorporate.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
// import Button from "@/components/shared/Button/Button";

export default function WhyCorporate() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <SectionHeading
            text='Built for Businesses That Move People'
            color='red'
            dot
          />
          <h2 className={styles.heading}>
            Whether you&apos;re coordinating airport pickups for executives,
            transporting clients, or managing event logistics — a corporate
            account keeps everything organized under one roof.
          </h2>
          {/* <div className={styles.btnContainer}>
            <Button text='Learn More' btnType='black' href={"/about"} arrow />
          </div> */}
        </div>
      </LayoutWrapper>
    </section>
  );
}
