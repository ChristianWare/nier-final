/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./BookingsPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { Prisma, BookingStatus, Role } from "@prisma/client";
import Button from "@/components/shared/Button/Button";
import SearchFormClient from "./SearchFormClient";
import TripGroupBadge from "@/components/admin/TripGroupBadge/TripGroupBadge";
import BookingsChart from "./BookingsChart";
import BookingsTimeControls from "./BookingsTimeControls";
import BookingsFilters from "./BookingsFilters";
import { redirect } from "next/navigation";
import {
  STATUS_GROUP_FILTERS,
  buildBookingsWhere,
  mapLegacyBookingParams,
  type AssignmentFilter,
  type BookingsWhereArgs,
  type FlightFilter,
  type PaymentFilter,
} from "@/lib/booking/bookingsWhere";
import CountUp from "@/components/shared/CountUp/CountUp";
// The cards and chart reuse the earnings page's styles so both pages match.
import earnings from "../earnings/AdminEarningsPage.module.css";
import chartStyles from "./BookingsChart.module.css";
import { describeRange, getRangeWindow } from "@/lib/booking/bookingsRange";
import {
  loadTripsForCollection,
  summarizeCollection,
  toCollectionRide,
  type CollectionSummary,
} from "@/lib/booking/rideCollection";
import {
  buildBookingsChart,
  countRidesBetween,
  safeBreakdown,
  sameDaysLastMonth,
  type ChartBasis,
  type ChartRow,
} from "@/lib/booking/bookingsChart";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import {
  BulkSelectProvider,
  BulkActionBar,
  RowCheckbox,
  SelectAllCheckbox,
} from "./BulkSelect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "ALL",
  // Groups, the same ones as the cards and the chart colors
  "NEEDS_ACTION",
  "BOOKED",
  "DONE",
  "LOST",
  "STUCK",
  "PAYMENT_RECEIVED",
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
  "TRASH",
] as const;

const RANGES = [
  "all",
  "month",
  "week",
  "last12",
  "ytd",
  "year", // full calendar year; kept for existing links (no tab of its own)
  "today",
  "next24",
  "next7",
  "upcoming",
  "range",
] as const;

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
  // Old checkbox params: redirected to payment / assignment / flight /
  // status / range by mapLegacyBookingParams.
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
  basis?: "created";
  breakdown?: string;
  /** YYYY-MM for the Daily view; omitted for the current month. */
  month?: string;
  payment?: string;
  assignment?: string;
  flight?: string;
};

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

const PAGE_SIZE = 10;

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
    case "TRASH":
      return "Trash";
    case "ALL":
      return "All";
    case "NEEDS_ACTION":
      return "Needs action";
    case "BOOKED":
      return "Booked";
    case "DONE":
      return "Done";
    case "LOST":
      return "Lost";
    case "STUCK":
      return "Stuck in review";
    case "PAYMENT_RECEIVED":
      return "Payment Received";
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
const MONTH_OPTIONS = [
  { v: "01", label: "Jan" },
  { v: "02", label: "Feb" },
  { v: "03", label: "Mar" },
  { v: "04", label: "Apr" },
  { v: "05", label: "May" },
  { v: "06", label: "Jun" },
  { v: "07", label: "Jul" },
  { v: "08", label: "Aug" },
  { v: "09", label: "Sep" },
  { v: "10", label: "Oct" },
  { v: "11", label: "Nov" },
  { v: "12", label: "Dec" },
];
/** Same markup and styles as the earnings page's KPI cards. */
function KpiCard({
  label,
  value,
  sub,
  prefix,
  tone = "neutral",
  href,
  active = false,
}: {
  label: string;
  value: number;
  sub: string;
  prefix?: string;
  tone?: "neutral" | "good" | "warn" | "tip" | "bad";
  /** Makes the card a filter: clicking it opens this link. */
  href?: string;
  /** This card's filter is the one applied. */
  active?: boolean;
}) {
  const toneClass =
    tone === "bad" ? chartStyles.tone_bad : earnings[`tone_${tone}`];
  const card = (
    <div
      className={[
        earnings.kpiCard,
        toneClass ?? "",
        href ? chartStyles.kpiLink : "",
        active ? chartStyles.kpiActive : "",
      ].join(" ")}
    >
      <div className={earnings.kpiTop}>
        <div className='emptyTitle underline'>{label}</div>
      </div>
      <div className={earnings.kpiValue}>
        {prefix ? <span>{prefix}</span> : null}
        <CountUp from={0} to={value} duration={1.5} separator=',' delay={0.1} />
      </div>
      <div className='miniNote'>{sub}</div>
    </div>
  );
  if (!href) return card;
  return (
    <Link
      href={href}
      scroll={false}
      className={chartStyles.kpiAnchor}
      aria-current={active ? "true" : undefined}
      title={
        active
          ? "Showing these bookings. Click to show all."
          : "Show these bookings"
      }
    >
      {card}
    </Link>
  );
}

function buildOrderBy(
  sort: SortColumn | undefined,
  order: SortOrder,
  status: StatusFilter,
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

  if (status === "STUCK" || status === "PENDING_REVIEW") {
    return [{ createdAt: Prisma.SortOrder.asc }];
  }
  if (status === "ALL" || status === "DONE" || status === "LOST") {
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

  // Old bookmarks (?paid=1, ?stuck=1, …) open the same view in the new filters.
  const legacyParams = mapLegacyBookingParams(
    sp as Record<string, string | undefined>,
  );
  if (legacyParams) redirect(buildHref("/admin/bookings", legacyParams));

  const status = safeStatus(sp.status) as StatusFilter;
  // When searching, default to all-time so results aren't hidden by date range
  const range = safeRange(
    sp.range ?? (sp.q?.trim() ? "all" : "month"),
  ) as RangeFilter;
  const sort = safeSort(sp.sort);
  const order = safeOrder(sp.order);
  const customerType = safeCustomerType(sp.customerType);

  const payment: PaymentFilter =
    sp.payment === "paid" || sp.payment === "unpaid" ? sp.payment : "any";
  const assignment: AssignmentFilter =
    sp.assignment === "assigned" || sp.assignment === "unassigned"
      ? sp.assignment
      : "any";
  const flight: FlightFilter =
    sp.flight === "yes" || sp.flight === "no" ? sp.flight : "any";
  const serviceTypeFilter = (sp as any).serviceType ?? "all";
  const rideTypeFilter = (sp as any).rideType ?? "all";
  const page = clampPage(sp.page);

  // "Booked date" filters by when bookings were made, so it only applies to
  // ranges that look back in time.
  const basis: ChartBasis =
    sp.basis === "created" &&
    range !== "next24" &&
    range !== "next7" &&
    range !== "upcoming"
      ? "created"
      : "pickup";
  const dateField: "pickupAt" | "createdAt" =
    basis === "created" ? "createdAt" : "pickupAt";
  const breakdown = safeBreakdown(sp.breakdown);
  const monthParam =
    sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : undefined;

  const q = (sp.q ?? "").trim();
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();
  const currentMonthKey = tz.monthKey(now, companyTz);
  const selectedMonthKey = monthParam ?? currentMonthKey;

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

  const allServiceTypes = await db.serviceType.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  const serviceTypeFilterOptions = [
    { value: "all", label: "All services" },
    ...allServiceTypes.map((s) => ({ value: s.id, label: s.name })),
  ];

  const driverFilter = (sp as any).driver ?? "all";
  const isDriverSelected = driverFilter !== "all";

  const whereArgs: BookingsWhereArgs = {
    now,
    timezone: companyTz,
    status,
    range,
    fromYmd,
    toYmd,
    q,
    customerType,
    driver: driverFilter,
    serviceType: serviceTypeFilter,
    rideType: rideTypeFilter,
    payment,
    assignment,
    flight,
    dateField,
    monthKey: selectedMonthKey,
  };
  const where = buildBookingsWhere(whereArgs);
  const orderBy = buildOrderBy(sort, order, status);

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

  // ── Counts for each filter option: the current period and every other
  // filter applied, with just that one filter changed ──
  function countFor(next: Partial<BookingsWhereArgs>) {
    return db.booking.count({
      where: buildBookingsWhere({ ...whereArgs, ...next }),
    });
  }
  const PAYMENT_VALUES = ["any", "paid", "unpaid"] as const;
  const ASSIGNMENT_VALUES = ["any", "assigned", "unassigned"] as const;
  const FLIGHT_VALUES = ["any", "yes", "no"] as const;

  const [
    statusCountsArr,
    paymentCountsArr,
    assignmentCountsArr,
    flightCountsArr,
  ] = await Promise.all([
    Promise.all(
      STATUSES.map(async (s) => [s, await countFor({ status: s })] as const),
    ),
    Promise.all(
      PAYMENT_VALUES.map(
        async (v) => [v, await countFor({ payment: v })] as const,
      ),
    ),
    Promise.all(
      ASSIGNMENT_VALUES.map(
        async (v) => [v, await countFor({ assignment: v })] as const,
      ),
    ),
    Promise.all(
      FLIGHT_VALUES.map(
        async (v) => [v, await countFor({ flight: v })] as const,
      ),
    ),
  ]);

  const statusCounts = Object.fromEntries(statusCountsArr) as Record<
    StatusFilter,
    number
  >;
  const paymentCounts = Object.fromEntries(paymentCountsArr) as Record<
    PaymentFilter,
    number
  >;
  const assignmentCounts = Object.fromEntries(assignmentCountsArr) as Record<
    AssignmentFilter,
    number
  >;
  const flightCounts = Object.fromEntries(flightCountsArr) as Record<
    FlightFilter,
    number
  >;

  const baseParams: Record<string, string | undefined> = {
    status: status === "ALL" ? "ALL" : status,
    range: range === "month" ? undefined : range,
    from: range === "range" ? fromYmd : undefined,
    to: range === "range" ? toYmd : undefined,
    q: q.length ? q : undefined,
    sort: sort,
    order: sort ? order : undefined,
    customerType: customerType !== "all" ? customerType : undefined,
    driver: driverFilter !== "all" ? driverFilter : undefined,
    serviceType: serviceTypeFilter !== "all" ? serviceTypeFilter : undefined,
    rideType: rideTypeFilter !== "all" ? rideTypeFilter : undefined,
    payment: payment !== "any" ? payment : undefined,
    assignment: assignment !== "any" ? assignment : undefined,
    flight: flight !== "any" ? flight : undefined,
    basis: basis === "created" ? "created" : undefined,
    breakdown: breakdown !== "status" ? breakdown : undefined,
    month: range === "month" ? monthParam : undefined,
  };

  // Which-bookings filters (and search). "Clear filters" resets these and
  // keeps the time view.
  const hasActiveFilters =
    status !== "ALL" ||
    customerType !== "all" ||
    isDriverSelected ||
    serviceTypeFilter !== "all" ||
    rideTypeFilter !== "all" ||
    payment !== "any" ||
    assignment !== "any" ||
    flight !== "any" ||
    q.length > 0;

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  // ── Time controls, cards and chart: all driven by the filters above ──
  // All time and Upcoming have no fixed end, so the chart fits to the data.
  const fitToData = range === "all" || range === "upcoming";
  const win = getRangeWindow({
    now,
    timezone: companyTz,
    range,
    fromYmd,
    toYmd,
    monthKey: selectedMonthKey,
  });
  const rangeLabel = describeRange({
    range,
    win,
    now,
    timezone: companyTz,
  });

  const bounds = await db.booking.aggregate({
    _min: { pickupAt: true, createdAt: true },
    _max: { pickupAt: true },
  });
  const thisYear = tz.toLocalParts(now, companyTz).y;
  const firstYear = Math.min(
    thisYear,
    bounds._min.pickupAt
      ? tz.toLocalParts(bounds._min.pickupAt, companyTz).y
      : thisYear,
    bounds._min.createdAt
      ? tz.toLocalParts(bounds._min.createdAt, companyTz).y
      : thisYear,
  );
  const lastYear = Math.max(
    thisYear + 1,
    bounds._max.pickupAt
      ? tz.toLocalParts(bounds._max.pickupAt, companyTz).y
      : thisYear,
  );
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) =>
    String(firstYear + i),
  );

  let chartData: ReturnType<typeof buildBookingsChart> | null = null;
  let collection: CollectionSummary | null = null;
  let ridesSub = rangeLabel;
  if (status !== "TRASH" && status !== "DRAFT") {
    const raw = await db.booking.findMany({
      where: { AND: [where, { status: { not: "DRAFT" as BookingStatus } }] },
      select: {
        id: true,
        status: true,
        pickupAt: true,
        createdAt: true,
        tripGroupId: true,
        totalCents: true,
        userId: true,
        corporateAccountId: true,
        serviceType: { select: { id: true, name: true } },
        vehicle: { select: { id: true, name: true } },
        assignment: {
          select: { driver: { select: { id: true, name: true, email: true } } },
        },
        payment: {
          select: { amountPaidCents: true, amountRefundedCents: true },
        },
      },
    });
    const chartRows: ChartRow[] = raw.map((b) => ({
      id: b.id,
      status: b.status,
      pickupAt: b.pickupAt,
      createdAt: b.createdAt,
      tripGroupId: b.tripGroupId,
      totalCents: b.totalCents,
      userId: b.userId,
      corporateAccountId: b.corporateAccountId,
      serviceType: b.serviceType ?? null,
      vehicle: b.vehicle ?? null,
      driver: b.assignment?.driver
        ? {
            id: b.assignment.driver.id,
            name: b.assignment.driver.name?.trim() || b.assignment.driver.email,
          }
        : null,
    }));

    // Paid toward these same rides (whenever it was paid), trip-aware.
    collection = summarizeCollection(
      raw.map(toCollectionRide),
      await loadTripsForCollection(raw.map((b) => b.tripGroupId)),
    );

    chartData = buildBookingsChart({
      rows: chartRows,
      now,
      timeZone: companyTz,
      range,
      basis,
      breakdown,
      window: !fitToData && win?.lt ? { start: win.gte, end: win.lt } : null,
    });

    // Current month: how the month is going against the same days last month.
    if (
      range === "month" &&
      selectedMonthKey === currentMonthKey &&
      !fitToData
    ) {
      const sd = sameDaysLastMonth(now, companyTz);
      const lastWhere = buildBookingsWhere({
        ...whereArgs,
        range: "range",
        fromYmd: sd.lastFromYmd,
        toYmd: sd.lastToYmd,
      });
      const lastRides = await db.booking.count({
        where: {
          AND: [lastWhere, { status: { not: "DRAFT" as BookingStatus } }],
        },
      });
      const soFar = countRidesBetween(
        chartRows,
        basis,
        companyTz,
        sd.thisFromYmd,
        sd.thisToYmd,
      );
      ridesSub = `So far ${soFar} · same days last month ${lastRides}`;
    }
  }

  const cardHref = (value: string) =>
    buildHref("/admin/bookings", {
      ...baseParams,
      status: status === value ? "ALL" : value,
    });

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

        <BookingsTimeControls
          activeRange={range}
          basis={basis}
          years={years}
          monthOptions={MONTH_OPTIONS}
          selectedYear={selectedMonthKey.slice(0, 4)}
          selectedMonth={selectedMonthKey.slice(5, 7)}
          currentMonthKey={currentMonthKey}
          from={fromYmd}
          to={toYmd}
          rangeLabel={rangeLabel}
        />

        <BookingsFilters
          values={{
            status,
            customerType,
            driver: driverFilter,
            serviceType: serviceTypeFilter,
            rideType: rideTypeFilter,
            payment,
            assignment,
            flight,
          }}
          statusGroups={[
            {
              options: [
                { value: "ALL", label: "All", count: statusCounts.ALL },
              ],
            },
            {
              label: "Groups",
              options: (
                ["NEEDS_ACTION", "BOOKED", "DONE", "LOST", "STUCK"] as const
              ).map((v) => ({
                value: v,
                label: statusTabLabel(v),
                count: statusCounts[v],
              })),
            },
            {
              label: "Statuses",
              options: STATUSES.filter(
                (v) =>
                  v !== "ALL" &&
                  v !== "STUCK" &&
                  v !== "DRAFT" &&
                  v !== "TRASH" &&
                  !STATUS_GROUP_FILTERS[v],
              ).map((v) => ({
                value: v,
                label: statusTabLabel(v),
                count: statusCounts[v],
              })),
            },
            {
              label: "Other",
              options: (["DRAFT", "TRASH"] as const).map((v) => ({
                value: v,
                label: v === "DRAFT" ? "Drafts" : "Trash",
                count: statusCounts[v],
              })),
            },
          ]}
          customerOptions={[
            { value: "all", label: "All customers" },
            { value: "guest", label: "Guest" },
            { value: "account", label: "Account" },
            { value: "corporate", label: "Corporate" },
          ]}
          driverOptions={driverFilterOptions}
          serviceOptions={serviceTypeFilterOptions}
          rideOptions={[
            { value: "all", label: "All ride types" },
            { value: "single", label: "Single Ride" },
            { value: "multi", label: "Multi Trip" },
          ]}
          paymentOptions={[
            { value: "any", label: "Any", count: paymentCounts.any },
            { value: "paid", label: "Paid", count: paymentCounts.paid },
            { value: "unpaid", label: "Unpaid", count: paymentCounts.unpaid },
          ]}
          assignmentOptions={[
            { value: "any", label: "Any", count: assignmentCounts.any },
            {
              value: "assigned",
              label: "Assigned",
              count: assignmentCounts.assigned,
            },
            {
              value: "unassigned",
              label: "Unassigned",
              count: assignmentCounts.unassigned,
            },
          ]}
          flightOptions={[
            { value: "any", label: "Any", count: flightCounts.any },
            { value: "yes", label: "Has flight info", count: flightCounts.yes },
            { value: "no", label: "No flight info", count: flightCounts.no },
          ]}
          hasActive={hasActiveFilters}
        />

        <SearchFormClient current={baseParams} defaultValue={q} />
      </header>

      {chartData ? (
        <div className={chartStyles.kpiSection}>
          <div className={earnings.kpiGrid}>
            <KpiCard
              label='Rides'
              href={buildHref("/admin/bookings", {
                ...baseParams,
                status: "ALL",
              })}
              active={status === "ALL"}
              value={chartData.summary.rides}
              sub={ridesSub}
            />
            <KpiCard
              label='Needs action'
              href={cardHref("NEEDS_ACTION")}
              active={status === "NEEDS_ACTION"}
              value={chartData.summary.needsAction}
              sub='Pending review or payment'
              tone='warn'
            />
            <KpiCard
              label='Booked'
              href={cardHref("BOOKED")}
              active={status === "BOOKED"}
              value={chartData.summary.upcoming - chartData.summary.needsAction}
              sub='Confirmed or assigned'
              tone='tip'
            />
            <KpiCard
              label='Done'
              href={cardHref("DONE")}
              active={status === "DONE"}
              value={chartData.summary.done}
              sub='Completed or underway'
              tone='good'
            />
            <KpiCard
              label='Lost'
              href={cardHref("LOST")}
              active={status === "LOST"}
              value={chartData.summary.lost}
              sub={
                chartData.summary.lostRate == null
                  ? "Cancelled, no-show, declined"
                  : `${Math.round(chartData.summary.lostRate * 100)}% · cancelled, no-show, declined`
              }
              tone='bad'
            />
            <KpiCard
              label='Trips'
              value={chartData.summary.trips}
              sub='A multi-ride trip counts once'
            />
            <KpiCard
              label='Booked value'
              value={Math.round(chartData.summary.bookedValueCents / 100)}
              prefix='$'
              sub='Excludes lost rides'
            />
            <KpiCard
              label='Collected'
              value={Math.round((collection?.collectedCents ?? 0) / 100)}
              prefix='$'
              sub={
                collection && collection.scheduledCents > 0
                  ? `${Math.round((collection.collectedRate ?? 0) * 100)}% of booked value · ${tz.formatMoneyShort(collection.stillOwedCents)} still owed`
                  : "Nothing booked yet"
              }
            />
          </div>

          <BookingsChart
            data={chartData}
            breakdown={breakdown}
            rangeLabel={rangeLabel}
          />
        </div>
      ) : null}

      <Pagination
        totalCount={totalCount}
        page={safePage}
        totalPages={totalPages}
        current={pageParams}
      />

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
            <BulkSelectProvider>
              <BulkActionBar inTrash={status === "TRASH"} />
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr className={styles.trHead}>
                    <th className={styles.th}>
                      <SelectAllCheckbox ids={bookings.map((b) => b.id)} />
                    </th>
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
                    const isWekopa =
                      !isCorporate &&
                      (b as any).eventType === "Golf Transfer — We-Ko-Pa";
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
                      payStatus === "PARTIALLY_PAID"
                        ? "Partially paid"
                        : payStatus === "PAID" &&
                            (b.status === "CONFIRMED" ||
                              b.status === "PENDING_PAYMENT")
                          ? "Paid"
                          : payStatus === "PAID" && b.status === "COMPLETED"
                            ? "Completed · Paid"
                            : statusLabel(b.status);

                    const statusTone: BadgeTone =
                      payStatus === "PARTIALLY_PAID"
                        ? "warn"
                        : payStatus === "PAID" &&
                            (b.status === "CONFIRMED" ||
                              b.status === "PENDING_PAYMENT")
                          ? "good"
                          : payStatus === "PAID" && b.status === "COMPLETED"
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
                        className={`${styles.tr} ${isCorporate ? styles.trCorporate : isWekopa ? styles.trWekopa : ""}`}
                      >
                        <td className={styles.td} data-label='Select'>
                          <RowCheckbox id={b.id} />
                        </td>
                        <td
                          className={styles.td}
                          data-label='Created'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-label='Open booking'
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {b.assignment?.driver ? (
                            <div className={styles.cellStack}>
                              <div className={styles.cellStrong}>
                                {driverName || "—"}
                              </div>
                              <div className={styles.cellSub}>
                                {driverEmail}
                              </div>
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
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <div className={styles.totalCell}>{total}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </BulkSelectProvider>
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
