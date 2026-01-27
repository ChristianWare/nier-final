"use client";

import styles from "./DriverUpcomingRides.module.css";
import Link from "next/link";

export type UpcomingRideItem = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  customerName: string;
  customerPhone: string | null;
  driverPaymentCents: number | null;
  currency: string;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
};

type Props = {
  items: UpcomingRideItem[];
  timeZone: string;
  tripHrefBase?: string;
};

function formatCurrency(cents: number | null, currency: string = "USD") {
  if (cents == null) return "—";
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
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
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

function prettyStatus(s: string) {
  const statusMap: Record<string, string> = {
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-Show",
    CONFIRMED: "Confirmed",
    PENDING_PAYMENT: "Pending Payment",
    PENDING_REVIEW: "Pending Review",
  };
  return statusMap[s] || s.replace(/_/g, " ");
}

function statusTone(
  s: string,
): "neutral" | "warning" | "danger" | "good" | "accent" {
  switch (s) {
    case "ASSIGNED":
    case "CONFIRMED":
      return "good";
    case "EN_ROUTE":
    case "IN_PROGRESS":
      return "accent";
    case "ARRIVED":
      return "warning";
    case "COMPLETED":
      return "good";
    case "CANCELLED":
    case "NO_SHOW":
      return "danger";
    case "PENDING_PAYMENT":
      return "danger";
    case "PENDING_REVIEW":
      return "warning";
    default:
      return "neutral";
  }
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

export default function DriverUpcomingRides({
  items,
  timeZone,
  tripHrefBase = "/driver-dashboard/trips",
}: Props) {
  return (
    <section className={styles.container} aria-label='My upcoming rides'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.icon}>🚗</span>
            My Upcoming Rides
          </h2>
          <Link href='/driver-dashboard/trips' className='backBtn'>
            View all trips →
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <div className='emptySmall'>No upcoming rides assigned.</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Customer</th>
                <th className={styles.th}>Route</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Pax / Bags</th>
                <th className={styles.th}>Earnings</th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {items.map((b) => {
                const pickup = formatPickup(b.pickupAtIso, timeZone);
                const tone = statusTone(b.status);
                const href = `${tripHrefBase}/${encodeURIComponent(b.id)}`;

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
                        <Link href={href} className={styles.rowLink}>
                          {pickup.dateLabel} @ {pickup.timeLabel}
                        </Link>
                        <div className={styles.cellMeta}>
                          <span className={styles.pill}>{pickup.rel}</span>
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Customer'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
                        <Link href={href} className={styles.rowLink}>
                          {b.customerName}
                        </Link>
                        {b.customerPhone && (
                          <div className={styles.cellSub}>
                            {b.customerPhone}
                          </div>
                        )}
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
                        <div className={styles.routeFrom}>
                          📍 {shortAddress(b.pickupAddress)}
                        </div>
                        <div className={styles.routeTo}>
                          🏁 {shortAddress(b.dropoffAddress)}
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Service'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
                        <div className={styles.rowLink}>{b.serviceName}</div>
                        {b.vehicleName && (
                          <div className={styles.cellSub}>{b.vehicleName}</div>
                        )}
                      </div>
                    </td>

                    <td className={styles.td} data-label='Pax / Bags'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.rowLink}>
                          {b.passengers} / {b.luggage}
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Earnings'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.amount}>
                          {formatCurrency(b.driverPaymentCents, b.currency)}
                        </div>
                      </div>
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight}`}
                      data-label='Action'
                    >
                      <Link className='primaryBtn' href={href}>
                        Details
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
