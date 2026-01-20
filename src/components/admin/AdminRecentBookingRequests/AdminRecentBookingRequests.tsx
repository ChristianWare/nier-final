"use client";

import styles from "./AdminRecentBookingRequests.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

export type RecentBookingRequestItem = {
  id: string;
  status: "PENDING_REVIEW" | "PENDING_PAYMENT" | string;

  createdAtIso: string;
  pickupAtIso: string;

  pickupAddress: string;
  dropoffAddress: string;

  serviceName: string;
  vehicleName: string | null;

  airportLeg: "NONE" | "PICKUP" | "DROPOFF";

  specialRequests: string | null;

  customer:
    | {
        kind: "guest";
        name: string;
        email: string | null;
        phone: string | null;
      }
    | {
        kind: "account";
        name: string;
        email: string | null;
        verified: boolean;
      };
};

type Props = {
  items: RecentBookingRequestItem[];
  timeZone: string;
  bookingHrefBase?: string;
};

type Bucket = "review" | "payment" | "all";
type CustomerFilter = "all" | "guests" | "accounts";

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function formatAt(iso: string, timeZone: string) {
  const d = new Date(iso);
  const now = new Date();

  const dayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayKey = dayFmt.format(now);
  const dKey = dayFmt.format(d);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);

  const prefix = dKey === todayKey ? "Today" : date;

  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const rel =
    diffMin >= 0
      ? diffMin < 60
        ? `in ${diffMin}m`
        : `in ${Math.round(diffMin / 60)}h`
      : diffMin > -60
        ? `${Math.abs(diffMin)}m ago`
        : `${Math.abs(Math.round(diffMin / 60))}h ago`;

  return { label: `${prefix} • ${time}`, rel };
}

function prettyStatus(s: string) {
  if (s === "PENDING_REVIEW") return "Pending review";
  if (s === "PENDING_PAYMENT") return "Payment due";
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

export default function AdminRecentBookingRequests({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [bucket, setBucket] = useState<Bucket>("review");
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter>("all");

  const counts = useMemo(() => {
    const total = items.length;
    const guests = items.filter((x) => x.customer.kind === "guest").length;
    const accounts = total - guests;
    const review = items.filter((x) => x.status === "PENDING_REVIEW").length;
    const pay = items.filter((x) => x.status === "PENDING_PAYMENT").length;
    return { total, guests, accounts, review, pay };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items.slice();

    if (bucket === "review")
      list = list.filter((x) => x.status === "PENDING_REVIEW");
    if (bucket === "payment")
      list = list.filter((x) => x.status === "PENDING_PAYMENT");

    if (customerFilter === "guests")
      list = list.filter((x) => x.customer.kind === "guest");
    if (customerFilter === "accounts")
      list = list.filter((x) => x.customer.kind === "account");

    list.sort((a, b) => {
      const aw =
        a.status === "PENDING_REVIEW"
          ? 1
          : a.status === "PENDING_PAYMENT"
            ? 2
            : 9;
      const bw =
        b.status === "PENDING_REVIEW"
          ? 1
          : b.status === "PENDING_PAYMENT"
            ? 2
            : 9;
      if (aw !== bw) return aw - bw;

      const at = new Date(a.createdAtIso).getTime();
      const bt = new Date(b.createdAtIso).getTime();
      return bt - at;
    });

    return list;
  }, [items, bucket, customerFilter]);

  return (
    <section className={styles.container} aria-label='Recent booking requests'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>Recent booking requests</h2>

          <div className={styles.kpis}>
            <span className={styles.kpi}>Total: {counts.total}</span>
            <span className={styles.kpi}>Guests: {counts.guests}</span>
            <span className={styles.kpi}>Accounts: {counts.accounts}</span>
            <span className={styles.kpi}>Needs review: {counts.review}</span>
            <span className={styles.kpi}>Awaiting payment: {counts.pay}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Request bucket'
          >
            <button
              type='button'
              className={`tab ${bucket === "review" ? "tabActive" : ""}`}
              onClick={() => setBucket("review")}
            >
              Needs review
            </button>
            <button
              type='button'
              className={`tab ${bucket === "payment" ? "tabActive" : ""}`}
              onClick={() => setBucket("payment")}
            >
              Awaiting payment
            </button>
            <button
              type='button'
              className={`tab ${bucket === "all" ? "tabActive" : ""}`}
              onClick={() => setBucket("all")}
            >
              All
            </button>
          </div>

          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Customer filter'
          >
            <button
              type='button'
              className={`tab ${customerFilter === "all" ? "tabActive" : ""}`}
              onClick={() => setCustomerFilter("all")}
            >
              All
            </button>
            <button
              type='button'
              className={`tab ${customerFilter === "guests" ? "tabActive" : ""}`}
              onClick={() => setCustomerFilter("guests")}
            >
              Guests
            </button>
            <button
              type='button'
              className={`tab ${customerFilter === "accounts" ? "tabActive" : ""}`}
              onClick={() => setCustomerFilter("accounts")}
            >
              Accounts
            </button>
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className='emptySmall'>No items match your filters.</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Created</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Vehicle</th>
                <th className={styles.th}>Route</th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((b) => {
                const created = formatAt(b.createdAtIso, timeZone);
                const pickup = formatAt(b.pickupAtIso, timeZone);
                const tone = statusTone(b.status);

                const route = `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`;
                const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;

                const customerLine =
                  b.customer.kind === "guest"
                    ? `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}${
                        b.customer.phone ? ` • ${b.customer.phone}` : ""
                      }`
                    : `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}`;

                const primaryCta =
                  b.status === "PENDING_REVIEW"
                    ? "Review"
                    : b.status === "PENDING_PAYMENT"
                      ? "Collect payment"
                      : "View";

                return (
                  <tr key={b.id} className={styles.tr}>
                    <td className={styles.td} data-label='Status'>
                      <span
                        className={`${styles.badge} ${styles[`badge_${tone}`]}`}
                      >
                        {prettyStatus(b.status)}
                      </span>
                    </td>

                    <td className={styles.td} data-label='Created'>
                      <div className={styles.cellStack}>
                        <Link href={href} className={styles.rowLink}>
                          {created.label}
                        </Link>
                        <div className={styles.cellMeta}>
                          <span className={styles.pill}>{created.rel}</span>
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Pickup'>
                      <div className={styles.cellStack}>
                        <Link href={href} className={styles.rowLink}>
                          {pickup.label}
                        </Link>
                        <div className={styles.cellMeta}>
                          <span className={styles.pill}>{pickup.rel}</span>
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Client'>
                      <div className={styles.cellStack}>
                        <Link href={href} className={styles.rowLink}>
                          {b.customer.kind === "guest" ? "Guest" : "Account"}
                        </Link>
                        <div className={styles.cellSub}>{customerLine}</div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Service'>
                      <div className={styles.cellStrong}>{b.serviceName}</div>
                    </td>

                    <td className={styles.td} data-label='Vehicle'>
                      <div className={styles.cellStrong}>
                        {b.vehicleName ?? "—"}
                      </div>
                    </td>

                    <td className={styles.td} data-label='Route'>
                      <div className={styles.route}>{route}</div>
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight}`}
                      data-label='Action'
                    >
                      <Link className='primaryBtn' href={href}>
                        {primaryCta}
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
