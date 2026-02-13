"use client";

import styles from "./UserPaymentDue.module.css";
import Link from "next/link";

export type UserPaymentDueItem = {
  id: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  totalCents: number;
  currency: string;
  paymentUrl: string | null;
};

type Props = {
  items: UserPaymentDueItem[];
  timeZone: string;
  bookingHrefBase?: string;
};

function formatCurrency(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatPickup(iso: string, timeZone: string) {
  const d = new Date(iso);
  const now = new Date();

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  // Calculate relative time
  const diffMs = d.getTime() - now.getTime();
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

  let urgency: "critical" | "warning" | "normal" = "normal";
  let relLabel = "";

  if (diffMs < 0) {
    relLabel = "Overdue";
    urgency = "critical";
  } else if (hours < 24) {
    relLabel = hours <= 1 ? "Today" : `In ${hours}h`;
    urgency = "critical";
  } else if (days <= 3) {
    relLabel = days === 1 ? "Tomorrow" : `In ${days} days`;
    urgency = "warning";
  } else {
    relLabel = `In ${days} days`;
    urgency = "normal";
  }

  return { dateLabel, timeLabel, relLabel, urgency };
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

export default function UserPaymentDue({
  items,
  timeZone,
  bookingHrefBase = "/dashboard/trips",
}: Props) {
  if (items.length === 0) {
    return null; // Don't show section if no items
  }

  return (
    <section className={styles.container} aria-label='Payment required'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.titleIcon}>💳</span>
            Payment Required
          </h2>
          <span className={`${styles.countBadge} ${styles.countBadgeDanger}`}>
            {items.length}
          </span>
        </div>
        <p className='miniNote'>
          These bookings have been approved and require payment to confirm
        </p>
      </header>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr className={styles.trHead}>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Pickup</th>
              <th className={styles.th}>Route</th>
              <th className={styles.th}>Service</th>
              <th className={styles.th}>Amount Due</th>
              <th className={`${styles.th} ${styles.thRight}`}></th>
            </tr>
          </thead>

          <tbody>
            {items.map((b) => {
              const pickup = formatPickup(b.pickupAtIso, timeZone);
              const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;

              return (
                <tr
                  key={b.id}
                  className={`${styles.tr} ${pickup.urgency === "critical" ? styles.trCritical : pickup.urgency === "warning" ? styles.trWarning : ""}`}
                >
                  <td className={styles.td} data-label='Status'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={styles.cellInner}>
                      <span
                        className={`${styles.badge} ${styles.badge_danger}`}
                      >
                        Payment Due
                      </span>
                    </div>
                  </td>

                  <td className={styles.td} data-label='Pickup'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={`${styles.cellStack} ${styles.cellInner}`}>
                      <span className={styles.rowLink}>
                        {pickup.dateLabel} @ {pickup.timeLabel}
                      </span>
                      <div className={styles.cellMeta}>
                        <span
                          className={`${styles.pill} ${
                            pickup.urgency === "critical"
                              ? styles.pillCritical
                              : pickup.urgency === "warning"
                                ? styles.pillWarning
                                : ""
                          }`}
                        >
                          {pickup.relLabel}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className={styles.td} data-label='Route'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={`${styles.cellStack} ${styles.cellInner}`}>
                      <span className={styles.routeText}>
                        <span className={styles.routeIcon}>📍</span>
                        {shortAddress(b.pickupAddress)}
                      </span>
                      <span className={styles.routeText}>
                        <span className={styles.routeIcon}>🏁</span>
                        {shortAddress(b.dropoffAddress)}
                      </span>
                    </div>
                  </td>

                  <td className={styles.td} data-label='Service'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={styles.cellInner}>
                      <div className={styles.rowLink}>{b.serviceName}</div>
                      {b.vehicleName && (
                        <div className={styles.cellSub}>{b.vehicleName}</div>
                      )}
                    </div>
                  </td>

                  <td className={styles.td} data-label='Amount Due'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={styles.cellInner}>
                      <div className={styles.amountDue}>
                        {formatCurrency(b.totalCents, b.currency)}
                      </div>
                    </div>
                  </td>

                  <td
                    className={`${styles.td} ${styles.tdRight}`}
                    data-label='Action'
                  >
                    {b.paymentUrl ? (
                      <Link
                        className='primaryBtn'
                        href={href}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        View{" "}
                      </Link>
                    ) : (
                      <Link className='primaryBtn' href={href}>
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Warning box */}
      <div className={styles.warningBox}>
        <span className={styles.warningIcon}>⚠️</span>
        <p className={styles.warningText}>
          Please complete payment as soon as possible to confirm your booking.
          Unpaid bookings may be cancelled if payment is not received before the
          pickup time.
        </p>
      </div>
    </section>
  );
}
