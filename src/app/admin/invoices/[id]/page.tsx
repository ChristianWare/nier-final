/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./InvoiceDetail.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/timezone";
import InvoiceActions from "./InvoiceActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  VOID: "badge_bad",
};

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Invoice created",
  SENT: "Sent to customer",
  VIEWED: "Viewed by customer",
  PARTIALLY_PAID: "Partial payment received",
  PAID: "Marked paid",
  VOIDED: "Voided",
  REMINDER_SENT: "Reminder sent",
};

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = { params: Promise<{ id: string }> };

export default async function AdminInvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      memo: true,
      internalNotes: true,
      subtotalCents: true,
      totalCents: true,
      amountPaidCents: true,
      tipCents: true,
      allowTip: true,
      currency: true,
      dueDate: true,
      sentAt: true,
      paidAt: true,
      createdAt: true,
      receiptUrl: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      createdBy: { select: { name: true, email: true } },
      lineItems: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          description: true,
          quantity: true,
          unitAmountCents: true,
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          eventType: true,
          metadata: true,
          createdAt: true,
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!invoice) notFound();

  const currency = (invoice.currency ?? "usd").toUpperCase();
  const balanceDueCents = invoice.totalCents - invoice.amountPaidCents;
  const isGuest = !invoice.user;
  const customerName =
    invoice.user?.name || invoice.guestName || "—";
  const customerEmail = invoice.user?.email || invoice.guestEmail || "";
  const customerPhone = invoice.user?.phone || invoice.guestPhone || "";

  return (
    <section className={styles.container} aria-label="Invoice detail">
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <Link href="/admin/invoices" className={styles.backLink}>
              ← All invoices
            </Link>
            <div className={styles.titleRow}>
              <h1 className="heading h2">{invoice.invoiceNumber}</h1>
              <span
                className={`badge ${STATUS_BADGE[invoice.status] ?? "badge_neutral"}`}
              >
                {STATUS_LABEL[invoice.status] ?? invoice.status}
              </span>
            </div>
            <p className={styles.createdMeta}>
              Created {fmtDate(invoice.createdAt)}
              {invoice.createdBy?.name
                ? ` by ${invoice.createdBy.name}`
                : ""}
            </p>
          </div>

          <div className={styles.headerAmount}>
            <span className={styles.amountLabel}>
              {balanceDueCents > 0 ? "Balance due" : "Total"}
            </span>
            <span className={styles.amountValue}>
              {formatMoney(
                balanceDueCents > 0 ? balanceDueCents : invoice.totalCents,
                currency,
              )}
            </span>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {/* ── Left: invoice body ── */}
        <div className={styles.main}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Line items</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className={styles.center}>Qty</th>
                  <th className={styles.right}>Unit</th>
                  <th className={styles.right}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td>{li.description}</td>
                    <td className={styles.center}>{li.quantity}</td>
                    <td className={styles.right}>
                      {formatMoney(li.unitAmountCents, currency)}
                    </td>
                    <td className={styles.right}>
                      {formatMoney(li.quantity * li.unitAmountCents, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotalCents, currency)}</span>
              </div>
              {invoice.tipCents > 0 && (
                <div className={styles.totalRow}>
                  <span>Tip</span>
                  <span>{formatMoney(invoice.tipCents, currency)}</span>
                </div>
              )}
              {invoice.amountPaidCents > 0 && (
                <div className={styles.totalRow}>
                  <span>Paid</span>
                  <span>
                    −{formatMoney(invoice.amountPaidCents, currency)}
                  </span>
                </div>
              )}
              <div className={`${styles.totalRow} ${styles.grand}`}>
                <span>{balanceDueCents > 0 ? "Balance due" : "Total"}</span>
                <span>
                  {formatMoney(
                    balanceDueCents > 0 ? balanceDueCents : invoice.totalCents,
                    currency,
                  )}
                </span>
              </div>
            </div>

            {invoice.memo && (
              <div className={styles.memo}>
                <span className={styles.memoLabel}>Memo to customer</span>
                <p>{invoice.memo}</p>
              </div>
            )}
            {invoice.internalNotes && (
              <div className={styles.internalNote}>
                <span className={styles.memoLabel}>Internal notes</span>
                <p>{invoice.internalNotes}</p>
              </div>
            )}
          </div>

          {/* ── Activity ── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Activity</h2>
            <ul className={styles.activity}>
              {invoice.events.map((e) => {
                const meta = (e.metadata ?? {}) as any;
                return (
                  <li key={e.id} className={styles.activityRow}>
                    <div className={styles.activityDot} />
                    <div className={styles.activityBody}>
                      <span className={styles.activityLabel}>
                        {EVENT_LABEL[e.eventType] ?? e.eventType}
                      </span>
                      <span className={styles.activityMeta}>
                        {fmtDateTime(e.createdAt)}
                        {e.createdBy?.name ? ` · ${e.createdBy.name}` : ""}
                        {meta?.recipientEmail
                          ? ` · ${meta.recipientEmail}`
                          : ""}
                        {meta?.manual ? " · manual" : ""}
                        {meta?.note ? ` · “${meta.note}”` : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ── Right: customer + actions ── */}
        <aside className={styles.side}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Customer</h2>
            <div className={styles.customer}>
              <span className={styles.customerName}>
                {customerName}
                {isGuest && <span className={styles.guestTag}>Guest</span>}
              </span>
              {customerEmail && (
                <span className={styles.customerLine}>{customerEmail}</span>
              )}
              {customerPhone && (
                <span className={styles.customerLine}>{customerPhone}</span>
              )}
              {invoice.user && (
                <Link
                  href={`/admin/users?q=${encodeURIComponent(customerEmail)}`}
                  className={styles.viewAccount}
                >
                  View account →
                </Link>
              )}
            </div>

            <div className={styles.metaList}>
              <div className={styles.metaRow}>
                <span>Due date</span>
                <span>{fmtDate(invoice.dueDate)}</span>
              </div>
              <div className={styles.metaRow}>
                <span>Sent</span>
                <span>{invoice.sentAt ? fmtDate(invoice.sentAt) : "—"}</span>
              </div>
              <div className={styles.metaRow}>
                <span>Paid</span>
                <span>{invoice.paidAt ? fmtDate(invoice.paidAt) : "—"}</span>
              </div>
              <div className={styles.metaRow}>
                <span>Tips</span>
                <span>{invoice.allowTip ? "Enabled" : "Off"}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Actions</h2>
            <InvoiceActions
              invoiceId={invoice.id}
              status={invoice.status}
              customerEmail={customerEmail || null}
              payPath={`/pay/invoice/${invoice.id}`}
              balanceDueCents={balanceDueCents}
              receiptUrl={invoice.receiptUrl}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}