/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./CorporateBookings.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma, BookingStatus } from "@prisma/client";
import { auth } from "../../../../auth";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import CorporateSearchFormClient from "./CorporateSearchFormClient";
import CorporateFilterSelectClient from "./CorporateFilterSelectClient";
import CorporateCustomRangeFormClient from "./CorporateCustomRangeFormClient";
import CorporateClearFiltersButton from "./CorporateClearFiltersButton";

export const metadata = { title: "Bookings | Corporate" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── Constants ─────────────────────────────────────────────── */

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

const RANGES = ["upcoming", "past", "month", "all", "range"] as const;

const SORT_COLUMNS = [
  "pickup",
  "status",
  "service",
  "total",
  "created",
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
  paid?: "1";
  unpaid?: "1";
  passenger?: string;
  from?: string;
  to?: string;
};

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

const PAGE_SIZE = 20;

/* ── Helpers ───────────────────────────────────────────────── */

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

function startOfDayFromYMD(
  ymd: { y: number; m: number; d: number },
  timezone: string,
) {
  const iso = `${ymd.y}-${String(ymd.m).padStart(2, "0")}-${String(ymd.d).padStart(2, "0")}`;
  return new Date(tz.localToUtcIso(iso, "00:00", timezone));
}

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
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  return "neutral";
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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

/* ── buildWhere ────────────────────────────────────────────── */

function buildWhere(args: {
  now: Date;
  accountId: string;
  status: StatusFilter;
  range: RangeFilter;
  q?: string;
  timeZone: string;
  paid: boolean;
  unpaid: boolean;
  passengerId?: string;
  fromYmd: string;
  toYmd: string;
}) {
  const {
    now,
    accountId,
    status,
    range,
    q,
    timeZone,
    paid,
    passengerId,
    fromYmd,
    toYmd,
  } = args;

  const where: Prisma.BookingWhereInput = { corporateAccountId: accountId };

  const monthStart = tz.startOfMonth(now, timeZone);
  const nextMonthStart = tz.addMonths(monthStart, 1, timeZone);

  let pickupAtFilter: Prisma.DateTimeFilter | undefined;

  if (range === "upcoming") pickupAtFilter = { gte: now };
  if (range === "past") pickupAtFilter = { lt: now };
  if (range === "month")
    pickupAtFilter = { gte: monthStart, lt: nextMonthStart };

  if (range === "range") {
    const f = parseYMD(fromYmd);
    const t = parseYMD(toYmd);
    const todayStart = tz.startOfDay(now, timeZone);

    let fromUtc = f ? startOfDayFromYMD(f, timeZone) : todayStart;
    const toUtc0 = t ? startOfDayFromYMD(t, timeZone) : todayStart;
    let toUtc = new Date(toUtc0.getTime() + 24 * 60 * 60 * 1000);

    if (toUtc.getTime() < fromUtc.getTime()) {
      const tmp = fromUtc;
      fromUtc = toUtc0;
      toUtc = new Date(tmp.getTime() + 24 * 60 * 60 * 1000);
    }

    pickupAtFilter = { gte: fromUtc, lt: toUtc };
  }

  if (pickupAtFilter) where.pickupAt = pickupAtFilter;

  if (status !== "ALL") {
    where.status = status as BookingStatus;
  }

  // Passenger filter
  if (passengerId) {
    where.corporatePassengerId = passengerId;
  }

  // Pay filters (mutually exclusive)
  if (paid) {
    where.payment = { is: { status: "PAID" } };
  } else if (args.unpaid) {
    where.NOT = { payment: { status: "PAID" } };
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
      {
        serviceType: {
          is: { name: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        corporatePassenger: {
          is: { name: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        assignment: {
          is: {
            driver: {
              is: { name: { contains: needle, mode: "insensitive" } },
            },
          },
        },
      },
    ];

    if (isConfirmationCode) {
      searchConditions.push({
        id: { startsWith: needle.toLowerCase(), mode: "insensitive" },
      });
    }

    where.AND = [
      ...existingAnd,
      { OR: searchConditions },
    ];
  }

  return where;
}

/* ── buildOrderBy ──────────────────────────────────────────── */

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

/* ── Page ──────────────────────────────────────────────────── */

export default async function CorporateBookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: { corporateAccountId: true },
  });

  if (!contact) redirect("/");

  const accountId = contact.corporateAccountId;
  const sp = await searchParams;

  const status = safeStatus(sp.status) as StatusFilter;
  const range = safeRange(sp.range) as RangeFilter;
  const sort = safeSort(sp.sort);
  const order = safeOrder(sp.order);
  const page = clampPage(sp.page);
  const q = (sp.q ?? "").trim();
  const paid = sp.paid === "1";
  const unpaid = sp.unpaid === "1";
  const passengerId = sp.passenger || undefined;
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  const defaultFrom = tz.formatIsoDate(now, companyTz);
  const defaultTo = tz.formatIsoDate(now, companyTz);
  const fromYmd = sp.from ?? defaultFrom;
  const toYmd = sp.to ?? defaultTo;

  const where = buildWhere({
    now,
    accountId,
    status,
    range,
    q,
    timeZone: companyTz,
    paid,
    unpaid,
    passengerId,
    fromYmd,
    toYmd,
  });
  const orderBy = buildOrderBy(sort, order, range);

  const totalCount = await db.booking.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  // ── Parallel queries ──

  const cancelledStatuses = ["CANCELLED", "REFUNDED", "NO_SHOW"] as any;
  const monthStart = tz.startOfMonth(now, companyTz);
  const nextMonthStart = tz.addMonths(monthStart, 1, companyTz);

  const [bookings, passengers, spendThisMonthAgg] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        payment: { select: { status: true, checkoutUrl: true } },
        corporatePassenger: { select: { id: true, name: true } },
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
    }),

    db.corporatePassenger.findMany({
      where: { corporateAccountId: accountId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),

    (db.booking as any).aggregate({
      where: {
        corporateAccountId: accountId,
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: { status: { in: cancelledStatuses } },
      },
      _sum: { totalCents: true },
    }),
  ]);

  const spendThisMonthCents = Number(spendThisMonthAgg?._sum?.totalCents ?? 0);

  // ── Count helper ──

  async function countFor(next: {
    status?: StatusFilter;
    range?: RangeFilter;
    q?: string;
    paid?: boolean;
    unpaid?: boolean;
    passengerId?: string;
    fromYmd?: string;
    toYmd?: string;
  }) {
    const w = buildWhere({
      now,
      accountId,
      status: next.status ?? status,
      range: next.range ?? range,
      q: next.q ?? q,
      timeZone: companyTz,
      paid: typeof next.paid === "boolean" ? next.paid : false,
      unpaid: typeof next.unpaid === "boolean" ? next.unpaid : false,
      passengerId: next.passengerId ?? passengerId,
      fromYmd: next.fromYmd ?? fromYmd,
      toYmd: next.toYmd ?? toYmd,
    });
    return db.booking.count({ where: w });
  }

  const [statusCountsArr, rangeCountsArr, paidCount, unpaidCount] =
    await Promise.all([
      Promise.all(
        STATUSES.map(async (s) => {
          const c = await countFor({ status: s, q });
          return [s, c] as const;
        }),
      ),
      Promise.all(
        (["upcoming", "past", "month", "all"] as const).map(async (r) => {
          const c = await countFor({ range: r, q });
          return [r, c] as const;
        }),
      ),
      countFor({ paid: true, q }),
      countFor({ unpaid: true, q }),
    ]);

  const statusCounts = Object.fromEntries(statusCountsArr) as Record<
    StatusFilter,
    number
  >;
  const rangeCounts = Object.fromEntries(rangeCountsArr) as Record<
    string,
    number
  >;

  // ── Passenger options with counts ──

  const passengerCountsArr = await Promise.all(
    passengers.map(async (p) => {
      const c = await countFor({ passengerId: p.id, q });
      return { id: p.id, name: p.name, count: c };
    }),
  );

  const allPassengerCount = await countFor({ passengerId: undefined, q });

  const baseParams: Record<string, string | undefined> = {
    status: status === "ALL" ? undefined : status,
    range: range === "upcoming" ? undefined : range,
    q: q.length ? q : undefined,
    sort: sort,
    order: sort ? order : undefined,
    paid: paid ? "1" : undefined,
    unpaid: unpaid ? "1" : undefined,
    passenger: passengerId,
    from: range === "range" ? fromYmd : undefined,
    to: range === "range" ? toYmd : undefined,
  };

  const hasActiveFilters =
    status !== "ALL" ||
    range !== "upcoming" ||
    paid ||
    unpaid ||
    !!passengerId ||
    q.length > 0 ||
    sort !== undefined;

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  return (
    <section className={styles.container} aria-label='Corporate Bookings'>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <Link href='/corporate' className='backBtn'>
              ← Back to Dashboard
            </Link>
            <h1 className={`${styles.heading} h2`}>Bookings</h1>
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{totalCount}</strong> bookings
            {spendThisMonthCents > 0 && (
              <>
                {" "}
                · <strong style={{ fontSize: "1.4rem" }}>
                  {formatMoney(spendThisMonthCents)}
                </strong>{" "}
                this month
              </>
            )}
            {totalCount > 0 ? (
              <span className={styles.metaSep}>
                • Page <strong className='emptyTitleSmall'>{safePage}</strong>{" "}
                of <strong className='emptyTitleSmall'>{totalPages}</strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.filters}>
          {/* Dropdown row: Time · Status · Passenger */}
          <div className={styles.filterRow}>
            <CorporateFilterSelectClient
              label='Time'
              paramName='range'
              defaultValue='upcoming'
              current={baseParams}
              options={[
                {
                  value: "upcoming",
                  label: "Upcoming",
                  count: rangeCounts.upcoming,
                },
                {
                  value: "past",
                  label: "Past Bookings",
                  count: rangeCounts.past,
                },
                {
                  value: "month",
                  label: "This Month",
                  count: rangeCounts.month,
                },
                {
                  value: "all",
                  label: "All Time",
                  count: rangeCounts.all,
                },
                {
                  value: "range",
                  label: "Custom Range",
                },
              ]}
            />

            <CorporateFilterSelectClient
              label='Status'
              paramName='status'
              defaultValue='ALL'
              current={baseParams}
              options={STATUSES.map((s) => ({
                value: s,
                label: statusTabLabel(s),
                count: statusCounts[s],
              }))}
            />

            <CorporateFilterSelectClient
              label='Passenger'
              paramName='passenger'
              defaultValue=''
              current={baseParams}
              options={[
                {
                  value: "",
                  label: "All Passengers",
                  count: allPassengerCount,
                },
                ...passengerCountsArr.map((p) => ({
                  value: p.id,
                  label: p.name,
                  count: p.count,
                })),
              ]}
            />
          </div>

          {/* Custom date range */}
          {range === "range" ? (
            <CorporateCustomRangeFormClient
              current={baseParams}
              defaultFrom={defaultFrom}
              defaultTo={defaultTo}
            />
          ) : null}

          {/* Pay filter checkboxes */}
          <div className={styles.filterSections}>
            <div className={styles.filterSection}>
              <div className={styles.filterTitle}>Pay Filters</div>
              <div className={styles.checkboxCol}>
                <CheckboxLink
                  label='Paid'
                  active={paid}
                  href={buildHref("/corporate/bookings", {
                    ...baseParams,
                    paid: paid ? undefined : "1",
                    unpaid: undefined,
                    page: undefined,
                  })}
                  count={paidCount}
                />
                <CheckboxLink
                  label='Unpaid'
                  active={unpaid}
                  href={buildHref("/corporate/bookings", {
                    ...baseParams,
                    unpaid: unpaid ? undefined : "1",
                    paid: undefined,
                    page: undefined,
                  })}
                  count={unpaidCount}
                />
              </div>
            </div>
          </div>

          {/* Clear All Filters */}
          <div className={styles.filterGroup} style={{ width: "fit-content" }}>
            <CorporateClearFiltersButton hasActiveFilters={hasActiveFilters} />
          </div>
        </div>

        <CorporateSearchFormClient current={baseParams} defaultValue={q} />

        <Pagination
          totalCount={totalCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {bookings.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyTitle}>No bookings found</p>
          <p className={styles.emptyCopy}>
            {hasActiveFilters
              ? "Try adjusting your filters or search."
              : "Bookings made for your corporate account will appear here."}
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
                  <th className={styles.th}>Passenger</th>
                  <th className={styles.th}>Route</th>
                  <SortableHeader
                    label='Service'
                    column='service'
                    currentSort={sort}
                    currentOrder={order}
                    baseParams={baseParams}
                  />
                  <th className={styles.th}>Driver</th>
                  <SortableHeader
                    label='Fare'
                    column='total'
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
                  const href = `/corporate/bookings/${b.id}`;
                  const pickupEta = tz.formatEta(b.pickupAt, now);
                  const confirmationCode = getConfirmationCode(b.id);
                  const total = b.totalCents
                    ? formatMoney(Number(b.totalCents))
                    : "—";

                  const tone = badgeTone(b.status as BookingStatus);
                  const isPaid = b.payment?.status === "PAID";

                  const displayStatus =
                    isPaid &&
                    (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
                      ? "Confirmed"
                      : statusLabel(b.status as BookingStatus);

                  const displayTone =
                    isPaid &&
                    (b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT")
                      ? "good"
                      : tone;

                  const driverName = b.assignment?.driver?.name ?? null;
                  const passengerName =
                    b.corporatePassenger?.name ?? "—";

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
                          aria-label='Open booking'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.pickupCell}>
                          <Link href={href} className={styles.rowLink}>
                            {tz.formatDate(b.pickupAt, companyTz)} @{" "}
                            {formatTime(b.pickupAt, companyTz)}
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
                          <span className={`badge badge_${displayTone}`}>
                            {displayStatus}
                          </span>
                        </div>
                      </td>

                      {/* Passenger */}
                      <td
                        className={styles.td}
                        data-label='Passenger'
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
                          {passengerName}
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
                          {b.vehicle && (
                            <div className={styles.cellSub}>
                              {b.vehicle.name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Driver */}
                      <td
                        className={styles.td}
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
                        <div className={styles.cellStack}>
                          {driverName ? (
                            <>
                              <div className={styles.cellStrong}>
                                {driverName}
                              </div>
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

                      {/* Fare */}
                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label='Fare'
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

/* ── Checkbox Link ─────────────────────────────────────────── */

function CheckboxLink({
  label,
  active,
  href,
  count,
  disabled = false,
}: {
  label: string;
  active: boolean;
  href: string;
  count: number;
  disabled?: boolean;
}) {
  const classes = [
    styles.checkboxLink,
    active ? styles.checkboxActive : "",
    disabled ? styles.checkboxDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (disabled) {
    return (
      <span className={classes}>
        <span className={styles.checkboxBox}>
          {active && <span className={styles.checkmark}>✓</span>}
        </span>
        {label}
        <span className='countPill'>{count}</span>
      </span>
    );
  }

  return (
    <Link className={classes} href={href}>
      <span className={styles.checkboxBox}>
        {active && <span className={styles.checkmark}>✓</span>}
      </span>
      {label}
      <span className='countPill'>{count}</span>
    </Link>
  );
}

/* ── Sortable Header ──────────────────────────────────────── */

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

  const href = buildHref("/corporate/bookings", {
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

/* ── Pagination ───────────────────────────────────────────── */

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

  const prevHref = buildHref("/corporate/bookings", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/corporate/bookings", {
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

          const href = buildHref("/corporate/bookings", {
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