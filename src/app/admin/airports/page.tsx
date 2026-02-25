import styles from "./AdminAirportsPage.module.css";
import { db } from "@/lib/db";
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import AirportActionsClient from "./AirportActionsClient";

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

export default async function AdminAirportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: StatusFilter;
  }>;
}) {
  const sp = await searchParams;
  const statusFilter: StatusFilter = sp.status ?? "ALL";

  const allAirports = await db.airport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      iata: true,
      address: true,
      placeId: true,
      sortOrder: true,
      active: true,
    },
    take: 500,
  });

  const totalCount = allAirports.length;
  const activeCount = allAirports.filter((a) => a.active).length;
  const inactiveCount = allAirports.filter((a) => !a.active).length;

  let airports = [...allAirports];

  if (statusFilter === "ACTIVE") {
    airports = airports.filter((a) => a.active);
  } else if (statusFilter === "INACTIVE") {
    airports = airports.filter((a) => !a.active);
  }

  const statusCounts = {
    ALL: totalCount,
    ACTIVE: activeCount,
    INACTIVE: inactiveCount,
  };

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.top}>
          <h1 className={`${styles.heading} h2`}>Airports</h1>
        </div>

        <p className={styles.description}>
          Manage the airport list used by airport pickup/dropoff services.
        </p>

        <div className={styles.headerActions}>
          <Button
            href='/admin/airports/new'
            text='New Airport'
            btnType='greenReg'
          />
        </div>

        <div className={styles.meta}>
          <strong style={{ fontSize: "1.4rem" }}>{airports.length}</strong>{" "}
          total
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.filterTitle}>Filter by status</div>
            <StatusTabs active={statusFilter} counts={statusCounts} />
          </div>
        </div>
      </header>

      {airports.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No airports found.</p>
          <p className={styles.emptyCopy}>
            {statusFilter !== "ALL"
              ? "Try adjusting your filters."
              : "Create one to enable airport dropdowns in the booking form."}
          </p>
          {statusFilter === "ALL" && (
            <Button
              href='/admin/airports/new'
              text='Create Airport'
              btnType='blackReg'
            />
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {airports.map((a) => {
            const href = `/admin/airports/${a.id}`;

            return (
              <div
                key={a.id}
                className={`${styles.card} ${!a.active ? styles.cardInactive : ""}`}
              >
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.airportName}>
                      {a.name} <span className={styles.iata}>({a.iata})</span>
                    </span>
                    <span
                      className={`badge ${a.active ? "badge_good" : "badge_neutral"}`}
                    >
                      {a.active ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div className={styles.cardMeta}>
                    {a.address && (
                      <span className={styles.address}>{a.address}</span>
                    )}
                    <span className={styles.placeId}>
                      {a.placeId ? "Place ID saved" : "No Place ID"}
                    </span>
                  </div>
                </div>

                <AirportActionsClient
                  id={a.id}
                  active={a.active}
                  editHref={href}
                />
              </div>
            );
          })}
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
        const href = buildHref("/admin/airports", {
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
