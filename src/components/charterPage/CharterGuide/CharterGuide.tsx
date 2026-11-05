// src/components/charterPage/CharterGuide/CharterGuide.tsx
//
// The planning sections of a charter bus page: which bus fits your group and
// what it typically costs, Arizona trips with drive times, the venues we run
// to, and how booking works. Shared by the Phoenix and Scottsdale charter
// pages; each passes its own trips, venues and (optionally) an intro.
//
// Typical totals come from Nier's recent charter bookings. Live hourly rates
// are in CharterPricing, which reads Admin → Vehicle Categories.

import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import { HOURLY_MIN_HOURS } from "@/lib/booking/rules";
import styles from "./CharterGuide.module.css";

export type CharterTrip = {
  destination: string;
  distance: string;
  time: string;
  note: string;
  href?: string;
};

export const BUS_SIZE_GUIDE = [
  {
    group: "Up to 14",
    bus: "Executive Sprinter",
    href: "/fleet/mercedes-sprinter-executive-14",
    typical: "About $360–$1,300",
    bestFor: "Leadership teams, airport groups, golf outings",
  },
  {
    group: "15–28",
    bus: "28-passenger mini bus",
    href: "/fleet/mini-party-bus-20-40",
    typical: "About $675–$1,400",
    bestFor: "Wedding parties, corporate teams, nights out",
  },
  {
    group: "29–40",
    bus: "40-passenger mini bus",
    href: "/fleet/mini-party-bus-20-40",
    typical: "About $1,000–$1,400",
    bestFor: "Guest shuttles, conferences, game days",
  },
  {
    group: "41–56",
    bus: "56-passenger motor coach",
    href: "/fleet/motorcoach",
    typical: "About $1,000–$1,500",
    bestFor: "Conventions, big weddings, day trips",
  },
  {
    group: "57 or more",
    bus: "Two or more coaches",
    href: "/fleet/motorcoach",
    typical: "Quoted per bus, one booking",
    bestFor: "Conventions, tournaments, school and team travel",
  },
] as const;

const BOOKING_STEPS = [
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
] as const;

export default function CharterGuide({
  place,
  intro,
  tripsHeading,
  tripsCopy,
  trips,
  venuesHeading,
  venuesCopy,
  venues,
}: {
  place: string;
  intro?: { eyebrow: string; heading: string; paragraphs: string[] };
  tripsHeading: string;
  tripsCopy: string;
  trips: CharterTrip[];
  venuesHeading: string;
  venuesCopy: string;
  venues: string[];
}) {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          {intro && (
            <div className={styles.block}>
              <SectionHeading text={intro.eyebrow} dot />
              <h2 className={`${styles.heading} h3`}>{intro.heading}</h2>
              {intro.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className={styles.copy}>
                  {p}
                </p>
              ))}
            </div>
          )}

          {/* ─── Bus size + typical price ─── */}
          <div className={styles.block}>
            <SectionHeading text='Which bus do you need?' dot />
            <h2 className={`${styles.heading} h3`}>
              Charter bus sizes and typical prices in {place}
            </h2>
            <p className={styles.copy}>
              Pick the bus by headcount, then leave a few seats free if the
              group has luggage. Every charter is booked by the hour with a{" "}
              {HOURLY_MIN_HOURS}-hour minimum, and the totals below are what
              recent charters with us have typically come to. Your exact price
              shows in the booking tool before you book.
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope='col'>Group size</th>
                    <th scope='col'>Bus</th>
                    <th scope='col'>Typical charter total</th>
                    <th scope='col'>Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {BUS_SIZE_GUIDE.map((row) => (
                    <tr key={row.group}>
                      <td className={styles.strong}>{row.group}</td>
                      <td>
                        <Link href={row.href} className={styles.link}>
                          {row.bus}
                        </Link>
                      </td>
                      <td>{row.typical}</td>
                      <td>{row.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.note}>
              Prices vary with hours, the date and your route. See the{" "}
              <Link
                href='/blog/charter-bus-rental-cost-phoenix'
                className={styles.link}
              >
                charter bus cost guide
              </Link>{" "}
              for sample trips and how to keep the total down.
            </p>
          </div>

          {/* ─── Arizona trips ─── */}
          <div className={styles.block}>
            <SectionHeading text='Arizona charter bus trips' dot />
            <h2 className={`${styles.heading} h3`}>{tripsHeading}</h2>
            <p className={styles.copy}>{tripsCopy}</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope='col'>Destination</th>
                    <th scope='col'>Distance</th>
                    <th scope='col'>Drive time</th>
                    <th scope='col'>Good to know</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((t) => (
                    <tr key={t.destination}>
                      <td className={styles.strong}>
                        {t.href ? (
                          <Link href={t.href} className={styles.link}>
                            {t.destination}
                          </Link>
                        ) : (
                          t.destination
                        )}
                      </td>
                      <td>{t.distance}</td>
                      <td>{t.time}</td>
                      <td>{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Venues ─── */}
          <div className={styles.block}>
            <SectionHeading text='Where we drive' dot />
            <h2 className={`${styles.heading} h3`}>{venuesHeading}</h2>
            <p className={styles.copy}>{venuesCopy}</p>
            <ul className={styles.venues}>
              {venues.map((v) => (
                <li key={v} className={styles.venue}>
                  {v}
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Booking steps ─── */}
          <div className={styles.block}>
            <SectionHeading text='How booking works' dot />
            <h2 className={`${styles.heading} h3`}>
              Book a charter bus in four steps
            </h2>
            <ol className={styles.steps}>
              {BOOKING_STEPS.map((s, i) => (
                <li key={s.title} className={styles.step}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <div>
                    <h3 className={`${styles.stepTitle} h5`}>{s.title}</h3>
                    <p className={styles.copy}>{s.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className={styles.btnRow}>
              <Button
                href='/book'
                text='See Your Price'
                btnType='black'
                arrow
              />
              <a href='tel:+14803006003' className={styles.callLink}>
                Or call (480) 300-6003
              </a>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
