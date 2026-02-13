/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./UserTripsPage.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma, BookingStatus } from "@prisma/client";
import { auth } from "../../../../auth";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import UserSearchFormClient from "./UserSearchFormClient";
import UserClearFiltersButton from "./UserClearFiltersButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// User-relevant statuses
const STATUSES = [
  "ALL",
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DECLINED",
  "NO_SHOW",
  "REFUNDED",
] as const;

const RANGES = ["upcoming", "past", "month", "all"] as const;

const SORT_COLUMNS = ["pickup", "status", "service", "total", "created"] as const;
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

const PAGE_SIZE = 10;

function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function getConfirmationCode(bookingId: string): string {
  return bookingId.slice(0, 8).toUpperCase();
}

function buildHref(
  base: string,
  params: Record<string, string | undefined | null>
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
      return "Awaiting Approval";
    case "DECLINED":
      return "Declined";
    case "PENDING_PAYMENT":
      return "Payment Required";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Driver Assigned";
    case "EN_ROUTE":
      return "Driver En Route";
    case "ARRIVED":
      return "Driver Arrived";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-Show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially Refunded";
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
    case "PENDING_PAYMENT":
      return "Pay Due";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Assigned";
    case "EN_ROUTE":
      return "En Route";
    case "ARRIVED":
      return "Arrived";
    case "IN_PROGRESS":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "DECLINED":
      return "Declined";
    case "NO_SHOW":
      return "No-Show";
    case "REFUNDED":
      return "Refunded";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function badgeTone(status: BookingStatus): BadgeTone {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW") return "neutral";
  if (status === "DECLINED") return "bad";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  if (status === "COMPLETED") return "good";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED") return "neutral";
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
  userId: string;
  status: StatusFilter;
  range: RangeFilter;
  q?: string;
  timeZone: string;
}) {
  const { now, userId, status, range, q, timeZone } = args;

  const where: Prisma.BookingWhereInput = { userId };

  const monthStart = tz.startOfMonth(now, timeZone);
  const nextMonthStart = tz.addMonths(monthStart, 1, timeZone);

  let pickupAtFilter: Prisma.DateTimeFilter | undefined;

  if (range === "upcoming") pickupAtFilter = { gte: now };
  if (range === "past") pickupAtFilter = { lt: now };
  if (range === "month") pickupAtFilter = { gte: monthStart, lt: nextMonthStart };

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
      { pickupAddress: { contains: needle, mode: "insensitive" } },
      { dropoffAddress: { contains: needle, mode: "insensitive" } },
      { serviceType: { is: { name: { contains: needle, mode: "insensitive" } } } },
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
  range: RangeFilter
): Prisma.BookingOrderByWithRelationInput[] {
  if (sort) {
    const direction =
      order === "asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc;

    switch (sort) {
      case "pickup":
        return [{ pickupAt: direction }];
      case "status":
        return [{ status: direction }];
      case "service":
        return [{ serviceType: { name: direction } }];
      case "total":
        return [{ totalCents: direction }];
      case "created":
        return [{ createdAt: direction }];
      default:
        return [{ pickupAt: direction }];
    }
  }

  if (range === "past") {
    return [{ pickupAt: Prisma.SortOrder.desc }];
  }
  return [{ pickupAt: Prisma.SortOrder.asc }];
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

export default async function UserTripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/trips");

  const userIdOrNull = await resolveSessionUserId(session);
  if (!userIdOrNull) redirect("/login?next=/dashboard/trips");
  const userId: string = userIdOrNull;

  const sp = await searchParams;

  const status = safeStatus(sp.status) as StatusFilter;
  const range = safeRange(sp.range) as RangeFilter;
  const sort = safeSort(sp.sort);
  const order = safeOrder(sp.order);
  const page = clampPage(sp.page);
  const q = (sp.q ?? "").trim();
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  const where = buildWhere({ now, userId, status, range, q, timeZone: companyTz });
  const orderBy = buildOrderBy(sort, order, range);

  const totalCount = await db.booking.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const bookings = await db.booking.findMany({
    where,
    include: {
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      payment: { select: { status: true, checkoutUrl: true } },
      assignment: {
        include: {
          driver: { select: { name: true } },
          vehicleUnit: { select: { name: true, plate: true } },
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
    q?: string;
  }) {
    const w = buildWhere({
      now,
      userId,
      status: next.status ?? status,
      range: next.range ?? range,
      q: next.q ?? q,
      timeZone: companyTz,
    });
    return db.booking.count({ where: w });
  }

  const [statusCountsArr, rangeCountsArr] = await Promise.all([
    Promise.all(
      STATUSES.map(async (s) => {
        const c = await countFor({ status: s, q });
        return [s, c] as const;
      })
    ),
    Promise.all(
      RANGES.map(async (r) => {
        const c = await countFor({ range: r, q });
        return [r, c] as const;
      })
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
    <section className={styles.container} aria-label="My Trips">
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <Link href="/dashboard" className={styles.backLink}>
              ← Back to Dashboard
            </Link>
            <h1 className={`${styles.heading} h2`}>My Trips</h1>
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{totalCount}</strong> trips
            {totalCount > 0 ? (
              <span className={styles.metaSep}>
                • Page <strong className="emptyTitleSmall">{safePage}</strong> of{" "}
                <strong className="emptyTitleSmall">{totalPages}</strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Time</div>
            <RangeTabs active={range} current={baseParams} counts={rangeCounts} />
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
            <UserClearFiltersButton hasActiveFilters={hasActiveFilters} />
          </div>
        </div>

        <UserSearchFormClient current={baseParams} defaultValue={q} />

        <Pagination
          totalCount={totalCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {bookings.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📅</div>
          <p className={styles.emptyTitle}>No trips found</p>
          <p className={styles.emptyCopy}>
            {status !== "ALL" || range !== "upcoming"
              ? "Try adjusting your filters or search."
              : "You haven't booked any trips yet."}
          </p>
          <Link href="/booking" className="primaryBtn">
            Book a Ride →
          </Link>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <SortableHeader
                    label="Pickup"
                    column="pickup"
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <SortableHeader
                    label="Status"
                    column="status"
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <th className={styles.th}>Route</th>
                  <SortableHeader
                    label="Service"
                    column="service"
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <th className={styles.th}>Driver</th>
                  <SortableHeader
                    label="Total"
                    column="total"
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                    align="right"
                  />
                  <th className={`${styles.th} ${styles.thRight}`}></th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((b) => {
                  const href = `/dashboard/trips/${b.id}`;
                  const pickupEta = tz.formatEta(b.pickupAt, now);
                  const confirmationCode = getConfirmationCode(b.id);
                  const total = tz.formatMoneyShort(b.totalCents ?? 0);

                  const tone = badgeTone(b.status as BookingStatus);
                  const isPaid = b.payment?.status === "PAID";

                  const displayStatus =
                    isPaid && (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
                      ? "Confirmed"
                      : statusLabel(b.status as BookingStatus);

                  const displayTone =
                    isPaid && (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
                      ? "good"
                      : tone;

                  const driverName = b.assignment?.driver?.name ?? null;
                  const hasPaymentDue =
                    b.status === "PENDING_PAYMENT" && b.payment?.checkoutUrl;

                  return (
                    <tr key={b.id} className={styles.tr}>
                      {/* Pickup */}
                      <td
                        className={styles.td}
                        data-label="Pickup"
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label="Open trip"
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.pickupCell}>
                          <Link href={href} className={styles.rowLink}>
                            {tz.formatDate(b.pickupAt, companyTz)} @ {formatTime(b.pickupAt, companyTz)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{pickupEta}</span>
                            <span
                              className={styles.confirmationCode}
                              title="Confirmation Code"
                            >
                              #{confirmationCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td
                        className={styles.td}
                        data-label="Status"
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden="true"
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.pickupMeta}>
                          <span className={`badge badge_${displayTone}`}>
                            {displayStatus}
                          </span>
                        </div>
                      </td>

                      {/* Route */}
                      <td
                        className={styles.td}
                        data-label="Route"
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden="true"
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.routeCell}>
                          <div className={styles.routeFrom}>
                            <span className={styles.routeIcon}>📍</span>
                            {shortAddress(b.pickupAddress)}
                          </div>
                          <div className={styles.routeTo}>
                            <span className={styles.routeIcon}>🏁</span>
                            {shortAddress(b.dropoffAddress)}
                          </div>
                        </div>
                      </td>

                      {/* Service */}
                      <td
                        className={styles.td}
                        data-label="Service"
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden="true"
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          <div className={styles.cellStrong}>
                            {b.serviceType?.name ?? "—"}
                          </div>
                          {b.vehicle && (
                            <div className={styles.cellSub}>{b.vehicle.name}</div>
                          )}
                        </div>
                      </td>

                      {/* Driver */}
                      <td
                        className={styles.td}
                        data-label="Driver"
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden="true"
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          {driverName ? (
                            <>
                              <div className={styles.cellStrong}>{driverName}</div>
                              {b.assignment?.vehicleUnit && (
                                <div className={styles.cellSub}>
                                  {b.assignment.vehicleUnit.name}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className={styles.cellSubPending}>
                              {b.status === "PENDING_REVIEW" ||
                              b.status === "PENDING_PAYMENT"
                                ? "—"
                                : "Assigning..."}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label="Total"
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden="true"
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.totalCell}>{total}</div>
                      </td>

                      {/* Action */}
                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label="Action"
                      >
                        {hasPaymentDue ? (
                          <Link
                            className={`primaryBtn ${styles.payNowBtn}`}
                            href={b.payment!.checkoutUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Pay Now
                          </Link>
                        ) : (
                          <Link className="primaryBtn" href={href}>
                            View
                          </Link>
                        )}
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

  const href = buildHref("/dashboard/trips", {
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
        const href = buildHref("/dashboard/trips", {
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
            <span className={`countPill ${isActive ? "countPillWhiteText" : ""}`}>
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
    { label: "Past Trips", value: "past" },
    { label: "This Month", value: "month" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className={styles.tabRow}>
      {items.map((x) => {
        const href = buildHref("/dashboard/trips", {
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
            <span className={`countPill ${isActive ? "countPillWhiteText" : ""}`}>
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

  const prevHref = buildHref("/dashboard/trips", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/dashboard/trips", {
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
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const href = buildHref("/dashboard/trips", {
            ...current,
            page: x > 1 ? String(x) : undefined,
          });

          const isActive = x === page;

          return isActive ? (
            <span key={x} className={`${styles.pageBtn} ${styles.pageBtnActive}`}>
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