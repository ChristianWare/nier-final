/* eslint-disable @typescript-eslint/no-unused-vars */
import styles from "./BookingsPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { Prisma, BookingStatus, PaymentStatus } from "@prisma/client";
import Button from "@/components/shared/Button/Button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "ALL",
] as const;

const RANGES = ["today", "tomorrow", "next24", "next7", "all"] as const;

type StatusFilter = (typeof STATUSES)[number];
type RangeFilter = (typeof RANGES)[number];

type SearchParams = {
  status?: StatusFilter;
  range?: RangeFilter;
  unassigned?: "1";
  paid?: "1";
  stuck?: "1";
  page?: string;
};

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;
const PAGE_SIZE = 50;

function startOfDayPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);

  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const d = phx.getUTCDate();

  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;

  return new Date(startUtcMs);
}

function formatPhoenix(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatMoneyFromCents(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

function formatEta(at: Date, now: Date) {
  const diffMs = at.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));

  const label = mins < 90 ? `${mins}m` : hours < 36 ? `${hours}h` : `${days}d`;

  if (diffMs >= 0) return `in ${label}`;
  return `${label} ago`;
}

function buildHref(base: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    usp.set(k, v);
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

function clampPage(raw: string | undefined) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return Math.floor(n);
}

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "PENDING_PAYMENT":
      return "Payment due";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Driver assigned";
    case "EN_ROUTE":
      return "Driver en route";
    case "ARRIVED":
      return "Driver arrived";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "DRAFT":
      return "Draft";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function badgeTone(status: BookingStatus): BadgeTone {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  if (status === "COMPLETED") return "good";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  return "neutral";
}

function paymentLabel(status: PaymentStatus | null | undefined) {
  if (!status) return "—";
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
      return "Partially refunded";
    case "NONE":
    default:
      return "Not paid";
  }
}

function paymentTone(status: PaymentStatus | null | undefined): BadgeTone {
  if (!status) return "neutral";
  if (status === "PAID") return "good";
  if (status === "PENDING") return "warn";
  if (status === "FAILED") return "bad";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  if (status === "NONE") return "neutral";
  return "neutral";
}

type BookingRow = Prisma.BookingGetPayload<{
  include: {
    user: { select: { name: true; email: true } };
    serviceType: { select: { name: true } };
    vehicle: { select: { name: true } };
    payment: { select: { status: true } };
    assignment: {
      include: { driver: { select: { name: true; email: true } } };
    };
  };
}>;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const status = (sp.status ?? "ALL") as StatusFilter;
  const range = (sp.range ?? "all") as RangeFilter;
  const unassigned = sp.unassigned === "1";
  const paid = sp.paid === "1";
  const stuck = sp.stuck === "1";
  const page = clampPage(sp.page);

  const now = new Date();
  const todayStart = startOfDayPhoenix(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterStart = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const stuckCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const pickupAtFilter: Prisma.DateTimeFilter | undefined =
    range === "today"
      ? { gte: todayStart, lt: tomorrowStart }
      : range === "tomorrow"
        ? { gte: tomorrowStart, lt: dayAfterStart }
        : range === "next24"
          ? { gte: now, lt: next24h }
          : range === "next7"
            ? { gte: now, lt: next7d }
            : undefined;

  const where: Prisma.BookingWhereInput = {};

  if (status !== "ALL") where.status = status as BookingStatus;
  if (pickupAtFilter) where.pickupAt = pickupAtFilter;
  if (unassigned) where.assignment = { is: null };
  if (paid) where.payment = { is: { status: "PAID" } };

  if (stuck) {
    where.status = "PENDING_REVIEW";
    where.createdAt = { lt: stuckCutoff };
    where.pickupAt = { gte: now };
  }

  const orderBy: Prisma.BookingOrderByWithRelationInput[] =
    stuck || status === "PENDING_REVIEW"
      ? [{ createdAt: Prisma.SortOrder.asc }]
      : status === "ALL"
        ? [{ pickupAt: Prisma.SortOrder.desc }]
        : status === "COMPLETED" ||
            status === "CANCELLED" ||
            status === "NO_SHOW"
          ? [{ pickupAt: Prisma.SortOrder.desc }]
          : [{ pickupAt: Prisma.SortOrder.asc }];

  const totalCount = await db.booking.count({ where });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const bookings: BookingRow[] = await db.booking.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      payment: { select: { status: true } },
      assignment: {
        include: { driver: { select: { name: true, email: true } } },
      },
    },
    orderBy,
    skip,
    take: PAGE_SIZE,
  });

  const baseParams: Record<string, string | undefined> = {
    status: status === "ALL" ? "ALL" : status,
    range: range === "all" ? undefined : range,
    unassigned: unassigned ? "1" : undefined,
    paid: paid ? "1" : undefined,
    stuck: stuck ? "1" : undefined,
  };

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  return (
    <section className={styles.container} aria-label='Bookings'>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>Bookings</h1>
          </div>

          <div className={styles.headerActions}>
            <Button
              href='/admin/bookings/new'
              text='New Booking'
              btnType='black'
              plus
            />
          </div>

          <div className={styles.meta}>
            <strong>{totalCount}</strong> total
            {totalCount > 0 ? (
              <span className={styles.metaSep}>
                • Page <strong className='emptyTitleSmall'>{safePage}</strong>{" "}
                of <strong className='emptyTitleSmall'>{totalPages}</strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.filters}>
          <StatusTabs active={status} current={baseParams} />
          <RangeTabs active={range} current={baseParams} />
          <ToggleChips current={baseParams} />
        </div>

        <Pagination
          totalCount={totalCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {bookings.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No bookings found.</p>
          <p className={styles.emptyCopy}>
            Try adjusting filters or create a new booking.
          </p>
          <div className={styles.actionsRow}>
            <div className={styles.btnContainer}>
              <Button
                href='/admin/bookings/new'
                btnType='red'
                text='New Booking'
                arrow
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Created</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Customer</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Vehicle</th>
                <th className={styles.th}>Driver</th>
                <th className={`${styles.th} ${styles.thRight}`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const href = `/admin/bookings/${b.id}`;
                const pickupEta = formatEta(b.pickupAt, now);
                const createdAgo = formatEta(b.createdAt, now);
                const total = formatMoneyFromCents(b.totalCents ?? 0);
                const payStatus = b.payment?.status ?? null;

                const customerName = b.user?.name?.trim() || "Guest";
                const customerEmail = b.user?.email ?? "";

                const driverName = b.assignment?.driver?.name?.trim() || "";
                const driverEmail = b.assignment?.driver?.email ?? "";

                return (
                  <tr key={b.id} className={styles.tr}>
                    <td className={styles.td} data-label='Created'>
                      <div className={styles.pickupCell}>
                        <Link href={href} className={styles.rowLink}>
                          {formatPhoenix(b.createdAt)}
                        </Link>
                        <div className={styles.pickupMeta}>
                          <span className={styles.pill}>{createdAgo}</span>
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Pickup'>
                      <div className={styles.pickupCell}>
                        <Link href={href} className={styles.rowLink}>
                          {formatPhoenix(b.pickupAt)}
                        </Link>
                        <div className={styles.pickupMeta}>
                          <span className={styles.pill}>{pickupEta}</span>
                          <div className={styles.badgesRow}>
                            <span
                              className={`badge badge_${badgeTone(b.status)}`}
                            >
                              {statusLabel(b.status)}
                            </span>
                            <span
                              className={`badge badge_${paymentTone(payStatus)}`}
                            >
                              {paymentLabel(payStatus)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Customer'>
                      <div className={styles.cellStack}>
                        <Link href={href} className={styles.rowLink}>
                          {customerName}
                        </Link>
                        <div className={styles.cellSub}>{customerEmail}</div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Service'>
                      <div className={styles.cellStack}>
                        <div className={styles.cellStrong}>
                          {b.serviceType?.name ?? "—"}
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Vehicle'>
                      <div className={styles.cellStack}>
                        <div className={styles.cellStrong}>
                          {b.vehicle?.name ?? "—"}
                        </div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Driver'>
                      {b.assignment?.driver ? (
                        <div className={styles.cellStack}>
                          <div className={styles.cellStrong}>
                            {driverName || "—"}
                          </div>
                          <div className={styles.cellSub}>{driverEmail}</div>
                        </div>
                      ) : (
                        <div className={styles.cellSub}>Unassigned</div>
                      )}
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight}`}
                      data-label='Total'
                    >
                      <div className={styles.totalCell}>{total}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

function StatusTabs({
  active,
  current,
}: {
  active: StatusFilter;
  current: Record<string, string | undefined>;
}) {
  return (
    <div className={styles.tabRow}>
      {STATUSES.map((s) => {
        const href = buildHref("/admin/bookings", {
          ...current,
          status: s,
          stuck: s !== "PENDING_REVIEW" ? undefined : current.stuck,
          page: undefined,
        });
        const isActive = s === active;
        return (
          <Link
            key={s}
            href={href}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
          >
            {s}
          </Link>
        );
      })}
    </div>
  );
}

function RangeTabs({
  active,
  current,
}: {
  active: RangeFilter;
  current: Record<string, string | undefined>;
}) {
  const items: { label: string; value: RangeFilter }[] = [
    { label: "All time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Tomorrow", value: "tomorrow" },
    { label: "Next 24h", value: "next24" },
    { label: "Next 7d", value: "next7" },
  ];

  return (
    <div className={styles.tabRow}>
      {items.map((x) => {
        const href = buildHref("/admin/bookings", {
          ...current,
          range: x.value === "all" ? undefined : x.value,
          page: undefined,
        });
        const isActive = x.value === active;
        return (
          <Link
            key={x.value}
            href={href}
            className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
          >
            {x.label}
          </Link>
        );
      })}
    </div>
  );
}

function ToggleChips({
  current,
}: {
  current: Record<string, string | undefined>;
}) {
  const unassignedOn = current.unassigned === "1";
  const paidOn = current.paid === "1";
  const stuckOn = current.stuck === "1";

  const unassignedHref = buildHref("/admin/bookings", {
    ...current,
    unassigned: unassignedOn ? undefined : "1",
    page: undefined,
  });

  const paidHref = buildHref("/admin/bookings", {
    ...current,
    paid: paidOn ? undefined : "1",
    page: undefined,
  });

  const stuckHref = buildHref("/admin/bookings", {
    ...current,
    stuck: stuckOn ? undefined : "1",
    status: "PENDING_REVIEW",
    page: undefined,
  });

  return (
    <div className={styles.chipRow}>
      <Link
        className={`${styles.chip} ${unassignedOn ? styles.chipOn : ""}`}
        href={unassignedHref}
      >
        Unassigned
      </Link>
      <Link
        className={`${styles.chip} ${paidOn ? styles.chipOn : ""}`}
        href={paidHref}
      >
        Paid only
      </Link>
      <Link
        className={`${styles.chip} ${stuckOn ? styles.chipOn : ""}`}
        href={stuckHref}
      >
        Stuck review
      </Link>
    </div>
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

  const prevPage = page - 1;
  const nextPage = page + 1;

  const prevHref = buildHref("/admin/bookings", {
    ...current,
    page: prevPage > 1 ? String(prevPage) : undefined,
  });

  const nextHref = buildHref("/admin/bookings", {
    ...current,
    page: String(nextPage),
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
