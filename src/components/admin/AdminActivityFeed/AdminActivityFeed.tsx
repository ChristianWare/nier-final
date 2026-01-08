import styles from "./AdminActivityFeed.module.css";
import Link from "next/link";

export type AdminActivityItem = {
  kind: "STATUS" | "ASSIGNMENT" | "PAYMENT_RECEIVED" | "PAYMENT_LINK_SENT";
  at: Date;
  title: string;
  subtitle?: string;
  bookingId?: string;
};

type Props = {
  items: AdminActivityItem[];
  timeZone?: string;
};

export default function AdminActivityFeed({
  items,
  timeZone = "America/Phoenix",
}: Props) {
  return (
    <section className={styles.container} aria-label='Recent activity'>
      <header className={styles.header}>
        <h2 className={`${styles.title} h4`}>Recent activity</h2>
        <div className={styles.meta}>
          Last {Math.min(10, items.length)} events
        </div>
      </header>

      {items.length === 0 ? (
        <div className={styles.empty}>No recent admin activity.</div>
      ) : (
        <ul className={styles.list}>
          {items.map((x, idx) => (
            <li
              key={`${x.kind}-${x.at.toISOString()}-${idx}`}
              className={styles.row}
            >
              <div className={styles.left}>
                <div className={styles.topLine}>
                  <span className={styles.kind}>{labelKind(x.kind)}</span>
                  <span className={styles.dot}>•</span>
                  <p className={styles.time}>
                    {formatDateTime(x.at, timeZone)}
                  </p>
                </div>

                <div className={styles.titleLine}>{x.title}</div>

                {x.subtitle ? (
                  <div className={styles.subtitle}>{x.subtitle}</div>
                ) : null}
              </div>

              <div className={styles.right}>
                {x.bookingId ? (
                  <Link
                    className={styles.btn}
                    href={`/admin/bookings/${x.bookingId}`}
                  >
                    Review
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function labelKind(kind: AdminActivityItem["kind"]) {
  switch (kind) {
    case "STATUS":
      return "Status";
    case "ASSIGNMENT":
      return "Assignment";
    case "PAYMENT_RECEIVED":
      return "Payment";
    case "PAYMENT_LINK_SENT":
      return "Payment link";
    default:
      return "Event";
  }
}

function formatDateTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
