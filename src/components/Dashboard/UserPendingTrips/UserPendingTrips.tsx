"use client";

import styles from "./UserTripsTable.module.css";
import Link from "next/link";

export type UserPendingTripItem = {
  id: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  totalCents: number;
  currency: string;
  createdAtIso: string;
};

type Props = {
  items: UserPendingTripItem[];
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

  return { dateLabel, timeLabel };
}

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const mins = Math.round(diffMs / (60 * 1000));
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

export default function UserPendingTrips({
  items,
  timeZone,
  bookingHrefBase = "/dashboard/trips",
}: Props) {
  if (items.length === 0) {
    return null; // Don't show section if no pending items
  }

  return (
    <section className={styles.container} aria-label='Pending approval'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.titleIcon}>⏳</span>
            Awaiting Approval
          </h2>
          <span className={styles.countBadge}>{items.length}</span>
        </div>
        <p className='miniNote'>
          These booking requests are being reviewed by our team
        </p>
      </header>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr className={styles.trHead}>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Requested Pickup</th>
              <th className={styles.th}>Route</th>
              <th className={styles.th}>Service</th>
              <th className={styles.th}>Estimate</th>
              <th className={styles.th}>Submitted</th>
              <th className={`${styles.th} ${styles.thRight}`}></th>
            </tr>
          </thead>

          <tbody>
            {items.map((b) => {
              const pickup = formatPickup(b.pickupAtIso, timeZone);
              const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;
              const createdAgo = formatCreatedAt(b.createdAtIso);

              return (
                <tr key={b.id} className={styles.tr}>
                  <td className={styles.td} data-label='Status'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={styles.cellInner}>
                      <span
                        className={`${styles.badge} ${styles.badge_warning}`}
                      >
                        Pending Review
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

                  <td className={styles.td} data-label='Estimate'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={styles.cellInner}>
                      <div className={styles.amount}>
                        {formatCurrency(b.totalCents, b.currency)}
                      </div>
                    </div>
                  </td>

                  <td className={styles.td} data-label='Submitted'>
                    <Link
                      href={href}
                      className={styles.rowStretchedLink}
                      aria-hidden='true'
                      tabIndex={-1}
                    />
                    <div className={styles.cellInner}>
                      <span className={styles.cellSub}>{createdAgo}</span>
                    </div>
                  </td>

                  <td
                    className={`${styles.td} ${styles.tdRight}`}
                    data-label='Action'
                  >
                    <Link className='primaryBtn' href={href}>
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info box */}
      <div className={styles.infoBox}>
        <span className={styles.infoIcon}>ℹ️</span>
        <p className={styles.infoText}>
          You&apos;ll receive an email once your booking is approved with a link
          to complete payment.
        </p>
      </div>
    </section>
  );
}
