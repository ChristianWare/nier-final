/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./DriverTripsPage.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma, BookingStatus } from "@prisma/client";
import { auth } from "../../../../auth";
import DriverSearchFormClient from "@/app/driver-dashboard/trips/DriverSearchFormClient";
import DriverClearFiltersButton from "@/app/driver-dashboard/trips/Driverclearfiltersbutton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Driver-relevant statuses
const STATUSES = [
  "ALL",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
] as const;

const RANGES = ["upcoming", "today", "next7", "month", "past"] as const;

const SORT_COLUMNS = [
  "pickup",
  "status",
  "customer",
  "service",
  "earnings",
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
  sort?: SortColumn;
  order?: SortOrder;
  page?: string;
};

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;
const PAGE_SIZE = 10;

// Phoenix timezone helpers
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

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;
  return new Date(nextStartUtcMs);
}

function formatPhoenix(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatPhoenixTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatMoneyFromCents(cents: number | null | undefined) {
  if (cents == null) return "—";
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
    case "ASSIGNED":
      return "Assigned";
    case "CONFIRMED":
      return "Confirmed";
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
      return "No-Show";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function statusTabLabel(status: StatusFilter): string {
  switch (status) {
    case "ALL":
      return "All";
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
      return "No-Show";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function badgeTone(status: BookingStatus): BadgeTone {
  if (status === "ASSIGNED" || status === "CONFIRMED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "COMPLETED") return "good";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  return "neutral";
}

async function resolveSessionUserId(session: any) {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

function safeStatus(v: any): StatusFilter {
  return STATUSES.includes(v) ? v : "ALL";
}

function safeRange(v: any): RangeFilter {
  return RANGES.includes(v) ? v : "upcoming";
}

function safeSort(v: any): SortColumn | undefined {
  return SORT_COLUMNS.includes(v) ? v : undefined;
}

function safeOrder(v: any): SortOrder {
  return SORT_ORDERS.includes(v) ? v : "asc";
}

function buildWhere(args: {
  now: Date;
  driverId: string;
  status: StatusFilter;
  range: RangeFilter;
  q?: string;
}) {
  const { now, driverId, status, range, q } = args;

  const where: Prisma.BookingWhereInput = {
    assignment: { driverId },
  };

  const todayStart = startOfDayPhoenix(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = addMonthsPhoenix(monthStart, 1);

  let pickupAtFilter: Prisma.DateTimeFilter | undefined;

  if (range === "upcoming") pickupAtFilter = { gte: now };
  if (range === "today")
    pickupAtFilter = { gte: todayStart, lt: tomorrowStart };
  if (range === "next7") pickupAtFilter = { gte: now, lt: next7d };
  if (range === "month")
    pickupAtFilter = { gte: monthStart, lt: nextMonthStart };
  if (range === "past") pickupAtFilter = { lt: now };

  if (pickupAtFilter) where.pickupAt = pickupAtFilter;

  if (status !== "ALL") {
    where.status = status as BookingStatus;
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
      { guestPhone: { contains: needle, mode: "insensitive" } },
      { pickupAddress: { contains: needle, mode: "insensitive" } },
      { dropoffAddress: { contains: needle, mode: "insensitive" } },
      { user: { is: { name: { contains: needle, mode: "insensitive" } } } },
      { user: { is: { phone: { contains: needle, mode: "insensitive" } } } },
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

function buildOrderBy(
  sort: SortColumn | undefined,
  order: SortOrder,
  range: RangeFilter,
): Prisma.BookingOrderByWithRelationInput[] {
  if (sort) {
    const direction =
      order === "asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc;

    switch (sort) {
      case "pickup":
        return [{ pickupAt: direction }];
      case "status":
        return [{ status: direction }];
      case "customer":
        return [{ user: { name: direction } }, { guestName: direction }];
      case "service":
        return [{ serviceType: { name: direction } }];
      case "earnings":
        return [{ assignment: { driverPaymentCents: direction } }];
      default:
        return [{ pickupAt: direction }];
    }
  }

  // Default: upcoming trips ascending, past trips descending
  if (range === "past") {
    return [{ pickupAt: Prisma.SortOrder.desc }];
  }
  return [{ pickupAt: Prisma.SortOrder.asc }];
}

export default async function DriverTripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/trips");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverIdOrNull = await resolveSessionUserId(session);
  if (!driverIdOrNull) redirect("/");
  const driverId: string = driverIdOrNull;

  const sp = await searchParams;

  const status = safeStatus(sp.status) as StatusFilter;
  const range = safeRange(sp.range) as RangeFilter;
  const sort = safeSort(sp.sort);
  const order = safeOrder(sp.order);
  const page = clampPage(sp.page);
  const q = (sp.q ?? "").trim();
  const now = new Date();

  const where = buildWhere({ now, driverId, status, range, q });
  const orderBy = buildOrderBy(sort, order, range);

  const totalCount = await db.booking.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const bookings = await db.booking.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, phone: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: {
          vehicleUnit: { select: { name: true, plate: true } },
        },
      },
    },
    orderBy,
    skip,
    take: PAGE_SIZE,
  });

  // Count for filters
  async function countFor(next: {
    status?: StatusFilter;
    range?: RangeFilter;
    q?: string;
  }) {
    const w = buildWhere({
      now,
      driverId,
      status: next.status ?? status,
      range: next.range ?? range,
      q: next.q ?? q,
    });
    return db.booking.count({ where: w });
  }

  const [statusCountsArr, rangeCountsArr] = await Promise.all([
    Promise.all(
      STATUSES.map(async (s) => {
        const c = await countFor({ status: s, q });
        return [s, c] as const;
      }),
    ),
    Promise.all(
      RANGES.map(async (r) => {
        const c = await countFor({ range: r, q });
        return [r, c] as const;
      }),
    ),
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
    status: status === "ALL" ? undefined : status,
    range: range === "upcoming" ? undefined : range,
    q: q.length ? q : undefined,
    sort: sort,
    order: sort ? order : undefined,
  };

  const hasActiveFilters =
    status !== "ALL" ||
    range !== "upcoming" ||
    q.length > 0 ||
    sort !== undefined;

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  return (
    <section className={styles.container} aria-label='My Trips'>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <Link href='/driver-dashboard' className={styles.backLink}>
              ← Back to Dashboard
            </Link>
            <h1 className={`${styles.heading} h2`}>My Trips</h1>
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{totalCount}</strong> trips
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
            <DriverClearFiltersButton hasActiveFilters={hasActiveFilters} />
          </div>
        </div>

        <DriverSearchFormClient current={baseParams} defaultValue={q} />

        <Pagination
          totalCount={totalCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {bookings.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No trips found.</p>
          <p className={styles.emptyCopy}>
            Try adjusting filters or check back later for new assignments.
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
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
                  <th className={styles.th}>Route</th>
                  <SortableHeader
                    label='Service'
                    column='service'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <th className={styles.th}>Pax/Bags</th>
                  <SortableHeader
                    label='Earnings'
                    column='earnings'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                    align='right'
                  />
                  <th className={`${styles.th} ${styles.thRight}`}></th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((b) => {
                  const href = `/driver-dashboard/trips/${b.id}`;
                  const pickupEta = formatEta(b.pickupAt, now);
                  const confirmationCode = getConfirmationCode(b.id);

                  const customerName =
                    b.user?.name?.trim() || b.guestName?.trim() || "Customer";
                  const customerPhone =
                    b.user?.phone?.trim() || b.guestPhone?.trim() || null;

                  const earnings = b.assignment?.driverPaymentCents ?? null;
                  const tone = badgeTone(b.status as BookingStatus);

                  // Shorten addresses for display
                  const pickupShort =
                    b.pickupAddress.length > 30
                      ? b.pickupAddress.slice(0, 30) + "..."
                      : b.pickupAddress;
                  const dropoffShort =
                    b.dropoffAddress.length > 30
                      ? b.dropoffAddress.slice(0, 30) + "..."
                      : b.dropoffAddress;

                  return (
                    <tr key={b.id} className={styles.tr}>
                      {/* Pickup */}
                      <td
                        className={styles.td}
                        data-label='Pickup'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label='Open trip'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.pickupCell}>
                          <Link href={href} className={styles.rowLink}>
                            {formatPhoenix(b.pickupAt)} @{" "}
                            {formatPhoenixTime(b.pickupAt)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{pickupEta}</span>
                            <span
                              className={styles.confirmationCode}
                              title='Confirmation Code'
                            >
                              #{confirmationCode}
                            </span>
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
                          <span className={`badge badge_${tone}`}>
                            {statusLabel(b.status as BookingStatus)}
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
                          {customerPhone && (
                            <div className={styles.cellSub}>
                              {customerPhone}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Route */}
                      <td
                        className={styles.td}
                        data-label='Route'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.routeCell}>
                          <div className={styles.routeFrom}>
                            <span className={styles.routeIcon}>📍</span>
                            {pickupShort}
                          </div>
                          <div className={styles.routeTo}>
                            <span className={styles.routeIcon}>🏁</span>
                            {dropoffShort}
                          </div>
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
                          {b.assignment?.vehicleUnit && (
                            <div className={styles.cellSub}>
                              {b.assignment.vehicleUnit.name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Pax/Bags */}
                      <td
                        className={styles.td}
                        data-label='Pax/Bags'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStrong}>
                          {b.passengers} / {b.luggage}
                        </div>
                      </td>

                      {/* Earnings */}
                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label='Earnings'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.earningsCell}>
                          {formatMoneyFromCents(earnings)}
                        </div>
                      </td>

                      {/* Action */}
                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label='Action'
                      >
                        <Link className='primaryBtn' href={href}>
                          View
                        </Link>
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

// Sortable header component
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
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : "asc";

  const href = buildHref("/driver-dashboard/trips", {
    ...baseParams,
    sort: column,
    order: nextOrder,
    page: undefined,
  });

  const indicator = isActive ? (currentOrder === "asc" ? " ↑" : " ↓") : "";

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
        const href = buildHref("/driver-dashboard/trips", {
          ...current,
          status: s === "ALL" ? undefined : s,
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
    { label: "Upcoming", value: "upcoming" },
    { label: "Today", value: "today" },
    { label: "Next 7 days", value: "next7" },
    { label: "This month", value: "month" },
    { label: "Past trips", value: "past" },
  ];

  return (
    <div className={styles.tabRow}>
      {items.map((x) => {
        const href = buildHref("/driver-dashboard/trips", {
          ...current,
          range: x.value === "upcoming" ? undefined : x.value,
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

  const prevHref = buildHref("/driver-dashboard/trips", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/driver-dashboard/trips", {
    ...current,
    page: String(page + 1),
  });

  function getPageItems() {
    const items: Array<number | "…"> = [];
    const windowSize = 2;

    items.push(1);

    const start = Math.max(2, page - windowSize);
    const end = Math.min(totalPages - 1, page + windowSize);

    if (start > 2) items.push("…");
    for (let p = start; p <= end; p++) items.push(p);
    if (end < totalPages - 1) items.push("…");

    if (totalPages > 1) items.push(totalPages);

    return items;
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

          const href = buildHref("/driver-dashboard/trips", {
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
