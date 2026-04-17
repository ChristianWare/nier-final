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
    phone?: string | null;
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

function formatTimeOnly(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatDayHeading(iso: string, timeZone: string) {
  const d = new Date(iso);
  const now = new Date();

  // Get today/tomorrow in the target timezone
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  const tomorrowStr = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(now.getTime() + 86400000),
  );
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);

  const longLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);

  if (dateStr === todayStr) return `Today — ${longLabel}`;
  if (dateStr === tomorrowStr) return `Tomorrow — ${longLabel}`;
  return longLabel;
}

function getDayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const mins = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);

  if (diffMs < 0) {
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  if (mins < 60) return `in ${mins}m`;
  if (hours < 24) return `in ${hours}h`;
  return `in ${days}d`;
}

function prettyStatus(s: string) {
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "PENDING_PAYMENT") return "Payment due";
  if (s === "PENDING_REVIEW") return "Pending review";
  if (s === "IN_PROGRESS") return "In Progress";
  if (s === "ASSIGNED") return "Assigned";
  if (s === "EN_ROUTE") return "En Route";
  if (s === "ARRIVED") return "Arrived";
  return s
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(
  s: string,
): "neutral" | "warning" | "danger" | "good" | "active" {
  if (s === "CONFIRMED" || s === "ASSIGNED") return "good";
  if (s === "IN_PROGRESS" || s === "EN_ROUTE" || s === "ARRIVED")
    return "active";
  if (s === "PENDING_REVIEW") return "warning";
  if (s === "PENDING_PAYMENT") return "danger";
  return "neutral";
}

function getTimePeriodEnd(period: TimePeriod, timeZone: string): Date | null {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month] = fmt.format(now).split("-").map(Number);
  switch (period) {
    case "week": {
      const end = new Date(now);
      end.setDate(end.getDate() + (6 - now.getDay()) + 1);
      end.setHours(23, 59, 59, 999);
      return end;
    }
    case "month":
      return new Date(year, month, 0, 23, 59, 59, 999);
    case "year":
      return new Date(year, 11, 31, 23, 59, 59, 999);
    default:
      return null;
  }
}

function isWithinPeriod(iso: string, period: TimePeriod, timeZone: string) {
  if (period === "all") return true;
  const end = getTimePeriodEnd(period, timeZone);
  return end ? new Date(iso) <= end : true;
}

export default function AdminUpcomingRides({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("all");

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
    return {
      total,
      assigned,
      unassigned,
      week: weekItems.length,
      month: monthItems.length,
      year: yearItems.length,
      weekRevenue: weekItems.reduce((s, x) => s + x.totalCents, 0),
      monthRevenue: monthItems.reduce((s, x) => s + x.totalCents, 0),
      yearRevenue: yearItems.reduce((s, x) => s + x.totalCents, 0),
      totalRevenue: items.reduce((s, x) => s + x.totalCents, 0),
    };
  }, [items, timeZone]);

  const filtered = useMemo(() => {
    let list = items.filter((x) =>
      isWithinPeriod(x.pickupAtIso, timePeriod, timeZone),
    );
    if (assignmentFilter === "assigned")
      list = list.filter((x) => x.driverName !== null);
    if (assignmentFilter === "unassigned")
      list = list.filter((x) => x.driverName === null);
    return [...list].sort(
      (a, b) =>
        new Date(a.pickupAtIso).getTime() - new Date(b.pickupAtIso).getTime(),
    );
  }, [items, timePeriod, assignmentFilter, timeZone]);

  // Group by day
  const groupedByDay = useMemo(() => {
    const groups: {
      dayKey: string;
      label: string;
      items: UpcomingRideItem[];
    }[] = [];
    const seen = new Map<string, number>();
    for (const item of filtered) {
      const key = getDayKey(item.pickupAtIso, timeZone);
      if (!seen.has(key)) {
        seen.set(key, groups.length);
        groups.push({
          dayKey: key,
          label: formatDayHeading(item.pickupAtIso, timeZone),
          items: [],
        });
      }
      groups[seen.get(key)!].items.push(item);
    }
    return groups;
  }, [filtered, timeZone]);

  const currentRevenue = useMemo(() => {
    const map: Record<TimePeriod, number> = {
      week: counts.weekRevenue,
      month: counts.monthRevenue,
      year: counts.yearRevenue,
      all: counts.totalRevenue,
    };
    return map[timePeriod];
  }, [timePeriod, counts]);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    const d =
      digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (d.length !== 10) return raw;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

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
            {(["week", "month", "year", "all"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                type='button'
                className={`tab ${timePeriod === p ? "tabActive" : ""}`}
                onClick={() => setTimePeriod(p)}
              >
                {p === "week"
                  ? `This Week (${counts.week})`
                  : p === "month"
                    ? `This Month (${counts.month})`
                    : p === "year"
                      ? `This Year (${counts.year})`
                      : `All (${counts.total})`}
              </button>
            ))}
          </div>
          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Assignment filter'
          >
            {(["all", "assigned", "unassigned"] as AssignmentFilter[]).map(
              (f) => (
                <button
                  key={f}
                  type='button'
                  className={`tab ${assignmentFilter === f ? "tabActive" : ""}`}
                  onClick={() => setAssignmentFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{filtered.length}</span>
            <span className={styles.statLabel}>Rides</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statRevenue}`}>
              {formatCurrency(currentRevenue, "USD")}
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
                <th className={styles.th}>Time</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Route</th>
                <th className={styles.th}>Service / Vehicle</th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Amount</th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {groupedByDay.map((group) => (
                <>
                  {/* Day heading row */}
                  <tr
                    key={`day-${group.dayKey}`}
                    className={styles.dayHeaderRow}
                  >
                    <td colSpan={8} className={styles.dayHeaderCell}>
                      <div className={styles.dayHeaderInner}>
                        <span className={styles.dayHeaderText}>
                          {group.label}
                        </span>
                        <span className={styles.dayHeaderCount}>
                          {group.items.length} ride
                          {group.items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Rides for this day */}
                  {group.items.map((b) => {
                    const time = formatTimeOnly(b.pickupAtIso, timeZone);
                    const rel = formatRelative(b.pickupAtIso);
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
                            <span className={styles.timeValue}>{time}</span>
                            <span className={styles.pill}>{rel}</span>
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
                            {b.customer.email && (
                              <span className={styles.cellSub}>
                                {b.customer.email}
                              </span>
                            )}
                            {b.customer.phone && (
                              <span className={styles.phoneLink}>
                                {formatPhone(b.customer.phone)}
                              </span>
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
                            className={`${styles.routeCell} ${styles.cellInner}`}
                          >
                            <div className={styles.routeRow}>
                              <span
                                className={styles.routeDot}
                                style={{ background: "#22c55e" }}
                              />
                              <span className={styles.routeAddr}>
                                {b.pickupAddress}
                              </span>
                            </div>
                            <div className={styles.routeLine} />
                            <div className={styles.routeRow}>
                              <span
                                className={styles.routeDot}
                                style={{ background: "#ef4444" }}
                              />
                              <span className={styles.routeAddr}>
                                {b.dropoffAddress}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td
                          className={styles.td}
                          data-label='Service / Vehicle'
                        >
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
                              {b.serviceName}
                            </span>
                            {b.vehicleName && (
                              <span className={styles.cellSub}>
                                {b.vehicleName}
                              </span>
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
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
