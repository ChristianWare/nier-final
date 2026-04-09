"use client";

import styles from "./UserTripsTable.module.css";
import Link from "next/link";

export type UserUpcomingTripItem = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  driverName: string | null;
  totalCents: number;
  currency: string;
};

type Props = {
  items: UserUpcomingTripItem[];
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

  const diffMs = d.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));

  let rel: string;
  if (mins < 60) {
    rel = `in ${mins}m`;
  } else if (hours < 24) {
    rel = `in ${hours}h`;
  } else {
    rel = `in ${days}d`;
  }

  if (diffMs < 0) {
    rel =
      mins < 60
        ? `${mins}m ago`
        : hours < 24
          ? `${hours}h ago`
          : `${days}d ago`;
  }

  return { dateLabel, timeLabel, rel };
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

function prettyStatus(s: string) {
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "ASSIGNED") return "Driver Assigned";
  if (s === "EN_ROUTE") return "Driver En Route";
  if (s === "ARRIVED") return "Driver Arrived";
  if (s === "IN_PROGRESS") return "In Progress";
  const parts = String(s).split("_").filter(Boolean);
  if (!parts.length) return String(s);
  return parts
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(s: string): "neutral" | "warning" | "danger" | "good" {
  if (s === "CONFIRMED" || s === "ASSIGNED") return "good";
  if (s === "EN_ROUTE" || s === "ARRIVED" || s === "IN_PROGRESS") return "good";
  return "neutral";
}

export default function UserUpcomingTrips({
  items,
  timeZone,
  bookingHrefBase = "/dashboard/trips",
}: Props) {
  return (
    <section className={styles.container} aria-label='Upcoming trips'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.titleIcon} style={{ marginRight: "2rem" }}>
              🚗
            </span>
            Upcoming Trips
          </h2>
          <Link href='/dashboard/trips' className='backBtn'>
            View all trips →
          </Link>
        </div>
        {items.length > 0 && (
          <p className='miniNote'>Your confirmed trips that are coming up</p>
        )}
      </header>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <div className={styles.emptyText}>
            <p className='emptyTitle'>No upcoming trips</p>
            <p className='emptySmall'>
              When you have confirmed trips, they&apos;ll appear here.
            </p>
          </div>
          <Link href='/book' className='primaryBtn'>
            Book a Ride →
          </Link>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Route</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Amount</th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {items.map((b) => {
                const pickup = formatPickup(b.pickupAtIso, timeZone);
                const tone = statusTone(b.status);
                const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;

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
                          className={`${styles.badge} ${styles[`badge_${tone}`]}`}
                        >
                          {prettyStatus(b.status)}
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
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
                        <span className={styles.rowLink}>
                          {pickup.dateLabel} @ {pickup.timeLabel}
                        </span>
                        <div className={styles.cellMeta}>
                          <span className={styles.pill}>{pickup.rel}</span>
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
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
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

                    <td className={styles.td} data-label='Driver'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        {b.driverName ? (
                          <div className={styles.driverAssigned}>
                            <span className={styles.driverIcon}>👤</span>
                            {b.driverName}
                          </div>
                        ) : (
                          <div className={styles.driverPending}>
                            Assigning driver...
                          </div>
                        )}
                      </div>
                    </td>

                    <td className={styles.td} data-label='Amount'>
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
      )}
    </section>
  );
}
