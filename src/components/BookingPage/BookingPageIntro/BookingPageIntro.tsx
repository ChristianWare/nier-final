import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./BookingPageIntro.module.css";
import Img1 from "../../../../public/images/BookingPage/booking1.jpg";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function BookingPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.hero}>
          <Image
            src={Img1}
            alt=''
            title=''
            fill
            priority
            className={styles.img}
          />
          <div className={styles.overlay} />
          <div className={styles.content}>
            <SectionHeading text='Nier Transportation' color='cream' dot />
            <h1 className={styles.heading}>Book A ride </h1>
            {/* <p className={styles.copy}>
              Request a ride. A dispatcher will confirm and send a payment link.
            </p> */}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
