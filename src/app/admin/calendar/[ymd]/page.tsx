/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma, BookingStatus } from "@prisma/client";
import styles from "./AdminCalendarDay.module.css";
import Button from "@/components/shared/Button/Button";
import {
  PHX_TZ,
  startOfPhoenixDayFromYmd,
  ymdInPhoenix,
} from "../../lib/phxDates";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "ALL",
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
  "COMPLETED",
] as const;

type StatusFilter = (typeof STATUSES)[number];
type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

const PAGE_SIZE = 10;

function isValidYmd(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function formatDateTitle(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: PHX_TZ,
  }).format(dt);
}

function formatTime(dt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

function formatPhoenix(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
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

function safeStatus(v: any): StatusFilter {
  return STATUSES.includes(v) ? v : "ALL";
}

type SearchParams = {
  status?: StatusFilter;
  unassigned?: "1";
  paid?: "1";
  page?: string;
};

export default async function AdminCalendarDayPage(props: {
  params: Promise<{ ymd?: string; date?: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.params;
  const sp = await props.searchParams;
  const ymd = params.ymd ?? params.date;

  if (!ymd || !isValidYmd(ymd)) notFound();

  const startOrNull = startOfPhoenixDayFromYmd(ymd);
  if (!startOrNull) notFound();

  // TypeScript now knows start is definitely a Date (not null)
  const start: Date = startOrNull;
  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();

  const status = safeStatus(sp.status);
  const unassigned = sp.unassigned === "1";
  const paid = sp.paid === "1";
  const page = clampPage(sp.page);

  // Build where clause
  const where: Prisma.BookingWhereInput = {
    pickupAt: { gte: start, lt: next },
  };

  // Exclude cancelled/no-show/refunded unless specifically filtered
  if (status === "ALL") {
    where.NOT = { status: { in: ["CANCELLED", "NO_SHOW", "REFUNDED"] } };
  } else {
    where.status = status as BookingStatus;
  }

  if (unassigned) where.assignment = { is: null };
  if (paid) where.payment = { is: { status: "PAID" } };

  const totalCount = await db.booking.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const bookings = await db.booking.findMany({
    where,
    orderBy: [{ pickupAt: "asc" }],
    skip,
    take: PAGE_SIZE,
    include: {
      user: { select: { name: true, email: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      payment: { select: { status: true } },
      assignment: {
        include: { driver: { select: { name: true, email: true } } },
      },
    },
  });

  // Counts for filters
  async function countFor(opts: {
    status?: StatusFilter;
    unassigned?: boolean;
    paid?: boolean;
  }) {
    const countWhere: Prisma.BookingWhereInput = {
      pickupAt: { gte: start, lt: next },
    };

    const nextStatus = opts.status ?? status;
    if (nextStatus === "ALL") {
      countWhere.NOT = { status: { in: ["CANCELLED", "NO_SHOW", "REFUNDED"] } };
    } else {
      countWhere.status = nextStatus as BookingStatus;
    }

    const nextUnassigned =
      typeof opts.unassigned === "boolean" ? opts.unassigned : unassigned;
    const nextPaid = typeof opts.paid === "boolean" ? opts.paid : paid;

    if (nextUnassigned) countWhere.assignment = { is: null };
    if (nextPaid) countWhere.payment = { is: { status: "PAID" } };

    return db.booking.count({ where: countWhere });
  }

  const [statusCountsArr, unassignedCount, paidCount] = await Promise.all([
    Promise.all(
      STATUSES.map(async (s) => {
        const c = await countFor({ status: s });
        return [s, c] as const;
      }),
    ),
    countFor({ unassigned: true }),
    countFor({ paid: true }),
  ]);

  const statusCounts = Object.fromEntries(statusCountsArr) as Record<
    StatusFilter,
    number
  >;

  const title = formatDateTitle(ymd);
  const todayKey = ymdInPhoenix(new Date());
  const isToday = ymd === todayKey;

  // Base params for links
  const baseParams: Record<string, string | undefined> = {
    status: status === "ALL" ? undefined : status,
    unassigned: unassigned ? "1" : undefined,
    paid: paid ? "1" : undefined,
  };

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  return (
    <section className={styles.container} aria-label='Rides for day'>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>
              {title}
              {isToday ? " (Today)" : ""}
            </h1>
          </div>

          <div className={styles.headerActions}>
           
            <Link href='/admin/calendar' className='backBtn'>
              <Arrow className='backArrow' /> Back
            </Link>
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{totalCount}</strong> ride
            {totalCount !== 1 ? "s" : ""} scheduled
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
            <div className={styles.filterTitle}>Status</div>
            <StatusTabs
              ymd={ymd}
              active={status}
              current={baseParams}
              counts={statusCounts}
            />
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Quick filters</div>
            <ToggleChips
              ymd={ymd}
              current={baseParams}
              counts={{ unassigned: unassignedCount, paid: paidCount }}
            />
          </div>
        </div>

        <Pagination
          ymd={ymd}
          totalCount={totalCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {bookings.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No rides found.</p>
          <p className={styles.emptyCopy}>
            Try adjusting filters or check another date.
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
                  <th className={styles.th}>Pickup Time</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Customer</th>
                  <th className={styles.th}>Service</th>
                  <th className={styles.th}>Vehicle</th>
                  <th className={styles.th}>Driver</th>
                  <th className={styles.th}>Route</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Total</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((b) => {
                  const href = `/admin/bookings/${b.id}`;
                  const pickupTime = formatTime(b.pickupAt);
                  const pickupEta = formatEta(b.pickupAt, now);
                  const total = formatMoneyFromCents(b.totalCents ?? 0);

                  const customerName =
                    b.user?.name?.trim() ||
                    (b.guestName ?? "").trim() ||
                    "Guest";
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

                  return (
                    <tr key={b.id} className={styles.tr}>
                      {/* Pickup Time */}
                      <td
                        className={styles.td}
                        data-label='Pickup Time'
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
                            {pickupTime}
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
                        <div className={styles.cellStack}>
                          <div className={styles.cellStrong}>
                            {b.pickupAddress?.split(",")[0] ?? "—"}
                          </div>
                          <div className={styles.cellSub}>
                            → {b.dropoffAddress?.split(",")[0] ?? "—"}
                          </div>
                        </div>
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
        ymd={ymd}
        totalCount={totalCount}
        page={safePage}
        totalPages={totalPages}
        current={pageParams}
      />
    </section>
  );
}

function StatusTabs({
  ymd,
  active,
  current,
  counts,
}: {
  ymd: string;
  active: StatusFilter;
  current: Record<string, string | undefined>;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <div className={styles.tabRow}>
      {STATUSES.map((s) => {
        const href = buildHref(`/admin/calendar/${ymd}`, {
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
            {s === "ALL" ? "All" : s}
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

function ToggleChips({
  ymd,
  current,
  counts,
}: {
  ymd: string;
  current: Record<string, string | undefined>;
  counts: { unassigned: number; paid: number };
}) {
  const unassignedOn = current.unassigned === "1";
  const paidOn = current.paid === "1";

  const unassignedHref = buildHref(`/admin/calendar/${ymd}`, {
    ...current,
    unassigned: unassignedOn ? undefined : "1",
    page: undefined,
  });

  const paidHref = buildHref(`/admin/calendar/${ymd}`, {
    ...current,
    paid: paidOn ? undefined : "1",
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
    </div>
  );
}

function Pagination({
  ymd,
  totalCount,
  page,
  totalPages,
  current,
}: {
  ymd: string;
  totalCount: number;
  page: number;
  totalPages: number;
  current: Record<string, string | undefined>;
}) {
  if (totalCount === 0) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevHref = buildHref(`/admin/calendar/${ymd}`, {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref(`/admin/calendar/${ymd}`, {
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

          const href = buildHref(`/admin/calendar/${ymd}`, {
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
