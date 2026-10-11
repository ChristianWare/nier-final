import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import HomeBookingWidget from "@/components/HomePage/HomeBookingWidget/HomeBookingWidget";
import type { BookingWidgetData } from "@/lib/booking/widgetData";
import styles from "./QuoteBand.module.css";

const points = [
  "Flat rates, quoted before you book",
  "No surge pricing, day or night",
  "Free flight tracking on every airport ride",
  "Uniformed, background-checked chauffeurs",
];

/**
 * Instant quote, directly under the hero. Visitors arriving from Google or
 * the Maps listing usually have a trip in mind ("Scottsdale to Sky Harbor,
 * Tuesday 5 am"); the widget takes it and hands it to /book pre-filled.
 */
export default function QuoteBand({ widget }: { widget: BookingWidgetData }) {
  return (
    <section className={styles.container} aria-labelledby='quote-heading'>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <SectionHeading text='Instant Quote' dot />
            <h2 id='quote-heading' className={`${styles.heading} h3`}>
              Get a flat-rate quote in under two minutes.
            </h2>
            <ul className={styles.points}>
              {points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className={styles.call}>
              Prefer to talk to a person?{" "}
              <a href='tel:+14803006003' className={styles.phone}>
                Call (480) 300-6003
              </a>
              , 24/7.
            </p>
          </div>
          <div className={styles.right}>
            <HomeBookingWidget
              serviceTypes={widget.serviceTypes}
              vehicles={widget.vehicles}
              companyTimezone={widget.companyTimezone}
              companyTimezoneLabel={widget.companyTimezoneLabel}
              source='home:quote-band'
              fluid
            />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
