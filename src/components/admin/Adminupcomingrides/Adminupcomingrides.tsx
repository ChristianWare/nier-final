/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./Adminupcomingrides.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

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

type TimePeriod = "week" | "month" | "year" | "all";
type AssignmentFilter = "all" | "assigned" | "unassigned";

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
  if (s === "IN_PROGRESS") return "In Progress";
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
  return "neutral";
}

function getTimePeriodBounds(period: TimePeriod, timeZone: string) {
  const now = new Date();

  // Get current date in timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayStr = formatter.format(now);
  const [year, month, day] = todayStr.split("-").map(Number);

  // Calculate end dates based on period
  switch (period) {
    case "week": {
      // End of current week (Saturday)
      const dayOfWeek = now.getDay();
      const daysUntilSaturday = 6 - dayOfWeek;
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + daysUntilSaturday + 1);
      endDate.setHours(23, 59, 59, 999);
      return endDate;
    }
    case "month": {
      // End of current month
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      return endDate;
    }
    case "year": {
      // End of current year
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      return endDate;
    }
    case "all":
    default:
      return null; // No upper bound
  }
}

function isWithinPeriod(
  isoDate: string,
  period: TimePeriod,
  timeZone: string,
): boolean {
  if (period === "all") return true;

  const date = new Date(isoDate);
  const endBound = getTimePeriodBounds(period, timeZone);

  if (!endBound) return true;

  return date <= endBound;
}

export default function AdminUpcomingRides({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("all");

  // Calculate counts for each time period
  const counts = useMemo(() => {
    const total = items.length;
    const assigned = items.filter((x) => x.driverName !== null).length;
    const unassigned = total - assigned;

    const weekItems = items.filter((x) =>
      isWithinPeriod(x.pickupAtIso, "week", timeZone),
    );
    const monthItems = items.filter((x) =>
      isWithinPeriod(x.pickupAtIso, "month", timeZone),
    );
    const yearItems = items.filter((x) =>
      isWithinPeriod(x.pickupAtIso, "year", timeZone),
    );

    // Calculate revenue
    const weekRevenue = weekItems.reduce((sum, x) => sum + x.totalCents, 0);
    const monthRevenue = monthItems.reduce((sum, x) => sum + x.totalCents, 0);
    const yearRevenue = yearItems.reduce((sum, x) => sum + x.totalCents, 0);
    const totalRevenue = items.reduce((sum, x) => sum + x.totalCents, 0);

    return {
      total,
      assigned,
      unassigned,
      week: weekItems.length,
      month: monthItems.length,
      year: yearItems.length,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      totalRevenue,
    };
  }, [items, timeZone]);

  // Filter items based on selections
  const filtered = useMemo(() => {
    let list = items.slice();

    // Filter by time period
    list = list.filter((x) =>
      isWithinPeriod(x.pickupAtIso, timePeriod, timeZone),
    );

    // Filter by assignment status
    if (assignmentFilter === "assigned") {
      list = list.filter((x) => x.driverName !== null);
    }
    if (assignmentFilter === "unassigned") {
      list = list.filter((x) => x.driverName === null);
    }

    // Sort by pickup time (earliest first)
    list.sort((a, b) => {
      return (
        new Date(a.pickupAtIso).getTime() - new Date(b.pickupAtIso).getTime()
      );
    });

    return list;
  }, [items, timePeriod, assignmentFilter, timeZone]);

  // Get current period revenue for display
  const currentPeriodRevenue = useMemo(() => {
    switch (timePeriod) {
      case "week":
        return counts.weekRevenue;
      case "month":
        return counts.monthRevenue;
      case "year":
        return counts.yearRevenue;
      case "all":
      default:
        return counts.totalRevenue;
    }
  }, [timePeriod, counts]);

  return (
    <section className={styles.container} aria-label='Upcoming rides'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>Upcoming Rides</h2>

          <div className={styles.kpis}>
            <span className={styles.kpi}>Total: {counts.total}</span>
            <span className={styles.kpi}>This Week: {counts.week}</span>
            <span className={styles.kpi}>This Month: {counts.month}</span>
            <span
              className={`${styles.kpi} ${counts.unassigned > 0 ? styles.kpiWarning : ""}`}
            >
              Unassigned: {counts.unassigned}
            </span>
            <span className={styles.kpi}>Assigned: {counts.assigned}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs} role='tablist' aria-label='Time period'>
            <button
              type='button'
              className={`tab ${timePeriod === "week" ? "tabActive" : ""}`}
              onClick={() => setTimePeriod("week")}
            >
              This Week ({counts.week})
            </button>
            <button
              type='button'
              className={`tab ${timePeriod === "month" ? "tabActive" : ""}`}
              onClick={() => setTimePeriod("month")}
            >
              This Month ({counts.month})
            </button>
            <button
              type='button'
              className={`tab ${timePeriod === "year" ? "tabActive" : ""}`}
              onClick={() => setTimePeriod("year")}
            >
              This Year ({counts.year})
            </button>
            <button
              type='button'
              className={`tab ${timePeriod === "all" ? "tabActive" : ""}`}
              onClick={() => setTimePeriod("all")}
            >
              All ({counts.total})
            </button>
          </div>

          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Assignment filter'
          >
            <button
              type='button'
              className={`tab ${assignmentFilter === "all" ? "tabActive" : ""}`}
              onClick={() => setAssignmentFilter("all")}
            >
              All
            </button>
            <button
              type='button'
              className={`tab ${assignmentFilter === "assigned" ? "tabActive" : ""}`}
              onClick={() => setAssignmentFilter("assigned")}
            >
              Assigned
            </button>
            <button
              type='button'
              className={`tab ${assignmentFilter === "unassigned" ? "tabActive" : ""}`}
              onClick={() => setAssignmentFilter("unassigned")}
            >
              Unassigned
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{filtered.length}</span>
            <span className={styles.statLabel}>Rides</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statRevenue}`}>
              {formatCurrency(currentPeriodRevenue, "USD")}
            </span>
            <span className={styles.statLabel}>Expected Revenue</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span
              className={`${styles.statNumber} ${filtered.filter((x) => !x.driverName).length > 0 ? styles.statWarning : styles.statGood}`}
            >
              {filtered.filter((x) => !x.driverName).length}
            </span>
            <span className={styles.statLabel}>Need Drivers</span>
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🚗</div>
          <p className={styles.emptyText}>
            No upcoming rides match your filters.
          </p>
          <Link href='/admin/bookings/new' className='primaryBtn'>
            Create a booking
          </Link>
        </div>
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
              {filtered.map((b) => {
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

      {/* Footer with View All link */}
      {filtered.length > 0 && (
        <div className={styles.footer}>
          <Link href='/admin/bookings?status=CONFIRMED' className='backBtn'>
            View all bookings →
          </Link>
        </div>
      )}
    </section>
  );
}
