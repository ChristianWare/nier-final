"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./CorporateBookings.module.css";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

type Booking = {
  id: string;
  status: string;
  pickupAt: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalCents: number;
  currency: string;
  service: string;
  passengerName: string;
  passengerId: string;
  driverName: string;
};

type Passenger = { id: string; name: string };

type Props = {
  bookings: Booking[];
  passengers: Passenger[];
  statusCounts: Record<string, number>;
  totalCount: number;
  spendThisMonthCents: number;
};

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const PAGE_SIZE = 20;

const PHX_TZ = "America/Phoenix";

const STATUS_TABS = [
  "ALL",
  "UPCOMING",
  "CONFIRMED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

const CANCELLED_STATUSES = new Set([
  "CANCELLED",
  "REFUNDED",
  "NO_SHOW",
  "DECLINED",
]);

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function formatPickupDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function formatPickupTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function shortAddress(address: string) {
  if (!address) return "—";
  return address.split(",")[0]?.trim() || address;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "ASSIGNED":
      return styles.badgeGreen;
    case "PENDING_REVIEW":
    case "PENDING_PAYMENT":
      return styles.badgeAmber;
    case "EN_ROUTE":
    case "ARRIVED":
    case "IN_PROGRESS":
      return styles.badgeBlue;
    case "COMPLETED":
      return styles.badgeNeutral;
    case "CANCELLED":
    case "REFUNDED":
    case "NO_SHOW":
    case "DECLINED":
      return styles.badgeRed;
    default:
      return styles.badgeNeutral;
  }
}

function statusLabel(s: string) {
  return s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function BookingsClient({
  bookings,
  passengers,
  statusCounts,
  totalCount,
  spendThisMonthCents,
}: Props) {
  // ─── Filters ───
const router = useRouter();

// ─── Filters ───
const [search, setSearch] = useState("");  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [passengerFilter, setPassengerFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // ─── Tab counts ───
  const tabCounts = useMemo(() => {
    const all = totalCount;
    const now = new Date();
    const upcoming = bookings.filter(
      (b) => new Date(b.pickupAt) >= now && !CANCELLED_STATUSES.has(b.status),
    ).length;

    const map: Record<string, number> = { ALL: all, UPCOMING: upcoming };
    for (const [status, count] of Object.entries(statusCounts)) {
      map[status] = count;
    }
    return map;
  }, [bookings, statusCounts, totalCount]);

  // ─── Filtered bookings ───
  const filtered = useMemo(() => {
    const now = new Date();
    const q = search.toLowerCase().trim();
    const fromDate = dateFrom ? new Date(dateFrom + "T00:00:00-07:00") : null;
    const toDate = dateTo ? new Date(dateTo + "T23:59:59-07:00") : null;

    return bookings.filter((b) => {
      // Status tab
      if (statusTab === "UPCOMING") {
        if (new Date(b.pickupAt) < now || CANCELLED_STATUSES.has(b.status))
          return false;
      } else if (statusTab === "CANCELLED") {
        if (!CANCELLED_STATUSES.has(b.status)) return false;
      } else if (statusTab !== "ALL") {
        if (b.status !== statusTab) return false;
      }

      // Passenger filter
      if (passengerFilter !== "ALL" && b.passengerId !== passengerFilter)
        return false;

      // Date range
      if (fromDate && new Date(b.pickupAt) < fromDate) return false;
      if (toDate && new Date(b.pickupAt) > toDate) return false;

      // Search
      if (q) {
        const haystack = [
          b.passengerName,
          b.pickupAddress,
          b.dropoffAddress,
          b.service,
          b.driverName,
          b.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [bookings, search, statusTab, passengerFilter, dateFrom, dateTo]);

  // ─── Pagination ───
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageBookings = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Reset page when filters change
  function updateFilter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div className={styles.content}>
      <div className='heading'>
        <div>
          <h1 className='h3'>Bookings</h1>
        </div>
      </div>
      <p className={styles.meta}>
        <strong>{totalCount}</strong> total bookings
        {spendThisMonthCents > 0 && (
          <>
            {" "}
            · <strong>{formatMoney(spendThisMonthCents)}</strong> this month
          </>
        )}
      </p>

      {/* ─── Status Tabs ─── */}
      <div className={styles.tabRow}>
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab] ?? 0;
          const isActive = statusTab === tab;
          return (
            <button
              key={tab}
              className={`tab ${isActive ? "tabActive" : ""}`}
              onClick={() => updateFilter(setStatusTab)(tab)}
            >
              {tab === "ALL"
                ? "All"
                : tab === "UPCOMING"
                  ? "Upcoming"
                  : statusLabel(tab)}
              <span
                className={`countPill ${isActive ? "countPillWhiteText" : ""}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Filters ─── */}
      <div className={styles.filters}>
        <input
          type='text'
          placeholder='Search passenger, address, service…'
          value={search}
          onChange={(e) => updateFilter(setSearch)(e.target.value)}
          className='inputBorder'
        />

        <div className={styles.filterGroup}>
          <select
            value={passengerFilter}
            onChange={(e) => updateFilter(setPassengerFilter)(e.target.value)}
            // className={`formInput ${styles.selectInput}`}
            className='selectBorder'
          >
            <option value='ALL'>All passengers</option>
            {passengers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type='date'
            value={dateFrom}
            onChange={(e) => updateFilter(setDateFrom)(e.target.value)}
            className='inputBorder'
            title='From date'
          />
          <input
            type='date'
            value={dateTo}
            onChange={(e) => updateFilter(setDateTo)(e.target.value)}
            className='inputBorder'
            title='To date'
          />

          {(search ||
            statusTab !== "ALL" ||
            passengerFilter !== "ALL" ||
            dateFrom ||
            dateTo) && (
            <button
              className='neutralBtn'
              onClick={() => {
                setSearch("");
                setStatusTab("ALL");
                setPassengerFilter("ALL");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Table / Empty State ─── */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No bookings found</p>
          <p className={styles.emptySub}>
            {totalCount === 0
              ? "Bookings made for your corporate account will appear here."
              : "Try adjusting your filters or search query."}
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Date & Time</th>
                  <th className={styles.th}>Passenger</th>
                  <th className={styles.th}>Route</th>
                  <th className={styles.th}>Service</th>
                  <th className={styles.th}>Driver</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Fare</th>
                </tr>
              </thead>
              <tbody>
                {pageBookings.map((b) => (
                  <tr
                    key={b.id}
                    className={styles.tr}
                    onClick={() => router.push(`/corporate/bookings/${b.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {" "}
                    {/* Date & Time */}
                    <td className={styles.td}>
                      <span className={styles.cellStrong}>
                        {formatPickupDate(b.pickupAt)}
                      </span>
                      <span className={styles.cellSub}>
                        {formatPickupTime(b.pickupAt)}
                      </span>
                    </td>
                    {/* Passenger */}
                    <td className={styles.td}>
                      <span className={styles.cellStrong}>
                        {b.passengerName}
                      </span>
                    </td>
                    {/* Route */}
                    <td className={styles.td}>
                      <span className={styles.cellStrong}>
                        {shortAddress(b.pickupAddress)}
                      </span>
                      <span className={styles.cellSub}>
                        → {shortAddress(b.dropoffAddress)}
                      </span>
                    </td>
                    {/* Service */}
                    <td className={styles.td}>{b.service}</td>
                    {/* Driver */}
                    <td className={styles.td}>
                      {b.driverName || (
                        <span className={styles.cellMuted}>Unassigned</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className={styles.td}>
                      <span
                        className={`${styles.badge} ${statusBadgeClass(b.status)}`}
                      >
                        {statusLabel(b.status)}
                      </span>
                    </td>
                    {/* Fare */}
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      {b.totalCents > 0 ? formatMoney(b.totalCents) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Table Footer / Pagination ─── */}
          <div className={styles.tableFooter}>
            <div className={styles.pagination}>
              <span className={styles.paginationMeta}>
                Showing {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>

              {totalPages > 1 && (
                <div className={styles.paginationBtns}>
                  <button
                    className='neutralBtn'
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    Previous
                  </button>
                  <span className={styles.paginationMeta}>
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    className='neutralBtn'
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
