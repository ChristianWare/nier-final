import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";
import styles from "./AdminUrgentQueue.module.css";
import Link from "next/link";

export type UrgentBookingItem = {
  id: string;
  pickupAt: Date;
  createdAt: Date;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  user: { name: string | null; email: string };
  serviceType?: { name: string } | null;
  assignment?: { driver: { name: string | null; email: string } } | null;
};

type Props = {
  unassignedSoon: UrgentBookingItem[];
  pendingPaymentSoon: UrgentBookingItem[];
  stuckReview: UrgentBookingItem[];
  timeZone?: string; // "America/Phoenix"
};

export default function AdminUrgentQueue({
  unassignedSoon,
  pendingPaymentSoon,
  stuckReview,
  timeZone = "America/Phoenix",
}: Props) {
  const total =
    unassignedSoon.length + pendingPaymentSoon.length + stuckReview.length;

  return (
    <section className={styles.container} aria-label='Urgent queue'>
      <header className={styles.header}>
        <h2 className={`cardTitle h4`}>Urgent</h2>
        {/* <div className={styles.meta}>
          {total > 0 ? `${total} item(s)` : "All clear"}
        </div> */}
         <div className={styles.meta}>
                  {total === 0 ? (
                    "All clear"
                  ) : (
                    <>
                      <BadgeCount value={total} max={99} hideIfZero />
                    </>
                  )}
                </div>
      </header>

      <div className={styles.grid}>
        <UrgentSection
          title='Unassigned pickups (next 24h)'
          emptyText='No unassigned pickups within 24 hours.'
          items={unassignedSoon}
          timeZone={timeZone}
        />

        <UrgentSection
          title='Pending payment (next 24h)'
          emptyText='No pending payments within 24 hours.'
          items={pendingPaymentSoon}
          timeZone={timeZone}
        />

        <UrgentSection
          title='Stuck in review'
          subtitle='Older than 2 hours'
          emptyText='No bookings stuck in review.'
          items={stuckReview}
          timeZone={timeZone}
        />
      </div>
    </section>
  );
}

function UrgentSection({
  title,
  subtitle,
  emptyText,
  items,
  timeZone,
}: {
  title: string;
  subtitle?: string;
  emptyText: string;
  items: UrgentBookingItem[];
  timeZone: string;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
          <div className="emptyTitle underline">{title}</div>
          <div className={styles.countPill}>{items.length}</div>
          {subtitle ? (
            <div className="miniNote">{subtitle}</div>
          ) : null}
      </div>
      {items.length === 0 ? (
        <div className="emptySmall">{emptyText}</div>
      ) : (
        <ul className={styles.list}>
          {items.map((b) => {
            const customer = b.user.name?.trim() || b.user.email;
            const pickupShort = shortAddress(b.pickupAddress);
            const dropoffShort = shortAddress(b.dropoffAddress);
            const pickupWhen = formatDateTime(b.pickupAt, timeZone);
            const rel = relativeToNow(b.pickupAt);

            return (
              <li key={b.id} className={styles.row}>
                <div className={styles.rowLeft}>
                  <div className={styles.rowTop}>
                    <span className="emptyTitleSmall">{pickupWhen}</span>
                    <span className={styles.rel}>{rel}</span>
                    <StatusPill status={b.status} />
                  </div>

                  <div className={styles.rowMiddle}>
                    <span className="emptyTitleSmall">{customer}</span>
                    {b.serviceType?.name ? (
                      <span className={styles.service}>
                        • {b.serviceType.name}
                      </span>
                    ) : null}
                    {b.assignment?.driver?.name ||
                    b.assignment?.driver?.email ? (
                      <span className={styles.driver}>
                        • Driver:{" "}
                        {b.assignment.driver.name || b.assignment.driver.email}
                      </span>
                    ) : (
                      <span className={styles.driver}>• Unassigned</span>
                    )}
                  </div>

                  <div className={styles.route}>
                    {pickupShort} → {dropoffShort}
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <Link
                    className={styles.reviewBtn}
                    href={`/admin/bookings/${b.id}`}
                  >
                    Review
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll("_", " ").toLowerCase();
  return <span className={styles.statusPill}>{label}</span>;
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function formatDateTime(d: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return fmt.format(d);
}

function relativeToNow(d: Date) {
  const now = Date.now();
  const diffMs = d.getTime() - now;

  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const absHr = Math.floor(absMin / 60);
  const min = absMin % 60;

  const parts: string[] = [];
  if (absHr > 0) parts.push(`${absHr}h`);
  if (absHr < 6 && min > 0) parts.push(`${min}m`);
  const txt = parts.length ? parts.join(" ") : "now";

  return diffMs >= 0 ? `in ${txt}` : `${txt} ago`;
}
