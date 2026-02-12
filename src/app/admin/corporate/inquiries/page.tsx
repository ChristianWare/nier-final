import styles from "./CorporateInquiriesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { CorporateInquiryStatus, Prisma } from "@prisma/client";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { formatDateTime } from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "ALL",
  "PENDING",
  "CONTACTED",
  "APPROVED",
  "DECLINED",
] as const;
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

function statusBadgeTone(status: CorporateInquiryStatus) {
  if (status === "PENDING") return "warn";
  if (status === "CONTACTED") return "accent";
  if (status === "APPROVED") return "good";
  if (status === "DECLINED") return "bad";
  return "neutral";
}

type SearchParams = {
  status?: string;
  page?: string;
};

export default async function AdminCorporateInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status: StatusFilter = STATUSES.includes(sp.status as StatusFilter)
    ? (sp.status as StatusFilter)
    : "ALL";

  const page = clampPage(sp.page);
  const { timezone: companyTz } = await getCompanySettings();

  const where: Prisma.CorporateInquiryWhereInput = {};
  if (status !== "ALL") {
    where.status = status as CorporateInquiryStatus;
  }

  const [totalCount, inquiries, statusCountsArr] = await Promise.all([
    db.corporateInquiry.count({ where }),
    db.corporateInquiry.findMany({
      where,
      include: {
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (Math.max(page, 1) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    Promise.all(
      STATUSES.map(async (s) => {
        const w = s === "ALL" ? {} : { status: s as CorporateInquiryStatus };
        const c = await db.corporateInquiry.count({ where: w });
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
            <h1 className={`${styles.heading} h2`}>Corporate Inquiries</h1>
          </div>

          <Link href='/admin/corporate' className='backBtn'>
            ← Back to Accounts
          </Link>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{totalCount}</strong> inquir
            {totalCount !== 1 ? "ies" : "y"}
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
                const href = buildHref("/admin/corporate/inquiries", {
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

      {inquiries.length === 0 ? (
        <div className={styles.empty}>
          <p className='emptyTitle'>No inquiries found.</p>
          <p className='emptyCopy'>
            Corporate inquiries submitted via the website will appear here.
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Company</th>
                  <th className={styles.th}>Contact</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Phone</th>
                  <th className={styles.th}>Est. Monthly Rides</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => {
                  const href = `/admin/corporate/inquiries/${inq.id}`;
                  return (
                    <tr key={inq.id} className={styles.tr}>
                      <td
                        className={styles.td}
                        style={{ position: "relative" }}
                      >
                        <Link href={href} className={styles.rowStretchedLink} />
                        <div className={styles.cellStrong}>
                          <Link href={href} className={styles.rowLink}>
                            {inq.companyName}
                          </Link>
                        </div>
                      </td>
                      <td
                        className={styles.td}
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {inq.contactName}
                      </td>
                      <td
                        className={styles.td}
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        <div className={styles.cellSub}>{inq.email}</div>
                      </td>
                      <td
                        className={styles.td}
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {inq.phone || "—"}
                      </td>
                      <td
                        className={styles.td}
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {inq.estimatedMonthlyRides || "—"}
                      </td>
                      <td
                        className={styles.td}
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        <span
                          className={`badge badge_${statusBadgeTone(inq.status)}`}
                        >
                          {inq.status}
                        </span>
                      </td>
                      <td
                        className={styles.td}
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                        {formatDateTime(inq.createdAt, companyTz)}{" "}
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
  const prevHref = buildHref("/admin/corporate/inquiries", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });
  const nextHref = buildHref("/admin/corporate/inquiries", {
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
