"use client";

import styles from "./AdminOutstandingBalances.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

export type OutstandingBalanceItem = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  driverName: string | null;
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  currency: string;
  balanceType: "unpaid" | "partial"; // never paid vs partially paid
  customer: {
    name: string;
    email: string | null;
  };
};

type Props = {
  items: OutstandingBalanceItem[];
  timeZone: string;
  bookingHrefBase?: string;
};

type BalanceTypeFilter = "all" | "unpaid" | "partial";
type UrgencyFilter = "all" | "within24h" | "future";

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
  if (diffMs < 0) {
    rel =
      mins < 60
        ? `${mins}m ago`
        : hours < 24
          ? `${hours}h ago`
          : `${days}d ago`;
  } else if (mins < 60) {
    rel = `in ${mins}m`;
  } else if (hours < 24) {
    rel = `in ${hours}h`;
  } else {
    rel = `in ${days}d`;
  }

  return { dateLabel, timeLabel, rel };
}

function urgencyTone(pickupIso: string): "danger" | "warning" | "neutral" {
  const now = new Date();
  const pickup = new Date(pickupIso);
  const hoursUntil = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil <= 24) return "danger";
  if (hoursUntil <= 72) return "warning";
  return "neutral";
}

export default function AdminOutstandingBalances({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [balanceFilter, setBalanceFilter] = useState<BalanceTypeFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");

  const counts = useMemo(() => {
    const now = new Date();
    const cutoff24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const unpaid = items.filter((x) => x.balanceType === "unpaid").length;
    const partial = items.filter((x) => x.balanceType === "partial").length;
    const within24h = items.filter(
      (x) => new Date(x.pickupAtIso) <= cutoff24h,
    ).length;
    const totalOutstanding = items.reduce(
      (sum, x) => sum + x.outstandingCents,
      0,
    );

    return {
      total: items.length,
      unpaid,
      partial,
      within24h,
      totalOutstanding,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let list = items.slice();

    if (balanceFilter === "unpaid")
      list = list.filter((x) => x.balanceType === "unpaid");
    if (balanceFilter === "partial")
      list = list.filter((x) => x.balanceType === "partial");

    if (urgencyFilter === "within24h") {
      list = list.filter((x) => new Date(x.pickupAtIso) <= cutoff24h);
    }
    if (urgencyFilter === "future") {
      list = list.filter((x) => new Date(x.pickupAtIso) > cutoff24h);
    }

    return list.sort(
      (a, b) =>
        new Date(a.pickupAtIso).getTime() - new Date(b.pickupAtIso).getTime(),
    );
  }, [items, balanceFilter, urgencyFilter]);

  const filteredOutstanding = filtered.reduce(
    (sum, x) => sum + x.outstandingCents,
    0,
  );

  return (
    <section className={styles.container} aria-label='Outstanding balances'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>Outstanding Balances</h2>
          <div className={styles.kpis}>
            <span className={styles.kpi}>Total: {counts.total}</span>
            <span
              className={`${styles.kpi} ${counts.unpaid > 0 ? styles.kpiDanger : ""}`}
            >
              Never Paid: {counts.unpaid}
            </span>
            <span
              className={`${styles.kpi} ${counts.partial > 0 ? styles.kpiWarning : ""}`}
            >
              Partial: {counts.partial}
            </span>
            <span
              className={`${styles.kpi} ${counts.within24h > 0 ? styles.kpiDanger : ""}`}
            >
              Within 24h: {counts.within24h}
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs} role='tablist' aria-label='Balance type'>
            <button
              type='button'
              className={`tab ${balanceFilter === "all" ? "tabActive" : ""}`}
              onClick={() => setBalanceFilter("all")}
            >
              All ({counts.total})
            </button>
            <button
              type='button'
              className={`tab ${balanceFilter === "unpaid" ? "tabActive" : ""}`}
              onClick={() => setBalanceFilter("unpaid")}
            >
              Never Paid ({counts.unpaid})
            </button>
            <button
              type='button'
              className={`tab ${balanceFilter === "partial" ? "tabActive" : ""}`}
              onClick={() => setBalanceFilter("partial")}
            >
              Balance Due ({counts.partial})
            </button>
          </div>

          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Urgency filter'
          >
            <button
              type='button'
              className={`tab ${urgencyFilter === "all" ? "tabActive" : ""}`}
              onClick={() => setUrgencyFilter("all")}
            >
              All
            </button>
            <button
              type='button'
              className={`tab ${urgencyFilter === "within24h" ? "tabActive" : ""}`}
              onClick={() => setUrgencyFilter("within24h")}
            >
              Within 24h ({counts.within24h})
            </button>
            <button
              type='button'
              className={`tab ${urgencyFilter === "future" ? "tabActive" : ""}`}
              onClick={() => setUrgencyFilter("future")}
            >
              Future
            </button>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{filtered.length}</span>
            <span className={styles.statLabel}>Bookings</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statDanger}`}>
              {formatCurrency(filteredOutstanding, "USD")}
            </span>
            <span className={styles.statLabel}>Outstanding</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span
              className={`${styles.statNumber} ${counts.within24h > 0 ? styles.statDanger : styles.statGood}`}
            >
              {
                filtered.filter((x) => urgencyTone(x.pickupAtIso) === "danger")
                  .length
              }
            </span>
            <span className={styles.statLabel}>Urgent (&lt;24h)</span>
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <p className={styles.emptyText}>
            No outstanding balances. All bookings are paid up.
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Urgency</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Total</th>
                <th className={styles.th}>Paid</th>
                <th className={`${styles.th} ${styles.thRight}`}>
                  Outstanding
                </th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const pickup = formatPickup(b.pickupAtIso, timeZone);
                const tone = urgencyTone(b.pickupAtIso);
                const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}#payment-section`;
                const isNeverPaid = b.balanceType === "unpaid";

                return (
                  <tr
                    key={b.id}
                    className={`${styles.tr} ${styles[`tr_${tone}`]}`}
                  >
                    <td className={styles.td} data-label='Urgency'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span
                          className={`${styles.badge} ${isNeverPaid ? styles.badge_danger : styles.badge_warning}`}
                        >
                          {isNeverPaid ? "Unpaid" : "Balance Due"}
                        </span>
                        {tone === "danger" && (
                          <span
                            className={`${styles.badge} ${styles.badge_danger} ${styles.urgentBadge}`}
                          >
                            Urgent
                          </span>
                        )}
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
                          <span
                            className={`${styles.pill} ${tone === "danger" ? styles.pillDanger : ""}`}
                          >
                            {pickup.rel}
                          </span>
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
                        {b.vehicleName && (
                          <div className={styles.cellSub}>{b.vehicleName}</div>
                        )}
                      </div>
                    </td>

                    <td
                      className={`${styles.td} ${!b.driverName ? styles.unassignedCell : ""}`}
                      data-label='Driver'
                    >
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

                    <td className={styles.td} data-label='Total'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.amountNeutral}>
                          {formatCurrency(b.totalCents, b.currency)}
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Paid'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.amountPaid}>
                          {formatCurrency(b.paidCents, b.currency)}
                        </div>
                      </div>
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight}`}
                      data-label='Outstanding'
                    >
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.amountDue}>
                          {formatCurrency(b.outstandingCents, b.currency)}
                        </div>
                      </div>
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight}`}
                      data-label='Action'
                    >
                      <Link className='primaryBtn' href={href}>
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className={styles.footer}>
          <Link
            href='/admin/bookings?status=PENDING_PAYMENT&range=year'
            className='backBtn'
          >
            View all unpaid bookings →
          </Link>
        </div>
      )}
    </section>
  );
}
