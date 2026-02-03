import styles from "./AdminVehiclesPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import VehicleUnitActionsClient from "./VehicleUnitActionsClient";

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

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
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

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: StatusFilter;
    category?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const statusFilter: StatusFilter = sp.status ?? "ALL";
  const categoryFilter = sp.category ?? "ALL";
  const page = clampPage(sp.page);
  const now = new Date();

  // Get all units first to extract categories
  const allUnits = await db.vehicleUnit.findMany({
    include: {
      category: true,
      _count: {
        select: {
          assignments: true,
        },
      },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  // Extract unique categories from units
  const categoryMap = new Map<
    string,
    { id: string; name: string; count: number }
  >();
  for (const u of allUnits) {
    if (u.category) {
      const existing = categoryMap.get(u.category.id);
      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(u.category.id, {
          id: u.category.id,
          name: u.category.name,
          count: 1,
        });
      }
    }
  }
  const categories = Array.from(categoryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Get counts for filters
  const totalCount = allUnits.length;
  const activeCount = allUnits.filter((u) => u.active).length;
  const inactiveCount = allUnits.filter((u) => !u.active).length;

  // Filter units based on status and category
  let filteredUnits = [...allUnits];

  if (statusFilter === "ACTIVE") {
    filteredUnits = filteredUnits.filter((u) => u.active);
  } else if (statusFilter === "INACTIVE") {
    filteredUnits = filteredUnits.filter((u) => !u.active);
  }

  if (categoryFilter !== "ALL") {
    filteredUnits = filteredUnits.filter(
      (u) => u.category?.name === categoryFilter,
    );
  }

  const filteredCount = filteredUnits.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  // Paginate
  const units = filteredUnits.slice(skip, skip + PAGE_SIZE);

  const statusCounts = {
    ALL: totalCount,
    ACTIVE: activeCount,
    INACTIVE: inactiveCount,
  };

  const baseParams: Record<string, string | undefined> = {
    status: statusFilter === "ALL" ? undefined : statusFilter,
    category: categoryFilter === "ALL" ? undefined : categoryFilter,
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
            <h1 className={`${styles.heading} h2`}>Vehicles (Units)</h1>
          </div>

          <div className={styles.headerActions}>
            <Button
              href='/admin/vehicles/new'
              text='New Vehicle'
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

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Filter by status</div>
            <StatusTabs
              active={statusFilter}
              counts={statusCounts}
              currentCategory={categoryFilter}
            />
          </div>

          {categories.length > 0 && (
            <div className={styles.filterGroup}>
              <div className={styles.filterTitle}>Filter by category</div>
              <CategoryTabs
                active={categoryFilter}
                categories={categories}
                currentStatus={statusFilter}
              />
            </div>
          )}
        </div>

        <Pagination
          totalCount={filteredCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {units.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No vehicles found.</p>
          <p className={styles.emptyCopy}>
            {statusFilter !== "ALL" || categoryFilter !== "ALL"
              ? "Try adjusting your filters."
              : "Add your first vehicle to start assigning them to trips."}
          </p>
          {statusFilter === "ALL" && categoryFilter === "ALL" && (
            <Button
              href='/admin/vehicles/new'
              text='Add Vehicle'
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
                  <th className={styles.th}>Category</th>
                  <th className={styles.th}>Plate</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Assignments</th>
                  <th className={styles.th}>Added</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {units.map((u) => {
                  const href = `/admin/vehicles/${u.id}`;
                  const addedAgo = formatEta(u.createdAt, now);

                  return (
                    <tr
                      key={u.id}
                      className={`${styles.tr} ${!u.active ? styles.trInactive : ""}`}
                    >
                      {/* Name */}
                      <td
                        className={styles.td}
                        data-label='Name'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label='Open vehicle'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStrong}>{u.name}</div>
                      </td>

                      {/* Category */}
                      <td
                        className={styles.td}
                        data-label='Category'
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
                          className={`badge ${u.category ? "badge_accent" : "badge_neutral"}`}
                        >
                          {u.category?.name ?? "Uncategorized"}
                        </span>
                      </td>

                      {/* Plate */}
                      <td
                        className={styles.td}
                        data-label='Plate'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.plateCell}>{u.plate ?? "—"}</div>
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
                        <span
                          className={`badge ${u.active ? "badge_good" : "badge_neutral"}`}
                        >
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Assignments */}
                      <td
                        className={styles.td}
                        data-label='Assignments'
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
                          {u._count.assignments}
                        </div>
                      </td>

                      {/* Added */}
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
                            {formatDate(u.createdAt)}
                          </span>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{addedAgo}</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className={styles.td}
                        data-label='Actions'
                        style={{ position: "relative", zIndex: 10 }}
                      >
                        <VehicleUnitActionsClient
                          id={u.id}
                          active={u.active}
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

/* =============================================================================
   Filter Components
   ============================================================================= */

function StatusTabs({
  active,
  counts,
  currentCategory,
}: {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
  currentCategory: string;
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
        const href = buildHref("/admin/vehicles", {
          status: x.value === "ALL" ? undefined : x.value,
          category: currentCategory === "ALL" ? undefined : currentCategory,
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

function CategoryTabs({
  active,
  categories,
  currentStatus,
}: {
  active: string;
  categories: { id: string; name: string; count: number }[];
  currentStatus: StatusFilter;
}) {
  return (
    <div className={styles.tabRow}>
      <Link
        href={buildHref("/admin/vehicles", {
          status: currentStatus === "ALL" ? undefined : currentStatus,
        })}
        prefetch
        className={`tab ${active === "ALL" ? "tabActive" : ""}`}
      >
        All Categories
      </Link>
      {categories.map((cat) => {
        const isActive = cat.name === active;
        const href = buildHref("/admin/vehicles", {
          status: currentStatus === "ALL" ? undefined : currentStatus,
          category: cat.name,
        });

        return (
          <Link
            key={cat.id}
            href={href}
            prefetch
            className={`tab ${isActive ? "tabActive" : ""}`}
          >
            {cat.name}
            <span
              className={`countPill ${isActive ? "countPillWhiteText" : ""}`}
            >
              {cat.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* =============================================================================
   Pagination Component
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

  const prevHref = buildHref("/admin/vehicles", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/admin/vehicles", {
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

          const href = buildHref("/admin/vehicles", {
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
