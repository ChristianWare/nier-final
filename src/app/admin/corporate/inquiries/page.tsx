import styles from "./CorporateInquiriesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { CorporateInquiryStatus, Prisma } from "@prisma/client";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { formatDateTime } from "@/lib/timezone";
import InquiriesTableClient from "./InquiriesTableClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "PENDING", "CONTACTED", "DECLINED"] as const;
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

  const where: Prisma.CorporateInquiryWhereInput = {
    status: { not: "APPROVED" },
  };
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

  // Serialize for client component (no Date objects)
  const serializedInquiries = inquiries.map((inq) => ({
    id: inq.id,
    companyName: inq.companyName,
    contactName: inq.contactName,
    email: inq.email,
    estimatedMonthlyRides: inq.estimatedMonthlyRides ?? null,
    status: inq.status,
    formattedDate: formatDateTime(inq.createdAt, companyTz),
  }));

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
        <InquiriesTableClient inquiries={serializedInquiries} />
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
