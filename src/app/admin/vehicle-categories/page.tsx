import styles from "./AdminVehicleCategoriesPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import VehicleCategoryActionsClient from "./VehicleCategoryActionsClient";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const PAGE_SIZE = 50;

function clampPage(raw: string | undefined) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return Math.floor(n);
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

export default async function AdminVehicleCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: StatusFilter;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const { timezone: companyTz } = await getCompanySettings();
  const statusFilter: StatusFilter = sp.status ?? "ALL";
  const page = clampPage(sp.page);
  const now = new Date();

  const allCategories = await db.vehicle.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  const totalCount = allCategories.length;
  const activeCount = allCategories.filter((c) => c.active).length;
  const inactiveCount = allCategories.filter((c) => !c.active).length;

  let filteredCategories = [...allCategories];

  if (statusFilter === "ACTIVE") {
    filteredCategories = filteredCategories.filter((c) => c.active);
  } else if (statusFilter === "INACTIVE") {
    filteredCategories = filteredCategories.filter((c) => !c.active);
  }

  const filteredCount = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const categories = filteredCategories.slice(skip, skip + PAGE_SIZE);

  const statusCounts = {
    ALL: totalCount,
    ACTIVE: activeCount,
    INACTIVE: inactiveCount,
  };

  const baseParams: Record<string, string | undefined> = {
    status: statusFilter === "ALL" ? undefined : statusFilter,
  };

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>Vehicle Categories</h1>
          </div>

          <div className={styles.headerActions}>
            <Button
              href='/admin/vehicle-categories/new'
              text='New Category'
              btnType='greenReg'
            />
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{filteredCount}</strong>{" "}
            total
            {filteredCount > 0 ? (
              <span className={styles.metaSep}>
                • Page <strong className='emptyTitleSmall'>{safePage}</strong>{" "}
                of <strong className='emptyTitleSmall'>{totalPages}</strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Filter by status</div>
            <StatusTabs active={statusFilter} counts={statusCounts} />
          </div>
        </div>

        <Pagination
          totalCount={filteredCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {categories.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No categories found.</p>
          <p className={styles.emptyCopy}>
            {statusFilter !== "ALL"
              ? "Try adjusting your filters."
              : "Add your first vehicle category to get started."}
          </p>
          {statusFilter === "ALL" && (
            <Button
              href='/admin/vehicle-categories/new'
              text='Add Category'
              btnType='blackReg'
            />
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Capacity</th>
                  <th className={styles.th}>Luggage</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Bookings</th>
                  <th className={styles.th}>Added</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((c) => {
                  const href = `/admin/vehicle-categories/${c.id}`;
                  const addedAgo = tz.formatEta(c.createdAt, now);

                  return (
                    <tr
                      key={c.id}
                      className={`${styles.tr} ${!c.active ? styles.trInactive : ""}`}
                    >
                      <td
                        className={styles.td}
                        data-label='Name'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label='Open category'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStrong}>{c.name}</div>
                      </td>

                      <td
                        className={styles.td}
                        data-label='Capacity'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.capacityBadge}>
                          <span className={styles.capacityIcon}>👤</span>
                          {c.capacity}
                        </div>
                      </td>

                      <td
                        className={styles.td}
                        data-label='Luggage'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.capacityBadge}>
                          <span className={styles.capacityIcon}>🧳</span>
                          {c.luggageCapacity}
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
                        <span
                          className={`badge ${c.active ? "badge_good" : "badge_neutral"}`}
                        >
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td
                        className={styles.td}
                        data-label='Bookings'
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
                          {c._count.bookings}
                        </div>
                      </td>

                      <td
                        className={styles.td}
                        data-label='Added'
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
                          <span className={styles.cellSub}>
                            {tz.formatDate(c.createdAt, companyTz)}
                          </span>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{addedAgo}</span>
                          </div>
                        </div>
                      </td>

                      <td
                        className={styles.td}
                        data-label='Actions'
                        style={{ position: "relative", zIndex: 10 }}
                      >
                        <VehicleCategoryActionsClient
                          id={c.id}
                          active={c.active}
                          editHref={href}
                        />
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
    </section>
  );
}

function StatusTabs({
  active,
  counts,
}: {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
}) {
  const items: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  return (
    <div className={styles.tabRow}>
      {items.map((x) => {
        const isActive = x.value === active;
        const href = buildHref("/admin/vehicle-categories", {
          status: x.value === "ALL" ? undefined : x.value,
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

  const prevHref = buildHref("/admin/vehicle-categories", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/admin/vehicle-categories", {
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

          const href = buildHref("/admin/vehicle-categories", {
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
