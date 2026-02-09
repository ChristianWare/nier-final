"use client";

import { useState, useMemo } from "react";
import styles from "./CorporateBilling.module.css";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

type AccountBilling = {
  billingEmail: string;
  billingCycle: string;
  paymentMethod: string;
  paymentTerms: string;
  discountPercent: number | null;
  monthlyLimitCents: number | null;
};

type Invoice = {
  id: string;
  status: string;
  totalCents: number;
  amountPaidCents: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  sentAt: string;
  paidAt: string;
  createdAt: string;
  lineItemCount: number;
};

type Props = {
  account: AccountBilling;
  invoices: Invoice[];
  spendThisMonthCents: number;
  spendAllTimeCents: number;
  outstandingCents: number;
  ridesThisMonth: number;
};

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const PHX_TZ = "America/Phoenix";

const STATUS_TABS = ["ALL", "SENT", "OVERDUE", "PAID", "VOID"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMoneyExact(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatPeriod(start: string, end: string) {
  if (!start || !end) return "—";
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
  }).format(new Date(start));
  const e = new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(end));
  return `${s} – ${e}`;
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function invoiceBadgeClass(status: string) {
  switch (status) {
    case "PAID":
      return styles.badgeGreen;
    case "SENT":
      return styles.badgeAmber;
    case "OVERDUE":
      return styles.badgeRed;
    case "PARTIALLY_PAID":
      return styles.badgeBlue;
    case "DRAFT":
      return styles.badgeNeutral;
    case "VOID":
      return styles.badgeNeutral;
    default:
      return styles.badgeNeutral;
  }
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function BillingClient({
  account,
  invoices,
  spendThisMonthCents,
  spendAllTimeCents,
  outstandingCents,
  ridesThisMonth,
}: Props) {
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");

  // Tab counts
  const tabCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: invoices.length };
    for (const inv of invoices) {
      map[inv.status] = (map[inv.status] ?? 0) + 1;
    }
    // Merge PARTIALLY_PAID into SENT for display
    if (map.PARTIALLY_PAID) {
      map.SENT = (map.SENT ?? 0) + map.PARTIALLY_PAID;
    }
    return map;
  }, [invoices]);

  // Filtered invoices
  const filtered = useMemo(() => {
    if (statusTab === "ALL") return invoices;
    if (statusTab === "SENT")
      return invoices.filter(
        (i) => i.status === "SENT" || i.status === "PARTIALLY_PAID",
      );
    return invoices.filter((i) => i.status === statusTab);
  }, [invoices, statusTab]);

  return (
    <div className={styles.content}>
      {/* ─── Header ─── */}
      <div className={styles.header}>
        <h2 className='heading h3'>Billing</h2>
        <p className={styles.meta}>
          Invoices and payment history for your corporate account.
        </p>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Spend This Month</span>
          <span className={styles.kpiValue}>
            {formatMoney(spendThisMonthCents)}
          </span>
          <span className={styles.kpiSub}>
            {ridesThisMonth} ride{ridesThisMonth !== 1 ? "s" : ""}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Outstanding Balance</span>
          <span
            className={`${styles.kpiValue} ${outstandingCents > 0 ? styles.kpiWarn : ""}`}
          >
            {formatMoney(outstandingCents)}
          </span>
          <span className={styles.kpiSub}>
            {outstandingCents > 0 ? "Payment due" : "All clear"}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Spend</span>
          <span className={styles.kpiValue}>
            {formatMoney(spendAllTimeCents)}
          </span>
          <span className={styles.kpiSub}>All time</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Payment Terms</span>
          <span className={styles.kpiValue}>
            {formatLabel(account.paymentTerms)}
          </span>
          <span className={styles.kpiSub}>
            {formatLabel(account.billingCycle)} ·{" "}
            {formatLabel(account.paymentMethod)}
          </span>
        </div>
      </div>

      {/* ─── Monthly limit progress ─── */}
      {account.monthlyLimitCents && account.monthlyLimitCents > 0 && (
        <div className={styles.limitCard}>
          <div className={styles.limitTop}>
            <span className={styles.limitLabel}>Monthly Limit</span>
            <span className={styles.limitValue}>
              {formatMoney(spendThisMonthCents)} /{" "}
              {formatMoney(account.monthlyLimitCents)}
            </span>
          </div>
          <div className={styles.limitBarBg}>
            <div
              className={styles.limitBarFill}
              style={{
                ["--limit-pct" as string]: `${Math.min(100, Math.round((spendThisMonthCents / account.monthlyLimitCents) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ─── Invoices Section ─── */}
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Invoices</h3>
      </div>

      {/* Status Tabs */}
      <div className={styles.tabRow}>
        {STATUS_TABS.map((tab) => {
          const count = tabCounts[tab] ?? 0;
          const isActive = statusTab === tab;
          return (
            <button
              key={tab}
              className={`tab ${isActive ? "tabActive" : ""}`}
              onClick={() => setStatusTab(tab)}
            >
              {tab === "ALL" ? "All" : formatLabel(tab)}
              <span
                className={`countPill ${isActive ? "countPillWhiteText" : ""}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Invoices Table / Empty */}
      {invoices.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No invoices yet</p>
          <p className={styles.emptySub}>
            Invoices from Nier Transportation will appear here once generated.
            Your billing cycle is set to{" "}
            <strong>{formatLabel(account.billingCycle).toLowerCase()}</strong>.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No invoices match this filter</p>
          <p className={styles.emptySub}>
            Try selecting a different status tab.
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Invoice</th>
                  <th className={styles.th}>Period</th>
                  <th className={styles.th}>Due Date</th>
                  <th className={styles.th}>Rides</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Amount</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Paid</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className={styles.tr}>
                    {/* Invoice ID */}
                    <td className={styles.td}>
                      <span className={styles.cellStrong}>
                        {inv.id.slice(-8).toUpperCase()}
                      </span>
                      <span className={styles.cellSub}>
                        Created {formatDate(inv.createdAt)}
                      </span>
                    </td>

                    {/* Period */}
                    <td className={styles.td}>
                      {formatPeriod(inv.periodStart, inv.periodEnd)}
                    </td>

                    {/* Due Date */}
                    <td className={styles.td}>
                      {inv.dueDate ? (
                        <span
                          className={
                            inv.status === "OVERDUE" ? styles.textRed : ""
                          }
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Rides */}
                    <td className={styles.td}>{inv.lineItemCount}</td>

                    {/* Status */}
                    <td className={styles.td}>
                      <span
                        className={`${styles.badge} ${invoiceBadgeClass(inv.status)}`}
                      >
                        {formatLabel(inv.status)}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      {formatMoneyExact(inv.totalCents)}
                    </td>

                    {/* Paid */}
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      {inv.amountPaidCents > 0
                        ? formatMoneyExact(inv.amountPaidCents)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
