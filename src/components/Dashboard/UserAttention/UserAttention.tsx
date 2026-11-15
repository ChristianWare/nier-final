// "Needs your attention": the customer's rides that are waiting on them
// (approved, to be paid for) or on us (a request being reviewed), at the
// top of the dashboard. Nothing waiting, nothing shown.

import Link from "next/link";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import { shortPlace } from "@/lib/shortPlace";
import styles from "./UserAttention.module.css";

export type UserAttentionItem = {
  id: string;
  kind: "payment" | "review";
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  totalCents: number;
  currency: string;
};

type Props = {
  items: UserAttentionItem[];
  timeZone: string;
  /** "Needs your attention" on the overview; "Due now" on Payments. */
  title?: string;
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function UserAttention({
  items,
  timeZone,
  title = "Needs your attention",
}: Props) {
  if (items.length === 0) return null;

  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <section className={styles.container} aria-labelledby='attention-title'>
      <header className={styles.top}>
        <h2 id='attention-title' className='cardTitle h4'>
          {title}
        </h2>
        <span className={styles.count}>{items.length}</span>
      </header>

      <ul className={styles.list}>
        {items.map((item) => {
          const href = `/dashboard/trips/${item.id}`;
          const isPayment = item.kind === "payment";
          return (
            <li
              key={item.id}
              className={`${styles.item} ${isPayment ? styles.itemPayment : ""}`}
            >
              <div className={styles.main}>
                <span
                  className={`badge ${isPayment ? "badge_warn" : "badge_neutral"}`}
                >
                  {isPayment ? "Payment due" : "Awaiting approval"}
                </span>
                <p className={styles.when}>{when(item.pickupAtIso)}</p>
                <p className={styles.route}>
                  {shortPlace(item.pickupAddress)}
                  <Arrow className={styles.routeArrow} aria-hidden='true' />
                  {shortPlace(item.dropoffAddress)}
                </p>
                <p className={styles.note}>
                  {isPayment
                    ? "Approved. Pay to confirm your ride."
                    : "We're reviewing your request and will email you."}
                </p>
              </div>
              <div className={styles.side}>
                <span className={styles.amount}>
                  {formatMoney(item.totalCents, item.currency)}
                </span>
                <Link
                  href={href}
                  className={isPayment ? styles.payBtn : styles.viewBtn}
                >
                  {isPayment ? "Pay now" : "View"}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
