"use client";

import styles from "./AdminTodaysRides.module.css";
import Link from "next/link";

export type TodaysRideItem = {
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
    phone: string | null;
  };
};

type Props = {
  items: TodaysRideItem[];
  timeZone: string;
  bookingHrefBase?: string;
};

function formatCurrency(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatPickupTime(iso: string, timeZone: string, status: string) {
  const d = new Date(iso);
  const now = new Date();

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

  let rel: string;
  let urgency: "now" | "soon" | "later" | "past" | "overdue" = "later";

  if (diffMs < 0) {
    // Past pickup time
    rel = mins < 60 ? `${mins}m ago` : `${hours}h ago`;

    // Check if it should have been completed but wasn't
    if (status === "COMPLETED") {
      urgency = "past"; // Normal past - completed as expected
    } else {
      urgency = "overdue"; // Problem - not completed yet!
    }
  } else if (mins <= 15) {
    rel = mins === 0 ? "Now" : `in ${mins}m`;
    urgency = "now";
  } else if (mins <= 60) {
    rel = `in ${mins}m`;
    urgency = "soon";
  } else {
    rel = `in ${hours}h`;
    urgency = "later";
  }

  return { timeLabel, rel, urgency };
}

function prettyStatus(s: string) {
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "IN_PROGRESS") return "In Progress";
  if (s === "PENDING_PAYMENT") return "Payment due";
  if (s === "PENDING_REVIEW") return "Pending review";
  if (s === "COMPLETED") return "Completed";
  if (s === "CANCELLED") return "Cancelled";
  const parts = String(s).split("_").filter(Boolean);
  if (!parts.length) return String(s);
  return parts
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(
  s: string,
): "neutral" | "warning" | "danger" | "good" | "active" {
  if (s === "CONFIRMED") return "good";
  if (s === "IN_PROGRESS") return "active";
  if (s === "PENDING_REVIEW") return "warning";
  if (s === "PENDING_PAYMENT") return "danger";
  if (s === "COMPLETED") return "good";
  if (s === "CANCELLED") return "neutral";
  return "neutral";
}

function getTodayLabel(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function AdminTodaysRides({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const todayLabel = getTodayLabel(timeZone);

  // Sort by pickup time (earliest first)
  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(a.pickupAtIso).getTime() - new Date(b.pickupAtIso).getTime(),
  );

  // Count stats
  const completedCount = items.filter((i) => i.status === "COMPLETED").length;
  const inProgressCount = items.filter(
    (i) => i.status === "IN_PROGRESS",
  ).length;
  const upcomingCount = items.filter(
    (i) => !["COMPLETED", "CANCELLED", "IN_PROGRESS"].includes(i.status),
  ).length;

  // Count overdue (past pickup time but not completed)
  const now = new Date();
  const overdueCount = items.filter((i) => {
    const pickupTime = new Date(i.pickupAtIso);
    return (
      pickupTime < now && i.status !== "COMPLETED" && i.status !== "CANCELLED"
    );
  }).length;

  return (
    <section className={styles.container} aria-label="Today's rides">
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className='cardTitle h4'>Today&apos;s Rides</h2>
            <span className={styles.dateLabel}>{todayLabel}</span>
          </div>
          <Link href='/admin/bookings' className='backBtn'>
            View all bookings →
          </Link>
        </div>

        {items.length > 0 && (
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{items.length}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={`${styles.statNumber} ${styles.statUpcoming}`}>
                {upcomingCount}
              </span>
              <span className={styles.statLabel}>Upcoming</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={`${styles.statNumber} ${styles.statActive}`}>
                {inProgressCount}
              </span>
              <span className={styles.statLabel}>In Progress</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={`${styles.statNumber} ${styles.statCompleted}`}>
                {completedCount}
              </span>
              <span className={styles.statLabel}>Completed</span>
            </div>
            {overdueCount > 0 && (
              <>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <span
                    className={`${styles.statNumber} ${styles.statOverdue}`}
                  >
                    {overdueCount}
                  </span>
                  <span className={styles.statLabel}>Overdue</span>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Legend */}
      {items.length > 0 && (
        <div className={styles.legend}>
          <span className={styles.legendTitle}>Legend:</span>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDot_now}`} />
              <span>Starting now (≤15 min)</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_soon}`}
              />
              <span>Starting soon (≤1 hr)</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_later}`}
              />
              <span>Later today</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_inProgress}`}
              />
              <span>In progress</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_past}`}
              />
              <span>Completed</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_overdue}`}
              />
              <span>Overdue (needs attention)</span>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <p className={styles.emptyText}>No rides scheduled for today.</p>
          <Link href='/admin/bookings/new' className='primaryBtn'>
            Create a booking
          </Link>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Time</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Route</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Amount</th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {sortedItems.map((b) => {
                const pickup = formatPickupTime(
                  b.pickupAtIso,
                  timeZone,
                  b.status,
                );
                const statusClass = statusTone(b.status);
                const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;

                // Determine row state - IN_PROGRESS overrides time-based urgency
                const rowState =
                  b.status === "IN_PROGRESS" ? "inProgress" : pickup.urgency;

                return (
                  <tr
                    key={b.id}
                    className={`${styles.tr} ${styles[`tr_${rowState}`]}`}
                  >
                    <td className={styles.td} data-label='Time'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
                        <span className={styles.timeLabel}>
                          {pickup.timeLabel}
                        </span>
                        <span
                          className={`${styles.timePill} ${styles[`timePill_${pickup.urgency}`]}`}
                        >
                          {pickup.rel}
                        </span>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Status'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span
                          className={`${styles.badge} ${styles[`badge_${statusClass}`]}`}
                        >
                          {prettyStatus(b.status)}
                        </span>
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
                        <span className={styles.rowLink}>
                          {b.customer.name}
                        </span>
                        {b.customer.phone && (
                          <a
                            href={`tel:${b.customer.phone.replace(/[^0-9+]/g, "")}`}
                            className={styles.phoneLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {b.customer.phone}
                          </a>
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
                        <div className={styles.routeItem}>
                          <span className={styles.routeIcon}>📍</span>
                          <span className={styles.routeText}>
                            {b.pickupAddress}
                          </span>
                        </div>
                        <div className={styles.routeItem}>
                          <span className={styles.routeIcon}>🏁</span>
                          <span className={styles.routeText}>
                            {b.dropoffAddress}
                          </span>
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
                      <div className={styles.cellInner}>
                        <div className={styles.cellStack}>
                          <span className={styles.rowLink}>
                            {b.serviceName}
                          </span>
                          {b.vehicleName && (
                            <span className={styles.cellSub}>
                              {b.vehicleName}
                            </span>
                          )}
                        </div>
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
                        <span className={styles.rowLink}>
                          {b.driverName ?? "Unassigned"}
                        </span>
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
                        <span className={styles.amount}>
                          {formatCurrency(b.totalCents, b.currency)}
                        </span>
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
