/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./InvoicesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { Prisma, InvoiceStatus } from "@prisma/client";
import Button from "@/components/shared/Button/Button";
import { formatMoney } from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_TABS = [
  "ALL",
  "DRAFT",
  "SENT",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
] as const;

const STATUS_LABEL: Record<string, string> = {
  ALL: "All",
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

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SearchParams = { status?: string };

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "ALL").toUpperCase();
  const activeStatus = STATUS_TABS.includes(status as any) ? status : "ALL";

  const where: Prisma.InvoiceWhereInput =
    activeStatus === "ALL"
      ? {}
      : { status: activeStatus as InvoiceStatus };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalCents: true,
        amountPaidCents: true,
        currency: true,
        dueDate: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        guestName: true,
        guestEmail: true,
      },
    }),
    db.invoice.count({ where }),
  ]);

  return (
    <section className={styles.container} aria-label="Invoices">
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className="heading h2">Invoices</h1>
            <p className="subheading">
              Charge a customer or guest any amount. They pay through the same
              secure checkout used for bookings and receive an emailed receipt.
            </p>
          </div>
          <Button
            href="/admin/invoices/new"
            btnType="blackReg"
            text="New invoice"
            plus
          />
        </div>

        <div className={styles.tabRow}>
          {STATUS_TABS.map((s) => {
            const href = s === "ALL" ? "/admin/invoices" : `/admin/invoices?status=${s}`;
            const isActive = activeStatus === s;
            return (
              <Link
                key={s}
                href={href}
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              >
                {STATUS_LABEL[s]}
              </Link>
            );
          })}
        </div>
      </header>

      <p className={styles.meta}>
        {total} invoice{total === 1 ? "" : "s"}
      </p>

      {invoices.length === 0 ? (
        <div className={styles.empty}>
          <p>No invoices yet.</p>
          <p className={styles.emptyHint}>
            Create one to bill a customer for anything outside a standard ride.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Status</th>
                <th className={styles.right}>Total</th>
                <th>Due</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const customerName =
                  inv.user?.name ||
                  inv.guestName ||
                  inv.user?.email ||
                  inv.guestEmail ||
                  "—";
                const customerEmail = inv.user?.email || inv.guestEmail || "";
                const isGuest = !inv.user;
                return (
                  <tr key={inv.id}>
                    <td>
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className={styles.invLink}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td>
                      <div className={styles.customerCell}>
                        <span className={styles.customerName}>
                          {customerName}
                          {isGuest && (
                            <span className={styles.guestTag}>Guest</span>
                          )}
                        </span>
                        {customerEmail && (
                          <span className={styles.customerEmail}>
                            {customerEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${STATUS_BADGE[inv.status] ?? "badge_neutral"}`}
                      >
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className={styles.right}>
                      {formatMoney(inv.totalCents, inv.currency.toUpperCase())}
                      {inv.amountPaidCents > 0 &&
                        inv.amountPaidCents < inv.totalCents && (
                          <span className={styles.paidHint}>
                            {formatMoney(
                              inv.amountPaidCents,
                              inv.currency.toUpperCase(),
                            )}{" "}
                            paid
                          </span>
                        )}
                    </td>
                    <td>{fmtDate(inv.dueDate)}</td>
                    <td>{fmtDate(inv.createdAt)}</td>
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