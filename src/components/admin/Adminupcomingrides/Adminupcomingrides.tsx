/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./Adminupcomingrides.module.css";
import Link from "next/link";

export type UpcomingRideItem = {
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
  customer: {
    name: string;
    email: string | null;
  };
};

type Props = {
  items: UpcomingRideItem[];
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
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "PENDING_PAYMENT") return "Payment due";
  if (s === "PENDING_REVIEW") return "Pending review";
  const parts = String(s).split("_").filter(Boolean);
  if (!parts.length) return String(s);
  return parts
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(s: string): "neutral" | "warning" | "danger" | "good" {
  if (s === "CONFIRMED") return "good";
  if (s === "PENDING_REVIEW") return "warning";
  if (s === "PENDING_PAYMENT") return "danger";
  return "neutral";
}

export default function AdminUpcomingRides({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  return (
    <section className={styles.container} aria-label='Upcoming rides'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>Upcoming rides</h2>
          <Link href='/admin/bookings' className='backBtn'>
            View all bookings →
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <div className='emptySmall'>No upcoming rides scheduled.</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Vehicle</th>
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

                const customerLine = `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}`;

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

                    <td className={styles.td} data-label='Client'>
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
                          {b.customer.name}
                        </Link>
                        {b.customer.email && (
                          <div className={styles.cellSub}>
                            {b.customer.email}
                          </div>
                        )}
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
                      </div>
                    </td>

                    <td className={styles.td} data-label='Vehicle'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.rowLink}>
                          {b.vehicleName ?? "—"}
                        </div>
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
                        <div className={styles.rowLink}>
                          {b.driverName ?? "Unassigned"}
                        </div>
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
