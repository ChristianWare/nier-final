// The customer's other upcoming rides, after the next one: a row each with
// the date, time, route, service and status. Shown only when there are
// some.

import Link from "next/link";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import { shortPlace } from "@/lib/shortPlace";
import styles from "./UserUpcomingList.module.css";

export type UserUpcomingItem = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  driverName: string | null;
};

type Props = {
  items: UserUpcomingItem[];
  timeZone: string;
};

const STATUS_TEXT: Record<string, string> = {
  CONFIRMED: "Confirmed",
  ASSIGNED: "Chauffeur assigned",
  EN_ROUTE: "On the way",
  ARRIVED: "Chauffeur arrived",
  IN_PROGRESS: "In progress",
};

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "good",
  ASSIGNED: "good",
  EN_ROUTE: "accent",
  ARRIVED: "accent",
  IN_PROGRESS: "accent",
};

export default function UserUpcomingList({ items, timeZone }: Props) {
  if (items.length === 0) return null;

  const part = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(
      new Date(iso),
    );

  return (
    <section className={styles.container} aria-labelledby='upcoming-title'>
      <header className={styles.top}>
        <h2 id='upcoming-title' className='cardTitle h4'>
          Also coming up
        </h2>
        <Link href='/dashboard/trips?range=upcoming' className='backBtn'>
          All trips
        </Link>
      </header>

      <ul className={styles.list}>
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/dashboard/trips/${t.id}`} className={styles.row}>
              <span className={styles.date} aria-hidden='true'>
                <span className={styles.dow}>
                  {part(t.pickupAtIso, { weekday: "short" })}
                </span>
                <span className={styles.day}>
                  {part(t.pickupAtIso, { day: "numeric" })}
                </span>
                <span className={styles.mon}>
                  {part(t.pickupAtIso, { month: "short" })}
                </span>
              </span>
              <span className={styles.info}>
                <span className={styles.time}>
                  {part(t.pickupAtIso, { hour: "numeric", minute: "2-digit" })}
                </span>
                <span className={styles.route}>
                  {shortPlace(t.pickupAddress)}
                  <Arrow className={styles.routeArrow} aria-hidden='true' />
                  {shortPlace(t.dropoffAddress)}
                </span>
                <span className={styles.meta}>
                  {[t.serviceName, t.vehicleName].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className={styles.side}>
                <span
                  className={`badge badge_${STATUS_TONE[t.status] ?? "neutral"}`}
                >
                  {STATUS_TEXT[t.status] ?? t.status.replace(/_/g, " ")}
                </span>
                <Arrow className={styles.chevron} aria-hidden='true' />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
