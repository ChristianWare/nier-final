import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import styles from "./FlightTrackerSection.module.css";
import FlightTracker from "@/components/shared/FlightTracker/FlightTracker";

export default function FlightTrackerSection() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.right}>
              <SectionHeading text='Live Flight Tracker' dot />
              <h2 className={styles.heading}>
                Your driver tracks your flight <br className={styles.br} /> so
                you don&apos;t have to.
              </h2>
              <FlightTracker />
            </div>
            <div className={styles.left}>
              <p className={styles.copy}>
                Track any flight in real time — arrivals, departures, delays,
                and terminals. Whether you&apos;re picking someone up or heading
                to the airport, knowing exactly where your flight stands makes
                all the difference.
              </p>
              <p className={styles.copy}>
                At Nier Transportation, we monitor your flight automatically and
                adjust your driver&apos;s arrival time if things change — so you
                never have to worry about being left waiting. Flying commercial?
                See how our{" "}
                <Link
                  href='/airports/phx-sky-harbor'
                  className={styles.copyLink}
                >
                  PHX Sky Harbor airport car service
                </Link>{" "}
                works, terminal by terminal.
              </p>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
