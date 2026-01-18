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
  timeZone: string; // e.g. "America/Phoenix"
  bookingHrefBase?: string; // defaults to "/admin/bookings"
};

type Bucket = "review" | "payment" | "all";
type CustomerFilter = "all" | "guests" | "accounts";

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function formatPickup(iso: string, timeZone: string) {
  const d = new Date(iso);

  // “Today / Tomorrow” label in the given timezone
  const now = new Date();
  const dayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayKey = dayFmt.format(now);
  const pickupKey = dayFmt.format(d);

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowKey = dayFmt.format(tomorrow);

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

  const prefix =
    pickupKey === todayKey
      ? "Today"
      : pickupKey === tomorrowKey
        ? "Tomorrow"
        : date;

  // simple relative label
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

function statusLabel(s: string) {
  return s.replaceAll("_", " ").toLowerCase();
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

    // bucket
    if (bucket === "review")
      list = list.filter((x) => x.status === "PENDING_REVIEW");
    if (bucket === "payment")
      list = list.filter((x) => x.status === "PENDING_PAYMENT");

    // customer filter
    if (customerFilter === "guests")
      list = list.filter((x) => x.customer.kind === "guest");
    if (customerFilter === "accounts")
      list = list.filter((x) => x.customer.kind === "account");

    // priority-ish sort: review first, then payment, then created desc (within bucket this is stable)
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
              className={`${styles.tab} ${bucket === "review" ? styles.tabActive : ""}`}
              onClick={() => setBucket("review")}
            >
              Needs review
            </button>
            <button
              type='button'
              className={`${styles.tab} ${bucket === "payment" ? styles.tabActive : ""}`}
              onClick={() => setBucket("payment")}
            >
              Awaiting payment
            </button>
            <button
              type='button'
              className={`${styles.tab} ${bucket === "all" ? styles.tabActive : ""}`}
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
              className={`${styles.tab} ${customerFilter === "all" ? styles.tabActive : ""}`}
              onClick={() => setCustomerFilter("all")}
            >
              All
            </button>
            <button
              type='button'
              className={`${styles.tab} ${customerFilter === "guests" ? styles.tabActive : ""}`}
              onClick={() => setCustomerFilter("guests")}
            >
              Guests
            </button>
            <button
              type='button'
              className={`${styles.tab} ${customerFilter === "accounts" ? styles.tabActive : ""}`}
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
        <ul className={styles.list}>
          {filtered.map((b) => {
            const pickup = formatPickup(b.pickupAtIso, timeZone);
            const route = `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`;
            const tone = statusTone(b.status);

            const customerLine =
              b.customer.kind === "guest"
                ? `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}${
                    b.customer.phone ? ` • ${b.customer.phone}` : ""
                  }`
                : `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}`;

            const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;

            const primaryCta =
              b.status === "PENDING_REVIEW"
                ? "Review"
                : b.status === "PENDING_PAYMENT"
                  ? "Collect payment"
                  : "View";

            return (
              <li key={b.id} className={styles.row}>
                <div className={styles.left}>
                  <div className={styles.badgeContainer}>
                    <span
                      className={`${styles.badge} ${styles[`badge_${tone}`]}`}
                    >
                      {statusLabel(b.status)}
                    </span>
                  </div>
                  {/* <div className={styles.topLine}> */}
                  <div className={styles.infoBox}>
                    <span className='emptyTitle underline'>
                      {pickup.label}{" "}
                    </span>
                    <span className={styles.rel}>({pickup.rel})</span>
                  </div>

                  <div className={styles.infoBox}>
                    <span className='emptyTitle underline'>Service</span>
                    <span className={styles.rel}>{b.serviceName}</span>
                  </div>
                  <div className={styles.infoBox}>
                    <span className='emptyTitle underline'>Vehicle</span>
                    <span className={styles.rel}>
                      {b.vehicleName ? ` ${b.vehicleName}` : ""}
                    </span>
                  </div>
                  <div className={styles.infoBox}>
                    <span className='emptyTitle underline'>Route</span>
                    <span className={styles.rel}>{route}</span>
                  </div>
                  <div className={styles.infoBox}>
                    <span className='emptyTitle underline'>Client</span>
                    <span className={styles.rel}>{customerLine}</span>
                  </div>
                </div>

                <div className={styles.right}>
                  <Link className='primaryBtn' href={href}>
                    {primaryCta}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
