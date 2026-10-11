import Link from "next/link";
import Script from "next/script";
import HomeBookingWidget from "@/components/HomePage/HomeBookingWidget/HomeBookingWidget";
import type { BookingWidgetData } from "@/lib/booking/widgetData";
import styles from "./RideBox.module.css";
import { googleMapsSrc } from "@/lib/googleMaps";

/**
 * In-article booking box for blog posts. Used from MDX:
 *
 *   <RideBox title="Need a ride to Topgolf?" copy="Flat rate from anywhere in the Valley." />
 *
 * The blog page supplies `data` and `source`; posts only set the words.
 * The widget hands its answers to /book exactly as it does on the homepage.
 */
export default function RideBox({
  data,
  source,
  title = "Need a ride there?",
  copy,
}: {
  data: BookingWidgetData;
  source: string;
  title?: string;
  copy?: string;
}) {
  return (
    <aside className={styles.box} aria-label={title}>
      {/* Places autocomplete for the pickup/drop-off fields. next/script
          loads it once per page even if a post uses RideBox twice. */}
      <Script
        id='google-maps'
        src={googleMapsSrc()}
        data-google-maps='1'
        strategy='lazyOnload'
      />
      <div className={styles.intro}>
        <p className={styles.title}>{title}</p>
        <p className={styles.copy}>
          {copy ? `${copy} ` : ""}
          Nier Transportation has run{" "}
          <Link href='/' className={styles.link}>
            black car service in Phoenix &amp; Scottsdale
          </Link>{" "}
          since 2004: flat rates, flight tracking, no surge pricing.
        </p>
      </div>
      <HomeBookingWidget
        serviceTypes={data.serviceTypes}
        vehicles={data.vehicles}
        companyTimezone={data.companyTimezone}
        companyTimezoneLabel={data.companyTimezoneLabel}
        source={source}
        fluid
      />
    </aside>
  );
}
