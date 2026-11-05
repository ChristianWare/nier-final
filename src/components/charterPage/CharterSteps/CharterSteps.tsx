// "How booking works", laid out like the location pages'
// LocationCityNeighborhoods: a big stat and a heading on top, then one
// column per step with dividers between them.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import styles from "./CharterSteps.module.css";

export const CHARTER_BOOKING_STEPS = [
  {
    title: "See your price online",
    copy: "Choose Charter Services in the booking tool, pick the bus, your pickup and stops, and the hours you need. The price shows before you send anything.",
  },
  {
    title: "We confirm the details",
    copy: "Our team reviews the route, timing and venue rules, then approves your request. Multi-day trips and shuttle loops go on one booking.",
  },
  {
    title: "Secure the date",
    copy: "Pay by secure link. Larger charters can hold the date with a deposit and pay the balance before the trip.",
  },
  {
    title: "Ride day",
    copy: "Your driver and bus details arrive ahead of time, and the bus is staged early at your pickup.",
  },
];

export default function CharterSteps() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <div className={styles.topLeft}>
            <div className={styles.bigStat}>4 steps</div>
            <p className={styles.bigStatCopy}>
              From your price to pickup. Prefer to talk it through?{" "}
              <a href='tel:+14803006003' className={styles.callLink}>
                Call (480) 300-6003
              </a>
              .
            </p>
          </div>
          <div className={styles.topRight}>
            <SectionHeading text='How booking works' dot />
            <h2 className={styles.heading}>Book a charter bus in four steps</h2>
          </div>
        </div>

        <ol className={styles.grid}>
          {CHARTER_BOOKING_STEPS.map((s, i) => (
            <li key={s.title} className={styles.col}>
              <span className={styles.num}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className='h4'>{s.title}</h3>
              <p className={styles.stepCopy}>{s.copy}</p>
            </li>
          ))}
        </ol>

        <div className={styles.btnContainer}>
          <Button href='/book' text='See Your Price' btnType='red' arrow />
        </div>
      </LayoutWrapper>
    </section>
  );
}
