import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhyCharter.module.css";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Image from "next/image";
import Img1 from "../../../../public/images/azLarge.jpg";

export default function WhyCharter() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <SectionHeading
              text='What Is a Charter Bus Rental?'
              color='red'
              dot
            />
            <h2 className={styles.heading}>Why does Phoenix depend on it?</h2>
          </div>
          <div className={styles.bottom}>
            <div className={styles.bottomLeft}>
              <p className={styles.copy1}>
                Phoenix is massive. Stretching across hundreds of square miles
                with events, venues, corporate campuses, and attractions spread
                far apart, transportation in Phoenix is a real logistical
                challenge for any group. That&apos;s where charter buses come
                in. A charter bus rental gives your group a private, organized,
                and comfortable way to travel together — no parking headaches,
                no coordinating a dozen different rideshares, no one getting
                left behind. Charter bus travel in a city like Phoenix
                isn&apos;t a luxury, it&apos;s the smart move.
              </p>
              <p className={styles.copy}>
                What separates a true charter bus service from generic van
                rentals or shuttle bookings is the full experience: a
                professional bus driver, a well-maintained vehicle, and a
                company that actually knows Phoenix and the surrounding area. At
                Nier Transportation, that&apos;s exactly what we&apos;ve been
                providing since 2004. Our charter bus service is built around
                the specific demands of Phoenix groups — whether that&apos;s
                navigating the Phoenix Convention Center district, staging at
                Sky Harbor International Airport, or running event loops around
                downtown Phoenix.
              </p>
              <p className={styles.copy}>
                A reliable charter bus isn&apos;t just transportation —
                it&apos;s the foundation of a successful event. When the bus
                shows up on time, every time, your group can focus on what
                matters. That&apos;s the standard Nier Transportation holds
                itself to on every single job.
              </p>
            </div>
            <div className={styles.bottomRight}>
              <div className={styles.imgContainer}>
                <Image
                  src={Img1}
                  alt='Book a charter bus rental with Nier Transportation'
                  title='Book a charter bus rental with Nier Transportation'
                  fill
                  className={styles.img}
                />
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
