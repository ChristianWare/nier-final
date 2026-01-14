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

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

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

function toneFromStatusTitle(titleRaw: string): BadgeTone {
  const t = (titleRaw ?? "").trim().toLowerCase();

  // BAD
  if (
    t.includes("cancelled") ||
    t.includes("canceled") ||
    t.includes("no-show") ||
    t.includes("no show") ||
    t.includes("failed") ||
    t.includes("declined")
  ) {
    return "bad";
  }

  // GOOD (explicitly treat approval as good, even if it mentions pending payment)
  if (
    t.includes("approved") ||
    t.includes("booking approved") ||
    t.includes("confirmed") ||
    t.includes("completed") ||
    t.includes("assigned")
  ) {
    return "good";
  }

  // ACCENT (in-motion)
  if (
    t.includes("en route") ||
    t.includes("en-route") ||
    t.includes("arrived") ||
    t.includes("in progress") ||
    t.includes("in-progress") ||
    t.includes("started") ||
    t.includes("driver en route") ||
    t.includes("driver arrived")
  ) {
    return "accent";
  }

  // WARN
  if (
    t.includes("payment due") ||
    t.includes("payment link") ||
    t.includes("pending payment")
  ) {
    return "warn";
  }

  // NEUTRAL
  if (t.includes("pending review") || t.includes("draft")) return "neutral";

  return "neutral";
}

/**
 * Activity-feed tone:
 * - for non-STATUS items we know the intent, so tone is deterministic
 * - for STATUS items we infer tone from the status text (your `it.title`)
 */
function kindTone(it: AdminActivityItem): BadgeTone {
  switch (it.kind) {
    case "PAYMENT_RECEIVED":
      return "good";
    case "PAYMENT_LINK_SENT":
      return "warn";
    case "ASSIGNMENT":
      return "good";
    case "STATUS":
    default:
      return toneFromStatusTitle(it.title);
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
            const tone = kindTone(it);

            return (
              <li key={key} className={styles.row}>
                <div className={styles.left}>
                  <span className='emptyTitle underline'>
                    {kindLabel(it.kind)}
                  </span>

                  <div className={styles.box}>
                    <span className='miniNote'>
                      {formatDateTime(it.at, timeZone)}{" "}
                    </span>

                    <span className={`badge badge_${tone}`}>{it.title}</span>
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
