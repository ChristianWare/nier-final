import styles from "./CorporateInvoicesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { CorporateInvoiceStatus, Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "ALL",
  "DRAFT",
  "SENT",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "VOID",
] as const;
type StatusFilter = (typeof STATUSES)[number];

const PAGE_SIZE = 20;

function buildHref(
  base: string,
  params: Record<string, string | undefined | null>,
) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    const s = String(v).trim();
    if (s) usp.set(k, s);
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

function clampPage(raw: string | undefined) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return Math.floor(n);
}

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function statusBadgeTone(status: CorporateInvoiceStatus) {
  if (status === "PAID") return "good";
  if (status === "SENT") return "accent";
  if (status === "DRAFT") return "neutral";
  if (status === "PARTIALLY_PAID") return "warn";
  if (status === "OVERDUE") return "bad";
  if (status === "VOID") return "neutral";
  return "neutral";
}

function statusTabLabel(s: StatusFilter) {
  switch (s) {
    case "ALL":
      return "All";
    case "DRAFT":
      return "Draft";
    case "SENT":
      return "Sent";
    case "PAID":
      return "Paid";
    case "PARTIALLY_PAID":
      return "Partial";
    case "OVERDUE":
      return "Overdue";
    case "VOID":
      return "Void";
    default:
      return s;
  }
}

type SearchParams = {
  status?: string;
  page?: string;
};

export default async function AdminCorporateInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status: StatusFilter = STATUSES.includes(sp.status as StatusFilter)
    ? (sp.status as StatusFilter)
    : "ALL";
  const page = clampPage(sp.page);

  const where: Prisma.CorporateInvoiceWhereInput = {};
  if (status !== "ALL") {
    where.status = status as CorporateInvoiceStatus;
  }

  const [totalCount, invoices, statusCountsArr, totals] = await Promise.all([
    db.corporateInvoice.count({ where }),
    db.corporateInvoice.findMany({
      where,
      include: {
        corporateAccount: { select: { name: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    Promise.all(
      STATUSES.map(async (s) => {
        const w = s === "ALL" ? {} : { status: s as CorporateInvoiceStatus };
        const c = await db.corporateInvoice.count({ where: w });
        return [s, c] as const;
      }),
    ),
    db.corporateInvoice.aggregate({
      where,
      _sum: { totalCents: true, amountPaidCents: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(statusCountsArr) as Record<
    StatusFilter,
    number
  >;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const totalInvoiced = totals._sum.totalCents ?? 0;
  const totalPaid = totals._sum.amountPaidCents ?? 0;
  const totalOutstanding = totalInvoiced - totalPaid;

  const baseParams: Record<string, string | undefined> = {
    status: status === "ALL" ? undefined : status,
  };
  const pageParams = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>Corporate Invoices</h1>
          </div>

          <Link href='/admin/corporate' className='backBtn'>
            ← Back to Accounts
          </Link>

          {/* Summary KPIs */}
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Total Invoiced</div>
              <div className='kpiValue'>{formatMoney(totalInvoiced)}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Total Paid</div>
              <div className='kpiValue'>{formatMoney(totalPaid)}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Outstanding</div>
              <div
                className={`kpiValue ${totalOutstanding > 0 ? "colorRed" : ""}`}
              >
                {formatMoney(totalOutstanding)}
              </div>
            </div>
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{totalCount}</strong> invoice
            {totalCount !== 1 ? "s" : ""}
            {totalCount > 0 && (
              <span className={styles.metaSep}>
                • Page <strong className='emptyTitleSmall'>{safePage}</strong>{" "}
                of <strong className='emptyTitleSmall'>{totalPages}</strong>
              </span>
            )}
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Status</div>
            <div className={styles.tabRow}>
              {STATUSES.map((s) => {
                const href = buildHref("/admin/corporate/invoices", {
                  ...baseParams,
                  status: s === "ALL" ? undefined : s,
                  page: undefined,
                });
                const isActive = s === status;
                return (
                  <Link
                    key={s}
                    href={href}
                    className={`tab ${isActive ? "tabActive" : ""}`}
                  >
                    {statusTabLabel(s)}
                    <span
                      className={`countPill ${isActive ? "countPillWhiteText" : ""}`}
                    >
                      {statusCounts[s] ?? 0}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {invoices.length === 0 ? (
        <div className={styles.empty}>
          <p className='emptyTitle'>No invoices found.</p>
          <p className='emptyCopy'>
            Corporate invoices will appear here once generated.
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Invoice #</th>
                  <th className={styles.th}>Account</th>
                  <th className={styles.th}>Period</th>
                  <th className={styles.th}>Line Items</th>
                  <th className={styles.th}>Total</th>
                  <th className={styles.th}>Paid</th>
                  <th className={styles.th}>Balance</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Due Date</th>
                  <th className={styles.th}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const balance = inv.totalCents - inv.amountPaidCents;
                  const accountHref = `/admin/corporate/${inv.corporateAccountId}`;
                  return (
                    <tr key={inv.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.cellStrong}>
                          {inv.invoiceNumber}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <Link href={accountHref} className={styles.inlineLink}>
                          {inv.corporateAccount.name}
                        </Link>
                      </td>
                      <td className={styles.td}>
                        {formatDate(inv.periodStart)} –{" "}
                        {formatDate(inv.periodEnd)}
                      </td>
                      <td className={styles.td}>{inv._count.lineItems}</td>
                      <td className={styles.td}>
                        <div className={styles.cellStrong}>
                          {formatMoney(inv.totalCents)}
                        </div>
                      </td>
                      <td className={styles.td}>
                        {formatMoney(inv.amountPaidCents)}
                      </td>
                      <td className={styles.td}>
                        <div className={balance > 0 ? styles.balanceDue : ""}>
                          {formatMoney(balance)}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span
                          className={`badge badge_${statusBadgeTone(inv.status)}`}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className={styles.td}>{formatDate(inv.dueDate)}</td>
                      <td className={styles.td}>{formatDate(inv.sentAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        totalCount={totalCount}
        page={safePage}
        totalPages={totalPages}
        current={pageParams}
      />
    </section>
  );
}

function Pagination({
  totalCount,
  page,
  totalPages,
  current,
}: {
  totalCount: number;
  page: number;
  totalPages: number;
  current: Record<string, string | undefined>;
}) {
  if (totalCount === 0) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const prevHref = buildHref("/admin/corporate/invoices", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });
  const nextHref = buildHref("/admin/corporate/invoices", {
    ...current,
    page: String(page + 1),
  });

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationLeft}>
        <span className={styles.paginationMeta}>
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>
      </div>
      <div className={styles.paginationRight}>
        {hasPrev ? (
          <Link className={styles.pageBtn} href={prevHref}>
            Prev
          </Link>
        ) : (
          <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>
            Prev
          </span>
        )}
        {hasNext ? (
          <Link className={styles.pageBtn} href={nextHref}>
            Next
          </Link>
        ) : (
          <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>
            Next
          </span>
        )}
      </div>
    </div>
  );
}
