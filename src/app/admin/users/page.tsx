import styles from "./AdminUsersPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoleFilter = "ALL" | "ADMIN" | "DRIVER" | "USER";
type AppRole = "USER" | "ADMIN" | "DRIVER";

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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: RoleFilter; page?: string }>;
}) {
  const sp = await searchParams;
  const roleFilter: RoleFilter = sp.role ?? "ALL";
  const page = clampPage(sp.page);
  const now = new Date();

  const where =
    roleFilter === "ALL"
      ? {}
      : {
          roles: { has: roleFilter },
        };

  // Get counts for each role
  const [totalCount, adminCount, driverCount, userCount] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { roles: { has: "ADMIN" } } }),
    db.user.count({ where: { roles: { has: "DRIVER" } } }),
    db.user.count({ where: { roles: { has: "USER" } } }),
  ]);

  const filteredCount = await db.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;

  const users = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: {
          bookings: true,
          driverAssignments: true,
        },
      },
    },
    skip,
    take: PAGE_SIZE,
  });

  const priority = (roles: AppRole[]) => {
    if (roles.includes("ADMIN")) return 0;
    if (roles.includes("DRIVER")) return 1;
    return 2;
  };

  const normalized = users
    .map((u) => {
      const roles = (u.roles?.length ? u.roles : ["USER"]) as AppRole[];
      return { ...u, roles };
    })
    .sort((a, b) => {
      const pa = priority(a.roles as AppRole[]);
      const pb = priority(b.roles as AppRole[]);
      if (pa !== pb) return pa - pb;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });

  const baseParams: Record<string, string | undefined> = {
    role: roleFilter === "ALL" ? undefined : roleFilter,
  };

  const pageParams: Record<string, string | undefined> = {
    ...baseParams,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  const counts = {
    ALL: totalCount,
    ADMIN: adminCount,
    DRIVER: driverCount,
    USER: userCount,
  };

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>Users</h1>
          </div>

          <div className={styles.headerActions}>
            <Button
              href='/api/admin/users/export'
              text='Download CSV'
              btnType='black'
              downloadIcon
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
            <div className={styles.filterTitle}>Filter by role</div>
            <RoleTabs active={roleFilter} counts={counts} />
          </div>
        </div>

        <Pagination
          totalCount={filteredCount}
          page={safePage}
          totalPages={totalPages}
          current={pageParams}
        />
      </header>

      {normalized.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No users found.</p>
          <p className={styles.emptyCopy}>
            Try adjusting filters or wait for new signups.
          </p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Joined</th>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>Email</th>
                  <th className={styles.th}>Roles</th>
                  <th className={styles.th}>Verified</th>
                  <th className={styles.th}>Bookings</th>
                  <th className={styles.th}>Assignments</th>
                </tr>
              </thead>

              <tbody>
                {normalized.map((u) => {
                  const href = `/admin/users/${u.id}`;
                  const joinedAgo = formatEta(u.createdAt, now);

                  return (
                    <tr key={u.id} className={styles.tr}>
                      {/* Joined */}
                      <td
                        className={styles.td}
                        data-label='Joined'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label='Open user'
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStack}>
                          <Link href={href} className={styles.rowLink}>
                            {formatDate(u.createdAt)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>{joinedAgo}</span>
                          </div>
                        </div>
                      </td>

                      {/* Name */}
                      <td
                        className={styles.td}
                        data-label='Name'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellStrong}>{u.name ?? "—"}</div>
                      </td>

                      {/* Email */}
                      <td
                        className={styles.td}
                        data-label='Email'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.cellSub}>{u.email}</div>
                      </td>

                      {/* Roles */}
                      <td
                        className={styles.td}
                        data-label='Roles'
                        style={{ position: "relative" }}
                      >
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                          style={{ position: "absolute", inset: 0, zIndex: 5 }}
                        />
                        <div className={styles.badgesRow}>
                          {(u.roles as AppRole[]).map((role) => (
                            <span
                              key={role}
                              className={`badge ${
                                role === "ADMIN"
                                  ? "badge_accent"
                                  : role === "DRIVER"
                                    ? "badge_good"
                                    : "badge_neutral"
                              }`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Verified */}
                      <td
                        className={styles.td}
                        data-label='Verified'
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
                          className={`badge ${u.emailVerified ? "badge_good" : "badge_neutral"}`}
                        >
                          {u.emailVerified ? "Yes" : "No"}
                        </span>
                      </td>

                      {/* Bookings */}
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
                          {u._count.bookings}
                        </div>
                      </td>

                      {/* Assignments (for drivers) */}
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
                          {u._count.driverAssignments}
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
    </section>
  );
}

function RoleTabs({
  active,
  counts,
}: {
  active: RoleFilter;
  counts: Record<RoleFilter, number>;
}) {
  const items: { label: string; value: RoleFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Admins", value: "ADMIN" },
    { label: "Drivers", value: "DRIVER" },
    { label: "Users", value: "USER" },
  ];

  return (
    <div className={styles.tabRow}>
      {items.map((x) => {
        const isActive = x.value === active;
        const href =
          x.value === "ALL" ? "/admin/users" : `/admin/users?role=${x.value}`;

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

  const prevHref = buildHref("/admin/users", {
    ...current,
    page: page - 1 > 1 ? String(page - 1) : undefined,
  });

  const nextHref = buildHref("/admin/users", {
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

          const href = buildHref("/admin/users", {
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
