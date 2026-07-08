"use client";

import styles from "./AdminInvoicesSnapshot.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

export type AdminInvoiceItem = {
  id: string;
  invoiceNumber: string;
  status: string; // DRAFT | SENT | PARTIALLY_PAID | PAID | VOID
  totalCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  currency: string;
  customerName: string;
  customerEmail: string | null;
  isGuest: boolean;
  createdAtIso: string;
  sentAtIso: string | null;
  dueDateIso: string | null;
  paidAtIso: string | null;
};

type Props = {
  items: AdminInvoiceItem[];
  timeZone: string;
  invoiceHrefBase?: string;
};

type Filter = "outstanding" | "overdue" | "paid" | "draft" | "all";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  VOID: "Void",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge_neutral",
  SENT: "badge_accent",
  PARTIALLY_PAID: "badge_warn",
  PAID: "badge_good",
  VOID: "badge_neutral",
};

function formatCurrency(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((cents || 0) / 100);
}

function formatDate(iso: string | null, timeZone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function isOverdue(item: AdminInvoiceItem) {
  if (item.status !== "SENT" && item.status !== "PARTIALLY_PAID") return false;
  if (!item.dueDateIso) return false;
  return new Date(item.dueDateIso).getTime() < Date.now();
}

function isOutstanding(item: AdminInvoiceItem) {
  return item.status === "SENT" || item.status === "PARTIALLY_PAID";
}

export default function AdminInvoicesSnapshot({
  items,
  timeZone,
  invoiceHrefBase = "/admin/invoices",
}: Props) {
  const stats = useMemo(() => {
    const outstanding = items.filter(isOutstanding);
    const overdue = items.filter(isOverdue);
    const drafts = items.filter((x) => x.status === "DRAFT");
    const paid = items.filter((x) => x.status === "PAID");
    const totalOutstandingCents = outstanding.reduce(
      (sum, x) => sum + x.balanceDueCents,
      0,
    );
    return {
      total: items.length,
      outstanding: outstanding.length,
      overdue: overdue.length,
      drafts: drafts.length,
      paid: paid.length,
      totalOutstandingCents,
    };
  }, [items]);

  const initialFilter: Filter =
    stats.outstanding > 0 ? "outstanding" : stats.drafts > 0 ? "draft" : "all";
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const filtered = useMemo(() => {
    let list = items.slice();
    if (filter === "outstanding") list = list.filter(isOutstanding);
    else if (filter === "overdue") list = list.filter(isOverdue);
    else if (filter === "paid") list = list.filter((x) => x.status === "PAID");
    else if (filter === "draft")
      list = list.filter((x) => x.status === "DRAFT");

    return list.sort((a, b) => {
      // Outstanding first, then by most recent activity
      const aKey = a.dueDateIso || a.sentAtIso || a.createdAtIso;
      const bKey = b.dueDateIso || b.sentAtIso || b.createdAtIso;
      return new Date(aKey).getTime() - new Date(bKey).getTime();
    });
  }, [items, filter]);

  return (
    <section className={styles.container} aria-label="Invoices">
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className="cardTitle h4">Invoices</h2>
          <div className={styles.kpis}>
            <span className={styles.kpi}>Total: {stats.total}</span>
            <span
              className={`${styles.kpi} ${stats.outstanding > 0 ? styles.kpiWarning : ""}`}
            >
              Outstanding: {stats.outstanding}
            </span>
            <span
              className={`${styles.kpi} ${stats.overdue > 0 ? styles.kpiDanger : ""}`}
            >
              Overdue: {stats.overdue}
            </span>
            <span className={styles.kpi}>Drafts: {stats.drafts}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs} role="tablist" aria-label="Invoice filter">
            <button
              type="button"
              className={`tab ${filter === "outstanding" ? "tabActive" : ""}`}
              onClick={() => setFilter("outstanding")}
            >
              Outstanding ({stats.outstanding})
            </button>
            <button
              type="button"
              className={`tab ${filter === "overdue" ? "tabActive" : ""}`}
              onClick={() => setFilter("overdue")}
            >
              Overdue ({stats.overdue})
            </button>
            <button
              type="button"
              className={`tab ${filter === "draft" ? "tabActive" : ""}`}
              onClick={() => setFilter("draft")}
            >
              Drafts ({stats.drafts})
            </button>
            <button
              type="button"
              className={`tab ${filter === "paid" ? "tabActive" : ""}`}
              onClick={() => setFilter("paid")}
            >
              Paid ({stats.paid})
            </button>
            <button
              type="button"
              className={`tab ${filter === "all" ? "tabActive" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({stats.total})
            </button>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{filtered.length}</span>
            <span className={styles.statLabel}>Showing</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statDanger}`}>
              {formatCurrency(stats.totalOutstandingCents)}
            </span>
            <span className={styles.statLabel}>Outstanding total</span>
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🧾</span>
          <span className={styles.emptyText}>Nothing here right now.</span>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.trHead}>
                <th className={styles.th}>Invoice</th>
                <th className={styles.th}>Customer</th>
                <th className={styles.th}>Status</th>
                <th className={`${styles.th} ${styles.thRight}`}>Amount due</th>
                <th className={styles.th}>Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const overdue = isOverdue(inv);
                const toneClass = overdue
                  ? styles.tr_danger
                  : isOutstanding(inv)
                    ? styles.tr_warning
                    : styles.tr_neutral;
                const amount =
                  inv.balanceDueCents > 0
                    ? inv.balanceDueCents
                    : inv.totalCents;
                return (
                  <tr key={inv.id} className={`${styles.tr} ${toneClass}`}>
                    <td className={styles.td}>
                      <Link
                        href={`${invoiceHrefBase}/${inv.id}`}
                        className={styles.rowLink}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.cellStack}>
                        <span>
                          {inv.customerName}
                          {inv.isGuest && (
                            <span className={styles.guestTag}>Guest</span>
                          )}
                        </span>
                        {inv.customerEmail && (
                          <span className={styles.cellSub}>
                            {inv.customerEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`badge ${STATUS_BADGE[inv.status] ?? "badge_neutral"}`}
                      >
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      <span
                        className={
                          inv.balanceDueCents > 0
                            ? styles.amountDue
                            : styles.amountPaid
                        }
                      >
                        {formatCurrency(amount, inv.currency)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={overdue ? styles.overdueText : ""}>
                        {formatDate(inv.dueDateIso, timeZone)}
                        {overdue && (
                          <span className={styles.overduePill}>Overdue</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.footer}>
        <Link href={invoiceHrefBase} className={styles.footerLink}>
          Manage all invoices →
        </Link>
      </div>
    </section>
  );
}