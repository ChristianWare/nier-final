"use client";

import styles from "./UserTripsTable.module.css";
import Link from "next/link";

export type UserPendingTripItem = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  totalCents: number;
  currency: string;
  createdAtIso: string;
  paymentUrl?: string | null;
};

type Props = {
  items: UserPendingTripItem[];
  timeZone?: string;
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

function formatCreatedAt(iso: string, timeZone: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  const mins = Math.round(diffMs / (60 * 1000));
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(d);
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

function prettyStatus(s: string) {
  if (s === "PENDING_REVIEW") return "Awaiting Approval";
  if (s === "PENDING_PAYMENT") return "Payment Required";
  const parts = String(s).split("_").filter(Boolean);
  if (!parts.length) return String(s);
  return parts
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(s: string): "neutral" | "warning" | "danger" | "good" {
  if (s === "PENDING_REVIEW") return "warning";
  if (s === "PENDING_PAYMENT") return "danger";
  return "neutral";
}

export default function UserPendingTrips({
  items,
  timeZone = "America/Phoenix",
  bookingHrefBase = "/dashboard/trips",
}: Props) {
  // Separate pending review and pending payment
  const pendingReview = items.filter((i) => i.status === "PENDING_REVIEW");
  const pendingPayment = items.filter((i) => i.status === "PENDING_PAYMENT");

  const hasPendingReview = pendingReview.length > 0;
  const hasPendingPayment = pendingPayment.length > 0;

  if (items.length === 0) {
    return null; // Don't show section if no pending items
  }

  return (
    <section className={styles.container} aria-label='Pending trips'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.titleIcon}>⏳</span>
            Pending Trips
          </h2>
          <Link href='/dashboard/trips?status=pending' className='backBtn'>
            View all →
          </Link>
        </div>
        <p className='miniNote'>
          {hasPendingReview && hasPendingPayment
            ? "These trips are awaiting approval or payment"
            : hasPendingReview
              ? "These trips are awaiting admin approval"
              : "These trips require payment to confirm"}
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
              <th className={styles.th}>Amount</th>
              <th className={styles.th}>Submitted</th>
              <th className={`${styles.th} ${styles.thRight}`}></th>
            </tr>
          </thead>

          <tbody>
            {items.map((b) => {
              const pickup = formatPickup(b.pickupAtIso, timeZone);
              const tone = statusTone(b.status);
              const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;
              const createdAgo = formatCreatedAt(b.createdAtIso, timeZone);
              const isPendingPayment = b.status === "PENDING_PAYMENT";

              return (
                <tr
                  key={b.id}
                  className={`${styles.tr} ${isPendingPayment ? styles.trHighlight : ""}`}
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
                    {isPendingPayment && b.paymentUrl ? (
                      <Link
                        className={`primaryBtn ${styles.payNowBtn}`}
                        href={b.paymentUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Pay Now →
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

      {/* Info box for pending review */}
      {hasPendingReview && (
        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>ℹ️</span>
          <p className={styles.infoText}>
            Trips awaiting approval are being reviewed by our team. You&apos;ll
            receive an email once approved with a link to complete payment.
          </p>
        </div>
      )}
    </section>
  );
}
