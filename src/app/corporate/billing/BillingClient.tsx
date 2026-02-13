"use client";

import { useState, useMemo, useTransition } from "react";
import styles from "./CorporateBilling.module.css";
import Modal from "@/components/shared/Modal/Modal";
import InvoicePreview from "@/components/Dashboard/InvoicePreview/InvoicePreview";
import { getCorporateInvoiceData } from "../../../../actions/corporate/getCorporateInvoiceData";
import type { InvoiceData } from "@/lib/invoice/types";
import toast from "react-hot-toast";

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
  invoiceNumber: string;
  bookingConfirmation: string | null;
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
  companyTimezone: string;
};

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

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

function formatDate(iso: string, timeZone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatPeriod(start: string, end: string, timeZone: string) {
  if (!start || !end) return "—";
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(new Date(start));
  const e = new Intl.DateTimeFormat("en-US", {
    timeZone,
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
  companyTimezone,
}: Props) {
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [isLoadingPreview, startPreviewTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);

  const tabCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: invoices.length };
    for (const inv of invoices) {
      map[inv.status] = (map[inv.status] ?? 0) + 1;
    }
    if (map.PARTIALLY_PAID) {
      map.SENT = (map.SENT ?? 0) + map.PARTIALLY_PAID;
    }
    return map;
  }, [invoices]);

  const filtered = useMemo(() => {
    if (statusTab === "ALL") return invoices;
    if (statusTab === "SENT")
      return invoices.filter(
        (i) => i.status === "SENT" || i.status === "PARTIALLY_PAID",
      );
    return invoices.filter((i) => i.status === statusTab);
  }, [invoices, statusTab]);

  function handleInvoiceClick(invoiceId: string) {
    setPreviewInvoiceId(invoiceId);
    setPreviewData(null);
    setPreviewOpen(true);

    startPreviewTransition(async () => {
      const result = await getCorporateInvoiceData(invoiceId);
      if (result.ok) {
        setPreviewData(result.data);
      } else {
        toast.error(result.error ?? "Failed to load invoice.");
        setPreviewOpen(false);
      }
    });
  }

  async function handleDownload() {
    if (!previewInvoiceId || !previewData) return;

    setIsDownloading(true);

    try {
      const response = await fetch(
        `/api/corporate-invoices/${previewInvoiceId}/download`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download invoice");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${previewData.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to download invoice",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <h2 className='heading h3'>Billing</h2>
        <p className={styles.meta}>
          Invoices and payment history for your corporate account.
        </p>
      </div>

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

      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Invoices</h3>
      </div>

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
                  <tr
                    key={inv.id}
                    className={`${styles.tr} ${styles.trClickable}`}
                    onClick={() => handleInvoiceClick(inv.id)}
                  >
                    <td className={styles.td}>
                      <span className={styles.cellStrong}>
                        {inv.invoiceNumber}
                      </span>
                      {inv.bookingConfirmation && (
                        <span className={styles.cellSub}>
                          Booking #{inv.bookingConfirmation}
                        </span>
                      )}
                    </td>

                    <td className={styles.td}>
                      {formatPeriod(
                        inv.periodStart,
                        inv.periodEnd,
                        companyTimezone,
                      )}
                    </td>

                    <td className={styles.td}>
                      {inv.dueDate ? (
                        <span
                          className={
                            inv.status === "OVERDUE" ? styles.textRed : ""
                          }
                        >
                          {formatDate(inv.dueDate, companyTimezone)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className={styles.td}>{inv.lineItemCount}</td>

                    <td className={styles.td}>
                      <span
                        className={`${styles.badge} ${invoiceBadgeClass(inv.status)}`}
                      >
                        {formatLabel(inv.status)}
                      </span>
                    </td>

                    <td className={`${styles.td} ${styles.tdRight}`}>
                      {formatMoneyExact(inv.totalCents)}
                    </td>

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

      <Modal
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewData(null);
          setPreviewInvoiceId(null);
        }}
      >
        <div className={styles.invoiceModalContent}>
          {isLoadingPreview || !previewData ? (
            <div className={styles.invoiceLoading}>
              <div className={styles.spinner} />
              <span>Loading invoice…</span>
            </div>
          ) : (
            <InvoicePreview
              invoice={previewData}
              onDownload={handleDownload}
              isDownloading={isDownloading}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
