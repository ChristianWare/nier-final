/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./AdminPaymentsSnapshot.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

export type PaymentItem = {
  id: string;
  bookingId: string;
  paidAt: Date | null;
  amountCents: number;
  tipCents: number;
  currency: string;
  status: "PAID" | "PENDING" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  customerName: string;
  customerEmail: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
};

type Props = {
  paymentsToday: PaymentItem[];
  paymentsThisWeek: PaymentItem[];
  paymentLinksToday: PaymentItem[];
  paymentLinksThisWeek: PaymentItem[];
  timeZone?: string;
  bookingHrefBase?: string;
};

type TabBucket =
  | "received_today"
  | "received_week"
  | "links_today"
  | "links_week";

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateTime(d: Date | null, timeZone?: string) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
}

function formatTime(d: Date | null, timeZone?: string) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function statusTone(status: PaymentItem["status"]) {
  switch (status) {
    case "PAID":
      return "good";
    case "PENDING":
      return "warn";
    case "FAILED":
      return "bad";
    case "REFUNDED":
      return "neutral";
    case "PARTIALLY_REFUNDED":
      return "warn";
    default:
      return "neutral";
  }
}

function statusLabel(status: PaymentItem["status"]) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partial refund";
    default:
      return status;
  }
}

function tabLabel(tab: TabBucket) {
  switch (tab) {
    case "received_today":
      return "Received today";
    case "received_week":
      return "Received this week";
    case "links_today":
      return "Links sent today";
    case "links_week":
      return "Links sent this week";
    default:
      return "All";
  }
}

export default function AdminPaymentsSnapshot({
  paymentsToday,
  paymentsThisWeek,
  paymentLinksToday,
  paymentLinksThisWeek,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [activeTab, setActiveTab] = useState<TabBucket>("received_today");

  const stats = useMemo(() => {
    const todayTotal = paymentsToday.reduce((sum, p) => sum + p.amountCents, 0);
    const todayTips = paymentsToday.reduce((sum, p) => sum + p.tipCents, 0);
    const weekTotal = paymentsThisWeek.reduce(
      (sum, p) => sum + p.amountCents,
      0,
    );
    const weekTips = paymentsThisWeek.reduce((sum, p) => sum + p.tipCents, 0);

    return {
      todayCount: paymentsToday.length,
      todayTotal,
      todayTips,
      weekCount: paymentsThisWeek.length,
      weekTotal,
      weekTips,
      linksToday: paymentLinksToday.length,
      linksWeek: paymentLinksThisWeek.length,
    };
  }, [
    paymentsToday,
    paymentsThisWeek,
    paymentLinksToday,
    paymentLinksThisWeek,
  ]);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case "received_today":
        return paymentsToday;
      case "received_week":
        return paymentsThisWeek;
      case "links_today":
        return paymentLinksToday;
      case "links_week":
        return paymentLinksThisWeek;
      default:
        return paymentsToday;
    }
  }, [
    activeTab,
    paymentsToday,
    paymentsThisWeek,
    paymentLinksToday,
    paymentLinksThisWeek,
  ]);

  const isReceivedTab =
    activeTab === "received_today" || activeTab === "received_week";

  return (
    <section className={styles.container} aria-label='Payments snapshot'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.cc}>💳</span>
            Payments
          </h2>

          <div className={styles.kpis}>
            <span className={`${styles.kpi} ${styles.kpiGood}`}>
              Today: {formatMoney(stats.todayTotal)} ({stats.todayCount}{" "}
              payments)
            </span>
            <span className={styles.kpi}>
              This week: {formatMoney(stats.weekTotal)} ({stats.weekCount}{" "}
              payments)
            </span>
            {stats.todayTips > 0 && (
              <span className={`${styles.kpi} ${styles.kpiAccent}`}>
                Tips today: {formatMoney(stats.todayTips)}
              </span>
            )}
            <span className={styles.kpi}>
              Links sent today: {stats.linksToday}
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Payment filter'
          >
            {(
              [
                "received_today",
                "received_week",
                "links_today",
                "links_week",
              ] as TabBucket[]
            ).map((tab) => (
              <button
                key={tab}
                type='button'
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tabLabel(tab)}
                <span className={styles.tabCount}>
                  {tab === "received_today" && stats.todayCount}
                  {tab === "received_week" && stats.weekCount}
                  {tab === "links_today" && stats.linksToday}
                  {tab === "links_week" && stats.linksWeek}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {currentList.length === 0 ? (
        <div className={styles.emptyState}>
          <p className='emptySmall'>
            {isReceivedTab
              ? "No payments received yet."
              : "No payment links sent yet."}
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {currentList.map((payment) => {
            const href = `${bookingHrefBase}/${payment.bookingId}`;
            const route = `${shortAddress(payment.pickupAddress)} → ${shortAddress(payment.dropoffAddress)}`;

            return (
              <li key={payment.id} className={styles.row}>
                <div className={styles.left}>
                  <div className={styles.paymentHeader}>
                    <span
                      className={`badge badge_${statusTone(payment.status)}`}
                    >
                      {statusLabel(payment.status)}
                    </span>
                    <span className={styles.paymentAmount}>
                      {formatMoney(payment.amountCents, payment.currency)}
                    </span>
                    {payment.tipCents > 0 && (
                      <span className={styles.paymentTip}>
                        +{formatMoney(payment.tipCents, payment.currency)} tip
                      </span>
                    )}
                  </div>

                  <div className={styles.paymentDetails}>
                    <span className='emptyTitle'>{payment.customerName}</span>
                    {payment.customerEmail && (
                      <span className='miniNote'>{payment.customerEmail}</span>
                    )}
                  </div>

                  <div className={styles.paymentMeta}>
                    <span className='miniNote'>{payment.serviceName}</span>
                    <span className='miniNote'>{route}</span>
                    <span className='miniNote'>
                      {isReceivedTab ? "Paid" : "Sent"}:{" "}
                      {formatDateTime(payment.paidAt, timeZone)}
                    </span>
                  </div>
                </div>

                <Link className='primaryBtn' href={href}>
                  View
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
