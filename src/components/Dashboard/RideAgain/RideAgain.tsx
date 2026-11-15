"use client";

// "Ride again": the customer's recent routes, each one tap from a booking
// form that already has the same pickup, drop-off, service, vehicle and
// party size; they only pick the date and time. It hands the trip over the
// same way the home page's quick booking does (sessionStorage
// "booking_prefill", read once by the booking tool).

import { useRouter } from "next/navigation";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import RedoIcon from "@/components/shared/icons/RedoIcon/RedoIcon";
import type { RideAgainPrefill } from "./rideAgainPrefill";
import styles from "./RideAgain.module.css";

/** Hand a ride to the booking tool and open it. */
export function startRideAgain(
  prefill: RideAgainPrefill,
  push: (href: string) => void,
) {
  try {
    sessionStorage.setItem("booking_prefill", JSON.stringify(prefill));
  } catch {
    // Private mode or storage blocked: the booking tool just opens empty.
  }
  push("/book");
}

export type RideAgainItem = {
  id: string;
  from: string;
  to: string;
  /** "Airport Pickup · Luxury SUV" */
  summary: string;
  /** "Last ride Nov 9" */
  lastLabel: string;
  prefill: RideAgainPrefill;
};

export default function RideAgain({ items }: { items: RideAgainItem[] }) {
  const router = useRouter();
  if (items.length === 0) return null;

  const rebook = (item: RideAgainItem) =>
    startRideAgain(item.prefill, router.push);

  return (
    <section className={styles.container} aria-labelledby='ride-again-title'>
      <header className={styles.top}>
        <h2 id='ride-again-title' className='cardTitle h4'>
          Ride again
        </h2>
        <p className={styles.copy}>
          Same route and car, filled in for you. Just pick the date and time.
        </p>
      </header>

      <ul className={styles.grid}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type='button'
              className={styles.card}
              onClick={() => rebook(item)}
            >
              <span className={styles.icon} aria-hidden='true'>
                <RedoIcon />
              </span>
              <span className={styles.route}>
                <span className={styles.place}>{item.from}</span>
                <Arrow className={styles.routeArrow} aria-hidden='true' />
                <span className={styles.place}>{item.to}</span>
              </span>
              <span className={styles.summary}>{item.summary}</span>
              <span className={styles.footer}>
                <span className={styles.last}>{item.lastLabel}</span>
                <span className={styles.cta}>
                  Book this
                  <Arrow className={styles.ctaArrow} aria-hidden='true' />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
