/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./BookingsPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { Prisma, BookingStatus, Role } from "@prisma/client";
import Button from "@/components/shared/Button/Button";
import CustomRangeFormClient from "./CustomRangeFormClient";
import SearchFormClient from "./SearchFormClient";
import ClearFiltersButton from "@/components/admin/Clearfiltersbutton/Clearfiltersbutton";
import FilterSelectClient from "./FilterSelectClient";
import TripGroupBadge from "@/components/admin/TripGroupBadge/TripGroupBadge";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  assigned?: "1";
  paid?: "1";
  unpaid?: "1";
  stuck?: "1";
  completed?: "1";
  future?: "1";
  from?: string;
  to?: string;
  sort?: SortColumn;
  order?: SortOrder;
  page?: string;
  customerType?: "all" | "guest" | "account" | "corporate";
  driver?: string;
};

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

const PAGE_SIZE = 10;

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

function startOfYear(dateUtc: Date, timezone: string) {
  const { y } = tz.toLocalParts(dateUtc, timezone);
  const iso = `${y}-01-01`;
  return new Date(tz.localToUtcIso(iso, "00:00", timezone));
}

function startOfNextYear(yearStartUtc: Date, timezone: string) {
  const { y } = tz.toLocalParts(yearStartUtc, timezone);
  const iso = `${y + 1}-01-01`;
  return new Date(tz.localToUtcIso(iso, "00:00", timezone));
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

function safeCustomerType(v: any): "all" | "guest" | "account" | "corporate" {
  const valid = ["all", "guest", "account", "corporate"];
  return valid.includes(v) ? v : "all";
}

function buildWhere(args: {
  now: Date;
  timezone: string;
  status: StatusFilter;
  range: RangeFilter;
  unassigned: boolean;
  assigned: boolean;
  paid: boolean;
  unpaid: boolean;
  stuck: boolean;
  completed: boolean;
  future: boolean;
  fromYmd: string;
  toYmd: string;
  q?: string;
  customerType?: string;
  driver?: string;
}) {
  const { now, timezone, status, range, paid, stuck, fromYmd, toYmd, q } = args;

  const where: Prisma.BookingWhereInput = {};

  const todayStart = tz.startOfDay(now, timezone);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const monthStart = tz.startOfMonth(now, timezone);
  const nextMonthStart = tz.addMonths(monthStart, 1, timezone);

  const yearStart = startOfYear(now, timezone);
  const nextYearStart = startOfNextYear(yearStart, timezone);

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

    let fromUtc = f ? startOfDayFromYMD(f, timezone) : todayStart;
    const toUtc0 = t ? startOfDayFromYMD(t, timezone) : todayStart;

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

  // Pay filters (mutually exclusive)
  if (paid) {
    where.payment = { is: { status: "PAID" } };
  } else if (args.unpaid) {
    where.NOT = { payment: { status: "PAID" } };
  }

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
      {
        corporateAccount: {
          is: { name: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        corporatePassenger: {
          is: { name: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        corporatePassenger: {
          is: { email: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        corporatePassenger: {
          is: { phone: { contains: needle, mode: "insensitive" } },
        },
      },
      { costCenter: { contains: needle, mode: "insensitive" } },
      { projectCode: { contains: needle, mode: "insensitive" } },
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

  // Customer type filter
  const ct = args.customerType ?? "all";
  if (ct === "guest") {
    where.userId = null;
    where.corporateAccountId = null;
  } else if (ct === "account") {
    where.userId = { not: null };
    where.corporateAccountId = null;
  } else if (ct === "corporate") {
    where.corporateAccountId = { not: null };
  }

  // Trip quick filters (completed / future override range + status)
  if (args.completed) {
    where.status = "COMPLETED" as BookingStatus;
    delete where.pickupAt;
  }

  if (args.future) {
    where.pickupAt = { gte: args.now };
    where.status = {
      notIn: [
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "NO_SHOW",
      ] as BookingStatus[],
    };
  }

  // Assignment filters (driver > unassigned > assigned)
  const drvFilter = args.driver ?? "all";
  if (drvFilter !== "all") {
    where.assignment = { driverId: drvFilter };
  } else if (args.unassigned) {
    where.assignment = { is: null };
  } else if (args.assigned) {
    where.assignment = { isNot: null };
  }

  return where;
}

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
  const customerType = safeCustomerType(sp.customerType);

  const unassigned = sp.unassigned === "1";
  const assigned = (sp as any).assigned === "1";
  const paid = sp.paid === "1";
  const unpaid = (sp as any).unpaid === "1";
  const stuck = sp.stuck === "1";
  const completed = (sp as any).completed === "1";
  const future = (sp as any).future === "1";
  const page = clampPage(sp.page);

  const q = (sp.q ?? "").trim();
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  const defaultFrom = tz.formatIsoDate(now, companyTz);
  const defaultTo = tz.formatIsoDate(now, companyTz);

  const fromYmd = sp.from ?? defaultFrom;
  const toYmd = sp.to ?? defaultTo;

  const allDrivers = await db.user.findMany({
    where: { roles: { has: "DRIVER" } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const driverFilterOptions = [
    { value: "all", label: "All drivers" },
    ...allDrivers.map((d) => ({
      value: d.id,
      label: d.name?.trim() || d.email,
    })),
  ];

  const driverFilter = (sp as any).driver ?? "all";
  const isDriverSelected = driverFilter !== "all";

  const where = buildWhere({
    now,
    timezone: companyTz,
    status,
    range,
    unassigned,
    assigned,
    paid,
    unpaid,
    stuck,
    completed,
    future,
    fromYmd,
    toYmd,
    q,
    customerType,
    driver: driverFilter,
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
      corporateAccount: { select: { name: true } },
      corporatePassenger: { select: { name: true, email: true, phone: true } },
      statusEvents: {
        orderBy: { createdAt: "asc" },
        take: 1,
        include: {
          createdBy: { select: { name: true, email: true, roles: true } },
        },
      },
      tripGroup: {
        select: {
          legCount: true,
          bookings: {
            select: { id: true },
            orderBy: { pickupAt: "asc" },
          },
        },
      },
    },
    orderBy,
    skip,
    take: PAGE_SIZE,
  });

  // ── Count helper (each count computed independently of other checkbox filters) ──

  async function countFor(next: {
    status?: StatusFilter;
    range?: RangeFilter;
    unassigned?: boolean;
    assigned?: boolean;
    paid?: boolean;
    unpaid?: boolean;
    stuck?: boolean;
    completed?: boolean;
    future?: boolean;
    fromYmd?: string;
    toYmd?: string;
    q?: string;
    customerType?: string;
    driver?: string;
  }) {
    const w = buildWhere({
      now,
      timezone: companyTz,
      status: next.status ?? status,
      range: next.range ?? range,
      unassigned:
        typeof next.unassigned === "boolean" ? next.unassigned : false,
      assigned: typeof next.assigned === "boolean" ? next.assigned : false,
      paid: typeof next.paid === "boolean" ? next.paid : false,
      unpaid: typeof next.unpaid === "boolean" ? next.unpaid : false,
      stuck: typeof next.stuck === "boolean" ? next.stuck : false,
      completed: typeof next.completed === "boolean" ? next.completed : false,
      future: typeof next.future === "boolean" ? next.future : false,
      fromYmd: next.fromYmd ?? fromYmd,
      toYmd: next.toYmd ?? toYmd,
      q: next.q ?? q,
      customerType: next.customerType ?? customerType,
      driver: next.driver ?? driverFilter,
    });
    return db.booking.count({ where: w });
  }

  const [
    statusCountsArr,
    rangeCountsArr,
    futureCount,
    completedCount,
    stuckCount,
    paidCount,
    unpaidCount,
    assignedCount,
    unassignedCount,
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
    countFor({ future: true, q }),
    countFor({ completed: true, q }),
    countFor({ stuck: true, q }),
    countFor({ paid: true, q }),
    countFor({ unpaid: true, q }),
    countFor({ assigned: true, q }),
    countFor({ unassigned: true, q }),
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
    assigned: assigned ? "1" : undefined,
    paid: paid ? "1" : undefined,
    unpaid: unpaid ? "1" : undefined,
    stuck: stuck ? "1" : undefined,
    completed: completed ? "1" : undefined,
    future: future ? "1" : undefined,
    from: range === "range" ? fromYmd : undefined,
    to: range === "range" ? toYmd : undefined,
    q: q.length ? q : undefined,
    sort: sort,
    order: sort ? order : undefined,
    customerType: customerType !== "all" ? customerType : undefined,
    driver: driverFilter !== "all" ? driverFilter : undefined,
  };

  const hasActiveFilters =
    status !== "ALL" ||
    range !== "month" ||
    unassigned ||
    assigned ||
    paid ||
    unpaid ||
    stuck ||
    completed ||
    future ||
    q.length > 0 ||
    sort !== undefined ||
    customerType !== "all" ||
    isDriverSelected;

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
              text='New Booking +'
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
          {/* Dropdown row: Time · Status · Customer type · Driver */}
          <div className={styles.filterRow}>
            <FilterSelectClient
              label='Time'
              paramName='range'
              defaultValue='month'
              current={baseParams}
              options={[
                {
                  value: "month",
                  label: "Current month",
                  count: rangeCounts.month,
                },
                {
                  value: "year",
                  label: "Current year",
                  count: rangeCounts.year,
                },
                {
                  value: "today",
                  label: "Today",
                  count: rangeCounts.today,
                },
                {
                  value: "next24",
                  label: "Next 24h",
                  count: rangeCounts.next24,
                },
                {
                  value: "next7",
                  label: "Next 7 days",
                  count: rangeCounts.next7,
                },
                {
                  value: "range",
                  label: "Custom range",
                },
              ]}
            />

            <FilterSelectClient
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

            <FilterSelectClient
              label='Customer type'
              paramName='customerType'
              defaultValue='all'
              current={baseParams}
              options={[
                { value: "all", label: "All customers" },
                { value: "guest", label: "Guest" },
                { value: "account", label: "Account" },
                { value: "corporate", label: "Corporate" },
              ]}
            />

            <FilterSelectClient
              label='Driver'
              paramName='driver'
              defaultValue='all'
              current={baseParams}
              options={driverFilterOptions}
            />
          </div>

          {/* Custom date range */}
          {range === "range" ? (
            <CustomRangeFormClient
              current={baseParams}
              defaultFrom={defaultFrom}
              defaultTo={defaultTo}
            />
          ) : null}

          {/* Checkbox filter sections */}
          <FilterCheckboxSections
            current={baseParams}
            isDriverSelected={isDriverSelected}
            counts={{
              future: futureCount,
              completed: completedCount,
              stuck: stuckCount,
              paid: paidCount,
              unpaid: unpaidCount,
              assigned: assignedCount,
              unassigned: unassignedCount,
            }}
          />

          {/* Clear All Filters */}
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
                  const pickupEta = tz.formatEta(b.pickupAt, now);
                  const createdAgo = tz.formatEta(b.createdAt, now);
                  const total = tz.formatMoneyShort(b.totalCents ?? 0);

                  const confirmationCode = getConfirmationCode(b.id);

                  const isCorporate = Boolean((b as any).corporateAccount);

                  const tripGroup = (b as any).tripGroup ?? null;
                  const legNumber = tripGroup
                    ? tripGroup.bookings.findIndex(
                        (bg: any) => bg.id === b.id,
                      ) + 1
                    : 0;
                  const customerName =
                    b.user?.name?.trim() ||
                    b.guestName?.trim() ||
                    (b as any).corporatePassenger?.name?.trim() ||
                    "Guest";
                  const customerEmail =
                    b.user?.email ??
                    b.guestEmail ??
                    (b as any).corporatePassenger?.email ??
                    "";

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
                  } else if (isCorporate) {
                    createdByTop = "Corp Admin";
                  } else if (actor) {
                    createdByTop = "User account";
                  } else if (b.user) {
                    createdByTop = "User account";
                  } else {
                    createdByTop = "Guest checkout";
                  }

                  return (
                    <tr
                      key={b.id}
                      className={`${styles.tr} ${isCorporate ? styles.trCorporate : ""}`}
                    >
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
                            {tz.formatDate(b.createdAt, companyTz)}{" "}
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
                            {tz.formatDate(b.pickupAt, companyTz)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{pickupEta}</span>
                          </div>
                        </div>
                      </td>
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
                          {tripGroup && legNumber > 0 && (
                            <TripGroupBadge
                              legNumber={legNumber}
                              totalLegs={tripGroup.legCount}
                            />
                          )}
                        </div>
                      </td>
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
                          <div className={styles.cellSub}>
                            {isCorporate
                              ? ((b as any).corporateAccount?.name ??
                                customerEmail)
                              : customerEmail}
                          </div>
                        </div>
                      </td>
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

/* ── Filter Checkbox Sections ──────────────────────────────── */

function FilterCheckboxSections({
  current,
  isDriverSelected,
  counts,
}: {
  current: Record<string, string | undefined>;
  isDriverSelected: boolean;
  counts: {
    future: number;
    completed: number;
    stuck: number;
    paid: number;
    unpaid: number;
    assigned: number;
    unassigned: number;
  };
}) {
  const futureOn = current.future === "1";
  const completedOn = current.completed === "1";
  const stuckOn = current.stuck === "1";
  const paidOn = current.paid === "1";
  const unpaidOn = current.unpaid === "1";
  const assignedOn = current.assigned === "1";
  const unassignedOn = current.unassigned === "1";

  // Trip filter hrefs (mutually exclusive within group)
  const futureHref = buildHref("/admin/bookings", {
    ...current,
    future: futureOn ? undefined : "1",
    completed: undefined,
    stuck: undefined,
    page: undefined,
  });

  const completedHref = buildHref("/admin/bookings", {
    ...current,
    completed: completedOn ? undefined : "1",
    future: undefined,
    stuck: undefined,
    page: undefined,
  });

  const stuckHref = buildHref("/admin/bookings", {
    ...current,
    stuck: stuckOn ? undefined : "1",
    status: stuckOn ? current.status : "PENDING_REVIEW",
    future: undefined,
    completed: undefined,
    page: undefined,
  });

  // Pay filter hrefs (mutually exclusive)
  const paidHref = buildHref("/admin/bookings", {
    ...current,
    paid: paidOn ? undefined : "1",
    unpaid: undefined,
    page: undefined,
  });

  const unpaidHref = buildHref("/admin/bookings", {
    ...current,
    unpaid: unpaidOn ? undefined : "1",
    paid: undefined,
    page: undefined,
  });

  // Assignment filter hrefs (mutually exclusive)
  const assignedHref = buildHref("/admin/bookings", {
    ...current,
    assigned: assignedOn ? undefined : "1",
    unassigned: undefined,
    page: undefined,
  });

  const unassignedHref = buildHref("/admin/bookings", {
    ...current,
    unassigned: unassignedOn ? undefined : "1",
    assigned: undefined,
    page: undefined,
  });

  return (
    <div className={styles.filterSections}>
      {/* Trip Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterTitle}>Trip Filters</div>
        <div className={styles.checkboxCol}>
          <CheckboxLink
            label='Future Trips'
            active={futureOn}
            href={futureHref}
            count={counts.future}
          />
          <CheckboxLink
            label='Completed'
            active={completedOn}
            href={completedHref}
            count={counts.completed}
          />
          <CheckboxLink
            label='Stuck in Review'
            active={stuckOn}
            href={stuckHref}
            count={counts.stuck}
          />
        </div>
      </div>

      {/* Pay Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterTitle}>Pay Filters</div>
        <div className={styles.checkboxCol}>
          <CheckboxLink
            label='Paid'
            active={paidOn}
            href={paidHref}
            count={counts.paid}
          />
          <CheckboxLink
            label='Unpaid'
            active={unpaidOn}
            href={unpaidHref}
            count={counts.unpaid}
          />
        </div>
      </div>

      {/* Assignment Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterTitle}>Assignment Filters</div>
        <div className={styles.checkboxCol}>
          <CheckboxLink
            label='Assigned'
            active={assignedOn}
            href={assignedHref}
            count={counts.assigned}
            disabled={isDriverSelected}
          />
          <CheckboxLink
            label='Unassigned'
            active={unassignedOn}
            href={unassignedHref}
            count={counts.unassigned}
            disabled={isDriverSelected}
          />
        </div>
      </div>
    </div>
  );
}

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
