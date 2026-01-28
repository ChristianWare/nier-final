/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./BookingsPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { Prisma, BookingStatus, Role } from "@prisma/client";
import Button from "@/components/shared/Button/Button";
import CustomRangeFormClient from "./CustomRangeFormClient";
import SearchFormClient from "./SearchFormClient";
import ClearFiltersButton from "@/components/admin/Clearfiltersbutton/Clearfiltersbutton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ All statuses from schema
const STATUSES = [
  "ALL",
  "PENDING_REVIEW",
  "DECLINED",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DRAFT",
] as const;

const RANGES = ["month", "year", "today", "next24", "next7", "range"] as const;

// ✅ ALL sortable columns
const SORT_COLUMNS = [
  "created",
  "createdBy",
  "pickup",
  "status",
  "customer",
  "service",
  "vehicle",
  "driver",
  "total",
] as const;

const SORT_ORDERS = ["asc", "desc"] as const;

type StatusFilter = (typeof STATUSES)[number];
type RangeFilter = (typeof RANGES)[number];
type SortColumn = (typeof SORT_COLUMNS)[number];
type SortOrder = (typeof SORT_ORDERS)[number];

type SearchParams = {
  status?: StatusFilter;
  range?: RangeFilter;
  q?: string;

  unassigned?: "1";
  paid?: "1";
  stuck?: "1";

  from?: string;
  to?: string;

  sort?: SortColumn;
  order?: SortOrder;

  page?: string;
};

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;
const PAGE_SIZE = 10;

function toPhoenixParts(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  return { y: phx.getUTCFullYear(), m: phx.getUTCMonth(), d: phx.getUTCDate() };
}

function startOfDayPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfMonthPhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfYearPhoenix(dateUtc: Date) {
  const { y } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, 0, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;
  return new Date(nextStartUtcMs);
}

function startOfNextYearPhoenix(yearStartUtc: Date) {
  const phxLocalMs = yearStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const nextStartLocalMs = Date.UTC(y + 1, 0, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;
  return new Date(nextStartUtcMs);
}

function parseYMD(s: string | null | undefined) {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function startOfDayFromYMDPhoenix(ymd: { y: number; m: number; d: number }) {
  const startLocalMs = Date.UTC(ymd.y, ymd.m - 1, ymd.d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function ymdForInputPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatPhoenix(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
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

function getConfirmationCode(bookingId: string): string {
  return bookingId.slice(0, 8).toUpperCase();
}

function buildHref(
  base: string,
  params: Record<string, string | undefined | null>,
) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    const s = String(v).trim();
    if (!s) continue;
    usp.set(k, s);
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
    case "DECLINED":
      return "Declined";
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

function statusTabLabel(status: StatusFilter): string {
  switch (status) {
    case "ALL":
      return "All";
    case "PENDING_REVIEW":
      return "Pending";
    case "DECLINED":
      return "Declined";
    case "PENDING_PAYMENT":
      return "Awaiting Pay";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Assigned";
    case "EN_ROUTE":
      return "En Route";
    case "ARRIVED":
      return "Arrived";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Part. Refund";
    case "DRAFT":
      return "Draft";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function badgeTone(status: BookingStatus): BadgeTone {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "DECLINED") return "bad";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  if (status === "COMPLETED") return "good";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  return "neutral";
}

function fmtPersonLine(p: { name?: string | null; email?: string | null }) {
  const name = (p.name ?? "").trim();
  const email = (p.email ?? "").trim();
  if (name && email) return `${name} • ${email}`;
  return name || email || "";
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
    statusEvents: {
      take: 1;
      orderBy: { createdAt: "asc" };
      include: {
        createdBy: { select: { name: true; email: true; roles: true } };
      };
    };
  };
}>;

function safeStatus(v: any): StatusFilter {
  return STATUSES.includes(v) ? v : "ALL";
}

function safeRange(v: any): RangeFilter {
  return RANGES.includes(v) ? v : "month";
}

function safeSort(v: any): SortColumn | undefined {
  return SORT_COLUMNS.includes(v) ? v : undefined;
}

function safeOrder(v: any): SortOrder {
  return SORT_ORDERS.includes(v) ? v : "desc";
}

function buildWhere(args: {
  now: Date;
  status: StatusFilter;
  range: RangeFilter;
  unassigned: boolean;
  paid: boolean;
  stuck: boolean;
  fromYmd: string;
  toYmd: string;
  q?: string;
}) {
  const { now, status, range, unassigned, paid, stuck, fromYmd, toYmd, q } =
    args;

  const where: Prisma.BookingWhereInput = {};

  const todayStart = startOfDayPhoenix(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = addMonthsPhoenix(monthStart, 1);

  const yearStart = startOfYearPhoenix(now);
  const nextYearStart = startOfNextYearPhoenix(yearStart);

  let pickupAtFilter: Prisma.DateTimeFilter | undefined;

  if (range === "today")
    pickupAtFilter = { gte: todayStart, lt: tomorrowStart };
  if (range === "next24") pickupAtFilter = { gte: now, lt: next24h };
  if (range === "next7") pickupAtFilter = { gte: now, lt: next7d };
  if (range === "month")
    pickupAtFilter = { gte: monthStart, lt: nextMonthStart };
  if (range === "year") pickupAtFilter = { gte: yearStart, lt: nextYearStart };

  if (range === "range") {
    const f = parseYMD(fromYmd);
    const t = parseYMD(toYmd);

    let fromUtc = f ? startOfDayFromYMDPhoenix(f) : todayStart;
    const toUtc0 = t ? startOfDayFromYMDPhoenix(t) : todayStart;

    let toUtc = new Date(toUtc0.getTime() + 24 * 60 * 60 * 1000);

    if (toUtc.getTime() < fromUtc.getTime()) {
      const tmp = fromUtc;
      fromUtc = toUtc0;
      toUtc = new Date(tmp.getTime() + 24 * 60 * 60 * 1000);
    }

    pickupAtFilter = { gte: fromUtc, lt: toUtc };
  }

  if (pickupAtFilter) where.pickupAt = pickupAtFilter;

  if (status !== "ALL") where.status = status as BookingStatus;

  if (unassigned) where.assignment = { is: null };
  if (paid) where.payment = { is: { status: "PAID" } };

  if (stuck) {
    const stuckCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    where.status = "PENDING_REVIEW";
    where.createdAt = { lt: stuckCutoff };
    where.pickupAt = { gte: now };
  }

  const needle = (q ?? "").trim();
  if (needle) {
    const isConfirmationCode = /^[A-Za-z0-9]{6,8}$/i.test(needle);

    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];

    const searchConditions: Prisma.BookingWhereInput[] = [
      { id: { contains: needle, mode: "insensitive" } },
      { guestName: { contains: needle, mode: "insensitive" } },
      { guestEmail: { contains: needle, mode: "insensitive" } },
      { guestPhone: { contains: needle, mode: "insensitive" } },
      { pickupAddress: { contains: needle, mode: "insensitive" } },
      { dropoffAddress: { contains: needle, mode: "insensitive" } },
      { user: { is: { name: { contains: needle, mode: "insensitive" } } } },
      { user: { is: { email: { contains: needle, mode: "insensitive" } } } },
    ];

    if (isConfirmationCode) {
      searchConditions.push({
        id: { startsWith: needle.toLowerCase(), mode: "insensitive" },
      });
    }

    where.AND = [
      ...existingAnd,
      {
        OR: searchConditions,
      },
    ];
  }

  return where;
}

// ✅ UPDATED: Build orderBy for ALL columns
function buildOrderBy(
  sort: SortColumn | undefined,
  order: SortOrder,
  status: StatusFilter,
  stuck: boolean,
): Prisma.BookingOrderByWithRelationInput[] {
  if (sort) {
    const direction =
      order === "asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc;

    switch (sort) {
      case "created":
        return [{ createdAt: direction }];
      case "createdBy":
        return [{ user: { name: direction } }, { guestName: direction }];
      case "pickup":
        return [{ pickupAt: direction }];
      case "status":
        return [{ status: direction }];
      case "customer":
        return [{ user: { name: direction } }, { guestName: direction }];
      case "service":
        return [{ serviceType: { name: direction } }];
      case "vehicle":
        return [{ vehicle: { name: direction } }];
      case "driver":
        return [{ assignment: { driver: { name: direction } } }];
      case "total":
        return [{ totalCents: direction }];
      default:
        return [{ pickupAt: direction }];
    }
  }

  if (stuck || status === "PENDING_REVIEW") {
    return [{ createdAt: Prisma.SortOrder.asc }];
  }
  if (status === "ALL") {
    return [{ pickupAt: Prisma.SortOrder.desc }];
  }
  if (
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "NO_SHOW"
  ) {
    return [{ pickupAt: Prisma.SortOrder.desc }];
  }
  return [{ pickupAt: Prisma.SortOrder.asc }];
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const status = safeStatus(sp.status) as StatusFilter;
  const range = safeRange(sp.range) as RangeFilter;
  const sort = safeSort(sp.sort);
  const order = safeOrder(sp.order);

  const unassigned = sp.unassigned === "1";
  const paid = sp.paid === "1";
  const stuck = sp.stuck === "1";
  const page = clampPage(sp.page);

  const q = (sp.q ?? "").trim();
  const now = new Date();

  const defaultFrom = ymdForInputPhoenix(now);
  const defaultTo = ymdForInputPhoenix(now);

  const fromYmd = sp.from ?? defaultFrom;
  const toYmd = sp.to ?? defaultTo;

  const where = buildWhere({
    now,
    status,
    range,
    unassigned,
    paid,
    stuck,
    fromYmd,
    toYmd,
    q,
  });

  const orderBy = buildOrderBy(sort, order, status, stuck);

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
      statusEvents: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: {
          createdBy: { select: { name: true, email: true, roles: true } },
        },
      },
    },
    orderBy,
    skip,
    take: PAGE_SIZE,
  });

  async function countFor(next: {
    status?: StatusFilter;
    range?: RangeFilter;
    unassigned?: boolean;
    paid?: boolean;
    stuck?: boolean;
    fromYmd?: string;
    toYmd?: string;
    q?: string;
  }) {
    const w = buildWhere({
      now,
      status: next.status ?? status,
      range: next.range ?? range,
      unassigned:
        typeof next.unassigned === "boolean" ? next.unassigned : unassigned,
      paid: typeof next.paid === "boolean" ? next.paid : paid,
      stuck: typeof next.stuck === "boolean" ? next.stuck : stuck,
      fromYmd: next.fromYmd ?? fromYmd,
      toYmd: next.toYmd ?? toYmd,
      q: next.q ?? q,
    });
    return db.booking.count({ where: w });
  }

  const [
    statusCountsArr,
    rangeCountsArr,
    unassignedCount,
    paidCount,
    stuckCount,
  ] = await Promise.all([
    Promise.all(
      STATUSES.map(async (s) => {
        const c =
          s === "ALL"
            ? await countFor({ status: "ALL", q })
            : await countFor({ status: s, q });
        return [s, c] as const;
      }),
    ),
    Promise.all(
      RANGES.map(async (r) => {
        const c = await countFor({ range: r, q });
        return [r, c] as const;
      }),
    ),
    countFor({ unassigned: true, q }),
    countFor({ paid: true, q }),
    countFor({ stuck: true, q }),
  ]);

  const statusCounts = Object.fromEntries(statusCountsArr) as Record<
    StatusFilter,
    number
  >;
  const rangeCounts = Object.fromEntries(rangeCountsArr) as Record<
    RangeFilter,
    number
  >;

  const baseParams: Record<string, string | undefined> = {
    status: status === "ALL" ? "ALL" : status,
    range: range === "month" ? undefined : range,
    unassigned: unassigned ? "1" : undefined,
    paid: paid ? "1" : undefined,
    stuck: stuck ? "1" : undefined,
    from: range === "range" ? fromYmd : undefined,
    to: range === "range" ? toYmd : undefined,
    q: q.length ? q : undefined,
    sort: sort,
    order: sort ? order : undefined,
  };

  // ✅ Check if any filters are active
  const hasActiveFilters =
    status !== "ALL" ||
    range !== "month" ||
    unassigned ||
    paid ||
    stuck ||
    q.length > 0 ||
    sort !== undefined;

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
              btnType='greenReg'
            />
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{totalCount}</strong> total
            {totalCount > 0 ? (
              <span className={styles.metaSep}>
                • Page <strong className='emptyTitleSmall'>{safePage}</strong>{" "}
                of <strong className='emptyTitleSmall'>{totalPages}</strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Time</div>
            <RangeTabs
              active={range}
              current={baseParams}
              counts={rangeCounts}
            />
            {range === "range" ? (
              <CustomRangeFormClient
                current={baseParams}
                defaultFrom={defaultFrom}
                defaultTo={defaultTo}
              />
            ) : null}
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Status</div>
            <StatusTabs
              active={status}
              current={baseParams}
              counts={statusCounts}
            />
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Quick filters</div>
            <ToggleChips
              current={baseParams}
              counts={{
                unassigned: unassignedCount,
                paid: paidCount,
                stuck: stuckCount,
              }}
            />
          </div>

          {/* ✅ Clear All Filters Button */}
          <div className={styles.filterGroup}>
            <ClearFiltersButton hasActiveFilters={hasActiveFilters} />
          </div>
        </div>

        <SearchFormClient current={baseParams} defaultValue={q} />

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
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  {/* ✅ ALL headers are now sortable */}
                  <SortableHeader
                    label='Created'
                    column='created'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Created by'
                    column='createdBy'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Pickup'
                    column='pickup'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Status'
                    column='status'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Customer'
                    column='customer'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Service'
                    column='service'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Vehicle'
                    column='vehicle'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Driver'
                    column='driver'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label='Total'
                    column='total'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                    align='right'
                  />
                </tr>
              </thead>

              <tbody>
                {bookings.map((b) => {
                  const href = `/admin/bookings/${b.id}`;
                  const pickupEta = formatEta(b.pickupAt, now);
                  const createdAgo = formatEta(b.createdAt, now);
                  const total = formatMoneyFromCents(b.totalCents ?? 0);

                  const confirmationCode = getConfirmationCode(b.id);

                  const customerName =
                    b.user?.name?.trim() || b.guestName?.trim() || "Guest";
                  const customerEmail = b.user?.email ?? b.guestEmail ?? "";

                  const driverName = b.assignment?.driver?.name?.trim() || "";
                  const driverEmail = b.assignment?.driver?.email ?? "";
                  const payStatus = b.payment?.status ?? null;

                  const statusDisplay =
                    payStatus === "PAID" &&
                    (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
                      ? "Payment received"
                      : statusLabel(b.status);

                  const statusTone =
                    payStatus === "PAID" &&
                    (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
                      ? "good"
                      : badgeTone(b.status);

                  const createdEvent = b.statusEvents?.[0] ?? null;
                  const actor = createdEvent?.createdBy ?? null;

                  let createdByTop = "Guest checkout";

                  if (actor?.roles?.includes(Role.ADMIN)) {
                    createdByTop = "Admin";
                  } else if (actor) {
                    createdByTop = "User account";
                  } else if (b.user) {
                    createdByTop = "User account";
                  } else {
                    createdByTop = "Guest checkout";
                  }

                  return (
                    <tr key={b.id} className={styles.tr}>
                      {/* Created */}
                      <td
                        className={styles.td}
                        data-label='Created'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label='Open booking'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.pickupCell}>
                          <Link href={href} className={styles.rowLink}>
                            {formatPhoenix(b.createdAt)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{createdAgo}</span>
                            <span
                              className={styles.confirmationCode}
                              title='Confirmation Code'
                            >
                              #{confirmationCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Created by */}
                      <td
                        className={styles.td}
                        data-label='Created by'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          <div className={styles.cellStrong}>
                            {createdByTop}
                          </div>
                        </div>
                      </td>

                      {/* Pickup */}
                      <td
                        className={styles.td}
                        data-label='Pickup'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.pickupCell}>
                          <Link href={href} className={styles.rowLink}>
                            {formatPhoenix(b.pickupAt)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{pickupEta}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td
                        className={styles.td}
                        data-label='Status'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.pickupMeta}>
                          <span className={`badge badge_${statusTone}`}>
                            {statusDisplay}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td
                        className={styles.td}
                        data-label='Customer'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          <Link href={href} className={styles.rowLink}>
                            {customerName}
                          </Link>
                          <div className={styles.cellSub}>{customerEmail}</div>
                        </div>
                      </td>

                      {/* Service */}
                      <td
                        className={styles.td}
                        data-label='Service'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          <div className={styles.cellStrong}>
                            {b.serviceType?.name ?? "—"}
                          </div>
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td
                        className={styles.td}
                        data-label='Vehicle'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          <div className={styles.cellStrong}>
                            {b.vehicle?.name ?? "—"}
                          </div>
                        </div>
                      </td>

                      {/* Driver */}
                      <td
                        className={`${styles.td} ${!b.assignment?.driver ? styles.unassignedCell : ""}`}
                        data-label='Driver'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
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

                      {/* Total */}
                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label='Total'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.totalCell}>{total}</div>
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

// ✅ Sortable table header component
function SortableHeader({
  label,
  column,
  currentSort,
  currentOrder,
  baseParams,
  align,
}: {
  label: string;
  column: SortColumn;
  currentSort: SortColumn | undefined;
  currentOrder: SortOrder;
  baseParams: Record<string, string | undefined>;
  align?: "right";
}) {
  const isActive = currentSort === column;
  const nextOrder = isActive && currentOrder === "desc" ? "asc" : "desc";

  const href = buildHref("/admin/bookings", {
    ...baseParams,
    sort: column,
    order: nextOrder,
    page: undefined,
  });

  const indicator = isActive ? (currentOrder === "desc" ? " ↓" : " ↑") : "";

  return (
    <th
      className={`${styles.th} ${styles.thSortable} ${align === "right" ? styles.thRight : ""}`}
    >
      <Link href={href} className={styles.sortLink}>
        {label}
        {indicator}
      </Link>
    </th>
  );
}

function StatusTabs({
  active,
  current,
  counts,
}: {
  active: StatusFilter;
  current: Record<string, string | undefined>;
  counts: Record<StatusFilter, number>;
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
            className={`tab ${isActive ? "tabActive" : ""}`}
          >
            {statusTabLabel(s)}
            <span
              className={`countPill ${isActive ? "countPillWhiteText" : ""}`}
            >
              {counts[s] ?? 0}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function RangeTabs({
  active,
  current,
  counts,
}: {
  active: RangeFilter;
  current: Record<string, string | undefined>;
  counts: Record<RangeFilter, number>;
}) {
  const items: { label: string; value: RangeFilter }[] = [
    { label: "Current month", value: "month" },
    { label: "Current year", value: "year" },
    { label: "Today", value: "today" },
    { label: "Next 24h", value: "next24" },
    { label: "Next 7d", value: "next7" },
    { label: "Custom range", value: "range" },
  ];

  return (
    <div className={styles.tabRow}>
      {items.map((x) => {
        const href = buildHref("/admin/bookings", {
          ...current,
          range: x.value === "month" ? undefined : x.value,
          from: x.value === "range" ? (current.from ?? undefined) : undefined,
          to: x.value === "range" ? (current.to ?? undefined) : undefined,
          page: undefined,
        });
        const isActive = x.value === active;

        return (
          <Link
            key={x.value}
            href={href}
            className={`tab ${isActive ? "tabActive" : ""}`}
          >
            {x.label}
            <span
              className={`countPill ${isActive ? "countPillWhiteText" : ""}`}
            >
              {counts[x.value] ?? 0}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function ToggleChips({
  current,
  counts,
}: {
  current: Record<string, string | undefined>;
  counts: { unassigned: number; paid: number; stuck: number };
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
    <div className={styles.tabRow}>
      <Link
        className={`tab ${unassignedOn ? "tabActive" : ""}`}
        href={unassignedHref}
      >
        Unassigned
        <span
          className={`countPill ${unassignedOn ? "countPillWhiteText" : ""}`}
        >
          {counts.unassigned ?? 0}
        </span>
      </Link>

      <Link className={`tab ${paidOn ? "tabActive" : ""}`} href={paidHref}>
        Paid only
        <span className={`countPill ${paidOn ? "countPillWhiteText" : ""}`}>
          {counts.paid ?? 0}
        </span>
      </Link>

      <Link className={`tab ${stuckOn ? "tabActive" : ""}`} href={stuckHref}>
        Stuck review
        <span className={`countPill ${stuckOn ? "countPillWhiteText" : ""}`}>
          {counts.stuck ?? 0}
        </span>
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

  const prevHref = buildHref("/admin/bookings", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/admin/bookings", {
    ...current,
    page: String(page + 1),
  });

  function getPageItems() {
    const items: Array<number | "…"> = [];
    const windowSize = 2;

    push(1);

    const start = Math.max(2, page - windowSize);
    const end = Math.min(totalPages - 1, page + windowSize);

    if (start > 2) items.push("…");
    for (let p = start; p <= end; p++) push(p);
    if (end < totalPages - 1) items.push("…");

    if (totalPages > 1) push(totalPages);

    return items;

    function push(p: number) {
      items.push(p);
    }
  }

  const pageItems = getPageItems();

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

        {pageItems.map((x, idx) => {
          if (x === "…") {
            return (
              <span
                key={`dots-${idx}`}
                className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}
                aria-hidden='true'
              >
                …
              </span>
            );
          }

          const href = buildHref("/admin/bookings", {
            ...current,
            page: x > 1 ? String(x) : undefined,
          });

          const isActive = x === page;

          return isActive ? (
            <span
              key={x}
              className={`${styles.pageBtn} ${styles.pageBtnActive}`}
            >
              {x}
            </span>
          ) : (
            <Link key={x} className={styles.pageBtn} href={href}>
              {x}
            </Link>
          );
        })}

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
