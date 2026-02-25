import styles from "./ServicesPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import ServiceActionsClient from "./ServiceActionsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

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

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: StatusFilter;
  }>;
}) {
  const sp = await searchParams;
  const statusFilter: StatusFilter = sp.status ?? "ALL";

  const allServices = await db.serviceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const totalCount = allServices.length;
  const activeCount = allServices.filter((s) => s.active).length;
  const inactiveCount = allServices.filter((s) => !s.active).length;

  let services = [...allServices];

  if (statusFilter === "ACTIVE") {
    services = services.filter((s) => s.active);
  } else if (statusFilter === "INACTIVE") {
    services = services.filter((s) => !s.active);
  }

  const statusCounts = {
    ALL: totalCount,
    ACTIVE: activeCount,
    INACTIVE: inactiveCount,
  };

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>Services</h1>
          </div>

          <div className={styles.headerActions}>
            <Button
              href='/admin/services/new'
              text='New Service'
              btnType='greenReg'
            />
          </div>

          <div className={styles.meta}>
            <strong style={{ fontSize: "1.4rem" }}>{services.length}</strong>{" "}
            total
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Filter by status</div>
            <StatusTabs active={statusFilter} counts={statusCounts} />
          </div>
        </div>
      </header>

      {services.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No services found.</p>
          <p className={styles.emptyCopy}>
            {statusFilter !== "ALL"
              ? "Try adjusting your filters."
              : "Add your first service to get started."}
          </p>
          {statusFilter === "ALL" && (
            <Button
              href='/admin/services/new'
              text='Add Service'
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
                  <th className={styles.th}>Slug</th>
                  <th className={styles.th}>Strategy</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Enable/Disable</th>
                </tr>
              </thead>

              <tbody>
                {services.map((s) => {
                  const href = `/admin/services/${s.id}`;

                  return (
                    <tr
                      key={s.id}
                      className={`${styles.tr} ${!s.active ? styles.trInactive : ""}`}
                    >
                      <td className={styles.td} data-label='Name'>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label='Open service'
                        />
                        <div className={styles.cellStrong}>{s.name}</div>
                      </td>

                      <td className={styles.td} data-label='Slug'>
                        <span className={styles.cellSub}>{s.slug}</span>
                      </td>

                      <td className={styles.td} data-label='Strategy'>
                        <span className={styles.pill}>{s.pricingStrategy}</span>
                      </td>

                      <td className={styles.td} data-label='Status'>
                        <span
                          className={`badge ${s.active ? "badge_good" : "badge_neutral"}`}
                        >
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td
                        className={styles.td}
                        data-label='Enable/Disable'
                        style={{ position: "relative", zIndex: 10 }}
                      >
                        <ServiceActionsClient
                          id={s.id}
                          active={s.active}
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
        const href = buildHref("/admin/services", {
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
