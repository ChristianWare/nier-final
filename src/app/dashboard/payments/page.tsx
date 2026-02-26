/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./PaymentsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PaymentStatus } from "@prisma/client";
import Link from "next/link";
import PaymentDownloadBtn from "./PaymentDownloadBtn";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import { getStripe, getStripePublishableKey } from "@/lib/stripe";
import SavedCardSection, {
  SavedCard,
} from "@/components/Dashboard/SavedCardSection/SavedCardSection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Filter = "all" | "paid" | "pending" | "failed" | "refunded";

function normalizeFilter(v?: string | null): Filter {
  if (v === "paid") return "paid";
  if (v === "pending") return "pending";
  if (v === "failed") return "failed";
  if (v === "refunded") return "refunded";
  return "all";
}

type SearchParams = { status?: string | string[]; page?: string };

async function resolveUserId(session: any) {
  const sessionUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

const FILTER_MAP: Record<Exclude<Filter, "all">, PaymentStatus[]> = {
  paid: ["PAID"],
  pending: ["NONE", "PENDING"],
  failed: ["FAILED"],
  refunded: ["REFUNDED", "PARTIALLY_REFUNDED"],
};

const PAGE_SIZE = 10;

function clampPage(raw: string | undefined) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return Math.floor(n);
}

function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function statusLabel(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "NONE":
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partial Refund";
    default:
      return status;
  }
}

function statusBadgeClass(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "badge_good";
    case "NONE":
    case "PENDING":
      return "badge_warn";
    case "FAILED":
      return "badge_danger";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "badge_neutral";
    default:
      return "badge_neutral";
  }
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

// ── Fetch saved cards for the current user ─────────────────────────────────────

async function fetchSavedCards(userId: string): Promise<SavedCard[]> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    const customerId = user?.stripeCustomerId ?? null;
    if (!customerId) return [];

    const stripe = await getStripe();
    const result = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 10,
    });

    return result.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? "unknown",
      last4: pm.card?.last4 ?? "••••",
      exp_month: pm.card?.exp_month ?? 0,
      exp_year: pm.card?.exp_year ?? 0,
    }));
  } catch {
    return [];
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPaymentsPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/payments");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/payments");

  const sp = await Promise.resolve(searchParams);
  const rawStatus = Array.isArray(sp?.status) ? sp?.status[0] : sp?.status;
  const filter = normalizeFilter(rawStatus);
  const page = clampPage(Array.isArray(sp?.page) ? sp?.page[0] : sp?.page);
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  const [savedCards, stripePublishableKey, counts, filteredCount, allPayments] =
    await Promise.all([
      fetchSavedCards(userId),
      getStripePublishableKey(),
      (async () => {
        const [all, paid, pending, failed, refunded] = await Promise.all([
          db.payment.count({ where: { booking: { userId } } }),
          db.payment.count({
            where: { booking: { userId }, status: { in: FILTER_MAP.paid } },
          }),
          db.payment.count({
            where: { booking: { userId }, status: { in: FILTER_MAP.pending } },
          }),
          db.payment.count({
            where: { booking: { userId }, status: { in: FILTER_MAP.failed } },
          }),
          db.payment.count({
            where: { booking: { userId }, status: { in: FILTER_MAP.refunded } },
          }),
        ]);
        return { all, paid, pending, failed, refunded };
      })(),
      db.payment.count({
        where:
          filter === "all"
            ? { booking: { userId } }
            : { booking: { userId }, status: { in: FILTER_MAP[filter] } },
      }),
      db.payment.findMany({
        where:
          filter === "all"
            ? { booking: { userId } }
            : { booking: { userId }, status: { in: FILTER_MAP[filter] } },
        orderBy: [{ booking: { pickupAt: "desc" } }, { updatedAt: "desc" }],
        include: {
          booking: {
            select: {
              id: true,
              pickupAt: true,
              pickupAddress: true,
              dropoffAddress: true,
              status: true,
              totalCents: true,
              currency: true,
              serviceType: { select: { name: true } },
            },
          },
        },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;
  const payments = allPayments.slice(skip, skip + PAGE_SIZE);

  const baseParams: Record<string, string | undefined> = {
    status: filter === "all" ? undefined : filter,
  };

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  return (
    <section className={styles.container}>
      {/* ── Payments history ── */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>Payments & Invoices</h1>
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{filteredCount}</strong>{" "}
            {filteredCount === 1 ? "payment" : "payments"}
            {filteredCount > 0 ? (
              <span className={styles.metaSep}>
                • Page <strong className='emptyTitleSmall'>{safePage}</strong>{" "}
                of <strong className='emptyTitleSmall'>{totalPages}</strong>
              </span>
            ) : null}
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Filter by status</div>
            <StatusTabs active={filter} counts={counts} />
          </div>
        </div>

        <Pagination
          totalCount={filteredCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {payments.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No payments found.</p>
          <p className={styles.emptyCopy}>
            {filter !== "all"
              ? "Try adjusting your filters."
              : "Your payments will appear here after you book a ride."}
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Service</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((p) => {
                  const b = p.booking;
                  const bookingHref = `/dashboard/bookings/${b.id}`;
                  const isPaid = p.status === "PAID";
                  const pickupEta = tz.formatEta(b.pickupAt, now);

                  return (
                    <tr key={p.id} className={styles.tr}>
                      {/* Date */}
                      <td
                        className={styles.td}
                        data-label='Date'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={bookingHref}
                          className={styles.rowStretchedLink}
                          aria-label='View booking'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          <span className={styles.cellStrong}>
                            {tz.formatDate(b.pickupAt, companyTz)}
                          </span>
                          <div className={styles.pickupMeta}>
                            <span className={styles.cellSub}>
                              {formatTime(b.pickupAt, companyTz)}
                            </span>
                            <span className={styles.pill}>{pickupEta}</span>
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
                          href={bookingHref}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <span className={styles.pill}>
                          {b.serviceType?.name ?? "—"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className={styles.td}
                        data-label='Amount'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={bookingHref}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStrong}>
                          {tz.formatMoneyShort(b.totalCents, b.currency)}
                        </div>
                      </td>

                      {/* Status */}
                      <td
                        className={styles.td}
                        data-label='Status'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={bookingHref}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <span className={`badge ${statusBadgeClass(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className={styles.td}
                        data-label='Actions'
                        style={{ position: "relative", zIndex: 10 }}
                      >
                        <div className={styles.actions}>
                          {isPaid && <PaymentDownloadBtn bookingId={b.id} />}
                          <Link href={bookingHref} className={styles.editLink}>
                            More Details
                          </Link>
                        </div>
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
        totalCount={filteredCount}
        page={safePage}
        totalPages={totalPages}
        current={pageParams}
      />
      {/* ── Saved payment methods ── */}
      <SavedCardSection
        stripePublishableKey={stripePublishableKey ?? ""}
        savedCards={savedCards}
      />
    </section>
  );
}

/* =============================================================================
   Filter Tabs
   ============================================================================= */

function StatusTabs({
  active,
  counts,
}: {
  active: Filter;
  counts: Record<Filter, number>;
}) {
  const items: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Paid", value: "paid" },
    { label: "Pending", value: "pending" },
    { label: "Failed", value: "failed" },
    { label: "Refunded", value: "refunded" },
  ];

  return (
    <div className={styles.tabRow}>
      {items.map((x) => {
        const isActive = x.value === active;
        const href = buildHref("/dashboard/payments", {
          status: x.value === "all" ? undefined : x.value,
        });

        return (
          <Link
            key={x.value}
            href={href}
            prefetch
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

/* =============================================================================
   Pagination
   ============================================================================= */

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

  const prevHref = buildHref("/dashboard/payments", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/dashboard/payments", {
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

          const href = buildHref("/dashboard/payments", {
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
