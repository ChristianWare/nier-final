import styles from "./CorporateAccountsPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { CorporateAccountStatus, Prisma } from "@prisma/client";
import Button from "@/components/shared/Button/Button";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "ACTIVE", "SUSPENDED", "CLOSED"] as const;
type StatusFilter = (typeof STATUSES)[number];

const PAGE_SIZE = 15;

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

function statusBadgeTone(status: CorporateAccountStatus) {
  if (status === "ACTIVE") return "good";
  if (status === "SUSPENDED") return "warn";
  return "bad";
}

function paymentTermsLabel(terms: string) {
  switch (terms) {
    case "NET_15":
      return "NET 15";
    case "NET_30":
      return "NET 30";
    case "NET_45":
      return "NET 45";
    case "DUE_ON_RECEIPT":
      return "Due on Receipt";
    default:
      return terms;
  }
}

function billingCycleLabel(cycle: string) {
  switch (cycle) {
    case "MONTHLY":
      return "Monthly";
    case "WEEKLY":
      return "Weekly";
    case "PER_RIDE":
      return "Per Ride";
    default:
      return cycle;
  }
}

type SearchParams = {
  status?: string;
  q?: string;
  page?: string;
};

export default async function AdminCorporateAccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status: StatusFilter = STATUSES.includes(sp.status as StatusFilter)
    ? (sp.status as StatusFilter)
    : "ALL";
  const q = (sp.q ?? "").trim();
  const page = clampPage(sp.page);
  const { timezone: companyTz } = await getCompanySettings();

  // Build where clause
  const where: Prisma.CorporateAccountWhereInput = {};

  if (status !== "ALL") {
    where.status = status as CorporateAccountStatus;
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { billingEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  // Parallel queries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalCount, accounts, statusCountsArr] = await Promise.all([
    db.corporateAccount.count({ where }),
    db.corporateAccount.findMany({
      where,
      include: {
        _count: {
          select: {
            contacts: true,
            passengers: true,
            bookings: { where: { pickupAt: { gte: monthStart } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    Promise.all(
      STATUSES.map(async (s) => {
        const w = s === "ALL" ? {} : { status: s as CorporateAccountStatus };
        const c = await db.corporateAccount.count({
          where: { ...w, ...(q ? { OR: where.OR } : {}) },
        });
        return [s, c] as const;
      }),
    ),
  ]);

  const statusCounts = Object.fromEntries(statusCountsArr) as Record<
    StatusFilter,
    number
  >;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const baseParams: Record<string, string | undefined> = {
    status: status === "ALL" ? undefined : status,
    q: q || undefined,
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
            <h1 className={`${styles.heading} h2`}>Corporate Accounts</h1>
          </div>

          <div className={styles.headerActions}>
            <Button
              href='/admin/corporate/inquiries'
              text='View Inquiries'
              btnType='blackReg'
            />
          </div>

          <div className={styles.meta}>
            <strong>{totalCount}</strong> account
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
                const href = buildHref("/admin/corporate", {
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
                    {s === "ALL"
                      ? "All"
                      : s.charAt(0) + s.slice(1).toLowerCase()}
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

      {accounts.length === 0 ? (
        <div className={styles.empty}>
          <p className='emptyTitle'>No corporate accounts found.</p>
          <p className='emptyCopy'>
            Accounts are created when you approve a corporate inquiry.
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Company</th>
                  <th className={styles.th}>Billing Email</th>
                  <th className={styles.th}>Terms</th>
                  <th className={styles.th}>Cycle</th>
                  <th className={styles.th}>Discount</th>
                  <th className={styles.th}>Rides (Month)</th>
                  <th className={styles.th}>Contacts</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const href = `/admin/corporate/${a.id}`;
                  return (
                    <tr key={a.id} className={styles.tr}>
                      <td className={styles.td}>
                        <Link href={href} className={styles.rowStretchedLink} />
                        <div className={styles.cellStrong}>
                          <Link href={href} className={styles.rowLink}>
                            {a.name}
                          </Link>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        <div className={styles.cellSub}>{a.billingEmail}</div>
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {paymentTermsLabel(a.paymentTerms)}
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {billingCycleLabel(a.billingCycle)}
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {a.discountPercent ? `${a.discountPercent}%` : "—"}
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        <strong>{a._count.bookings}</strong>
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {a._count.contacts}
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        <span
                          className={`badge badge_${statusBadgeTone(a.status)}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {tz.formatDate(a.createdAt, companyTz)}
                      </td>
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

  const prevHref = buildHref("/admin/corporate", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });
  const nextHref = buildHref("/admin/corporate", {
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
