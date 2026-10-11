import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import styles from "./ChauffeurLimo.module.css";

/** Minimum booking for hourly chauffeur service. */
export const HOURLY_MINIMUM_HOURS = 2;

/**
 * Chauffeur and limo, side by side. Short on purpose: each block sends
 * readers (and Google) to the page that owns the search — "hourly chauffeur
 * service" and "limo service Phoenix" — rather than competing with it.
 */
export default function ChauffeurLimo() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.block}>
            <SectionHeading text='By the Hour' dot />
            <h2 className={`${styles.heading} h3`}>
              Hourly Chauffeur Service in Phoenix
            </h2>
            <p className={styles.copy}>
              Keep a car and chauffeur for as long as the day needs:
              back-to-back meetings, a site tour for visiting clients, a
              wedding, a night out in Old Town, 18 holes and dinner after. Your
              chauffeur waits, handles the parking and the bags, and moves when
              you do. Sedans, SUVs and Sprinters by the hour, with a{" "}
              {HOURLY_MINIMUM_HOURS}-hour minimum.
            </p>
            <p className={styles.links}>
              <Link href='/services/hourly-chauffeur' className={styles.link}>
                Hourly chauffeur service in Phoenix
              </Link>
              <Link
                href='/services/corporate-and-event-logistics'
                className={styles.link}
              >
                Corporate &amp; event transportation
              </Link>
            </p>
          </div>
          <div className={styles.block}>
            <SectionHeading text='Limos & Party Buses' dot />
            <h2 className={`${styles.heading} h3`}>
              Limo Service in Phoenix &amp; Scottsdale
            </h2>
            <p className={styles.copy}>
              A stretch limousine for weddings, proms and anniversaries,
              executive Sprinters for groups of up to 14, and party buses for 20
              to 40. One booking, one chauffeur, and the same flat-rate pricing
              as every other ride.
            </p>
            <p className={styles.links}>
              <Link href='/services/limo-service' className={styles.link}>
                Limo service in Phoenix
              </Link>
              <Link href='/services/party-bus' className={styles.link}>
                Party bus rental
              </Link>
              <Link href='/services/weddings' className={styles.link}>
                Wedding transportation
              </Link>
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
