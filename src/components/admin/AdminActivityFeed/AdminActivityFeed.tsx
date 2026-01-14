import styles from "./AdminActivityFeed.module.css";
import Link from "next/link";

export type AdminActivityItem = {
  kind: "STATUS" | "ASSIGNMENT" | "PAYMENT_RECEIVED" | "PAYMENT_LINK_SENT";
  at: Date;
  title: string;
  subtitle: string;
  bookingId: string;
  href?: string; // optional override
  ctaLabel?: string; // optional override
};

type Props = {
  items: AdminActivityItem[];
  timeZone?: string;
  title?: string;
  emptyText?: string;
  hrefBase?: string; // default: "/admin/bookings"
};

function formatDateTime(d: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
}

function kindLabel(kind: AdminActivityItem["kind"]) {
  switch (kind) {
    case "STATUS":
      return "Trip update";
    case "ASSIGNMENT":
      return "Driver assigned";
    case "PAYMENT_RECEIVED":
      return "Payment received";
    case "PAYMENT_LINK_SENT":
      return "Payment link sent";
    default:
      return "Update";
  }
}

function kindTone(kind: AdminActivityItem["kind"]) {
  // maps to your global badge classes: badge_neutral / badge_warn / badge_good / badge_accent / badge_bad
  switch (kind) {
    case "PAYMENT_RECEIVED":
      return "good";
    case "ASSIGNMENT":
      return "accent";
    case "PAYMENT_LINK_SENT":
      return "warn";
    case "STATUS":
    default:
      return "neutral";
  }
}

export default function AdminActivityFeed({
  items,
  timeZone,
  title = "Recent activity",
  emptyText = "No activity yet.",
  hrefBase = "/admin/bookings",
}: Props) {
  return (
    <section className={styles.container} aria-label='Admin activity feed'>
      <header className={styles.header}>
        <h2 className='cardTitle h4'>{title}</h2>
      </header>

      {items.length === 0 ? (
        <p className='emptySmall'>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((it) => {
            const href = it.href ?? `${hrefBase}/${it.bookingId}`;
            const key = `${it.bookingId}-${it.kind}-${it.at.toISOString()}`;

            return (
              <li key={key} className={styles.row}>
                <div className={styles.left}>
                  <span className={`badge badge_${kindTone(it.kind)}`}>
                    {kindLabel(it.kind)}
                  </span>

                  <div className='miniNote'>
                    {formatDateTime(it.at, timeZone)} • {it.title}
                  </div>

                  <div className='emptySmall'>{it.subtitle}</div>
                </div>

                <Link className='primaryBtn' href={href}>
                  {it.ctaLabel ?? "Open"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
