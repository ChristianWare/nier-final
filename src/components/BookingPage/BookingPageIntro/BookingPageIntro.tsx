import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./BookingPageIntro.module.css";
import Img1 from "../../../../public/images/other/booking1.jpg";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";

export default function BookingPageIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.hero}>
          <Image
            src={Img1}
            alt='Booking with Nier Transportation'
            title='Booking with Nier Transportation'
            fill
            priority
            className={styles.img}
          />
          <div className={styles.overlay} />
          <div className={styles.content}>
            <SectionHeading text='Nier Transportation' color='cream' dot />
            <h1 className={styles.heading}>Book a black car in Phoenix</h1>
            <p className={styles.copy}>
              Get an instant flat-rate quote for a sedan, SUV or Sprinter. A
              dispatcher confirms your ride and emails a secure payment link.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
