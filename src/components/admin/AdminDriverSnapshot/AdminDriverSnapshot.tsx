/* eslint-disable @typescript-eslint/no-unused-vars */
import styles from "./AdminDriverSnapshot.module.css";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import Link from "next/link";
import Image from "next/image";
import DefaultProfileImg from "../../../../public/images/mesaii.jpg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDateRanges(timeZone: string) {
  const now = new Date();

  const todayStart = tz.startOfDay(now, timeZone);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const monthStart = tz.startOfMonth(now, timeZone);
  const nextMonthStart = tz.addMonths(monthStart, 1, timeZone);
  const monthEnd = new Date(nextMonthStart.getTime() - 1);

  return { todayStart, todayEnd, monthStart, monthEnd };
}

function getMonthLabel(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getTodayLabel(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default async function AdminDriverSnapshot() {
  const { timezone: companyTz } = await getCompanySettings();

  const { todayStart, todayEnd, monthStart, monthEnd } = getDateRanges(companyTz);
  const monthLabel = getMonthLabel(companyTz);
  const todayLabel = getTodayLabel(companyTz);

  // Fetch all drivers with their assignment counts
  const driversRaw = await db.user.findMany({
    where: { roles: { has: "DRIVER" } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      image: true,
      driverAssignments: {
        where: {
          booking: {
            status: {
              notIn: ["CANCELLED", "NO_SHOW", "DECLINED", "DRAFT"],
            },
          },
        },
        select: {
          id: true,
          booking: {
            select: {
              pickupAt: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Process drivers with today/month counts
  const drivers = driversRaw.map((d) => {
    const todayAssignments = d.driverAssignments.filter((a) => {
      const pickupAt = new Date(a.booking.pickupAt);
      return pickupAt >= todayStart && pickupAt <= todayEnd;
    });

    const monthAssignments = d.driverAssignments.filter((a) => {
      const pickupAt = new Date(a.booking.pickupAt);
      return pickupAt >= monthStart && pickupAt <= monthEnd;
    });

    // Count in-progress trips today
    const inProgressToday = todayAssignments.filter(
      (a) => a.booking.status === "IN_PROGRESS",
    ).length;

    // Count completed trips today
    const completedToday = todayAssignments.filter(
      (a) => a.booking.status === "COMPLETED",
    ).length;

    return {
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      createdAt: d.createdAt,
      image: d.image,
      todayCount: todayAssignments.length,
      monthCount: monthAssignments.length,
      totalCount: d.driverAssignments.length,
      inProgressToday,
      completedToday,
    };
  });

  // Sort: drivers with today assignments first, then by month count, then name
  const sortedDrivers = [...drivers].sort((a, b) => {
    if (b.todayCount !== a.todayCount) return b.todayCount - a.todayCount;
    if (b.monthCount !== a.monthCount) return b.monthCount - a.monthCount;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  // Calculate stats
  const activeDrivers = drivers.length;
  const driversAssignedToday = drivers.filter((d) => d.todayCount > 0).length;
  const totalTripsToday = drivers.reduce((sum, d) => sum + d.todayCount, 0);
  const totalTripsMonth = drivers.reduce((sum, d) => sum + d.monthCount, 0);
  const inProgressNow = drivers.reduce((sum, d) => sum + d.inProgressToday, 0);

  // Get unassigned trips today
  const unassignedTripsToday = await db.booking.count({
    where: {
      pickupAt: { gte: todayStart, lte: todayEnd },
      assignment: null,
      status: {
        notIn: ["CANCELLED", "NO_SHOW", "DECLINED", "DRAFT", "COMPLETED"],
      },
    },
  });

  const coveragePct =
    activeDrivers > 0
      ? Math.min(100, Math.round((driversAssignedToday / activeDrivers) * 100))
      : 0;

  return (
    <section
      className={styles.container}
      aria-label='Driver readiness snapshot'
    >
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className='cardTitle h4'>Driver Readiness</h2>
            <span className={styles.dateLabel}>{todayLabel}</span>
          </div>
          <Link href='/admin/users?role=DRIVER' className='backBtn'>
            Manage all drivers →
          </Link>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{activeDrivers}</span>
            <span className={styles.statLabel}>Total Drivers</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statActive}`}>
              {driversAssignedToday}
            </span>
            <span className={styles.statLabel}>Working Today</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statUpcoming}`}>
              {totalTripsToday}
            </span>
            <span className={styles.statLabel}>Trips Today</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statCompleted}`}>
              {totalTripsMonth}
            </span>
            <span className={styles.statLabel}>Trips This Month</span>
          </div>
          {unassignedTripsToday > 0 && (
            <>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={`${styles.statNumber} ${styles.statDanger}`}>
                  {unassignedTripsToday}
                </span>
                <span className={styles.statLabel}>Unassigned</span>
              </div>
            </>
          )}
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={`${styles.statNumber} ${styles.statCoverage}`}>
              {coveragePct}%
            </span>
            <span className={styles.statLabel}>Coverage</span>
          </div>
        </div>
      </header>

      {/* Legend */}
      {sortedDrivers.length > 0 && (
        <div className={styles.legend}>
          <span className={styles.legendTitle}>Quick Reference:</span>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_active}`}
              />
              <span>Has trips today</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_idle}`}
              />
              <span>No trips today</span>
            </div>
            <div className={styles.legendItem}>
              <span
                className={`${styles.legendDot} ${styles.legendDot_inProgress}`}
              />
              <span>Currently on a trip</span>
            </div>
          </div>
        </div>
      )}

      {sortedDrivers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🚗</div>
          <p className={styles.emptyText}>No drivers in the system yet.</p>
          <Link href='/admin/users' className='primaryBtn'>
            Add a driver
          </Link>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}></th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Contact</th>
                <th className={styles.th}>Today</th>
                <th className={styles.th}>{monthLabel}</th>
                <th className={styles.th}>All Time</th>
                <th className={styles.th}>Status</th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {sortedDrivers.map((driver) => {
                const href = `/admin/users/${driver.id}`;
                const hasTripsToday = driver.todayCount > 0;
                const isInProgress = driver.inProgressToday > 0;

                // Determine row state
                let rowState: "active" | "inProgress" | "idle" = "idle";
                if (isInProgress) rowState = "inProgress";
                else if (hasTripsToday) rowState = "active";

                return (
                  <tr
                    key={driver.id}
                    className={`${styles.tr} ${styles[`tr_${rowState}`]}`}
                  >
                    {/* Profile Image */}
                    <td className={styles.td} data-label=''>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.driverImageWrap}>
                          <Image
                            src={driver.image ?? DefaultProfileImg}
                            alt={driver.name ?? "Driver"}
                            title={driver.name ?? "Driver"}
                            width={40}
                            height={40}
                            className={styles.driverImage}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={styles.td} data-label='Driver'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
                        <span className={styles.driverName}>
                          {driver.name ?? "Unnamed Driver"}
                        </span>
                        <span className={styles.driverEmail}>
                          {driver.email}
                        </span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className={styles.td} data-label='Contact'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        {driver.phone ? (
                          <a
                            href={`tel:${driver.phone.replace(/[^0-9+]/g, "")}`}
                            className={styles.phoneLink}
                          >
                            {driver.phone}
                          </a>
                        ) : (
                          <span className={styles.noPhone}>No phone</span>
                        )}
                      </div>
                    </td>

                    {/* Today Count */}
                    <td className={styles.td} data-label='Today'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.countCell}>
                          <span
                            className={`${styles.countBadge} ${
                              driver.todayCount > 0
                                ? styles.countBadgeActive
                                : styles.countBadgeZero
                            }`}
                          >
                            {driver.todayCount}
                          </span>
                          {driver.completedToday > 0 && (
                            <span className={styles.completedNote}>
                              {driver.completedToday} done
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Month Count */}
                    <td className={styles.td} data-label='This Month'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span className={styles.monthCount}>
                          {driver.monthCount}
                        </span>
                      </div>
                    </td>

                    {/* All Time Count */}
                    <td className={styles.td} data-label='All Time'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span className={styles.totalCount}>
                          {driver.totalCount}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className={styles.td} data-label='Status'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        {isInProgress ? (
                          <span
                            className={`${styles.statusBadge} ${styles.statusBadge_inProgress}`}
                          >
                            On Trip
                          </span>
                        ) : hasTripsToday ? (
                          <span
                            className={`${styles.statusBadge} ${styles.statusBadge_active}`}
                          >
                            Active
                          </span>
                        ) : (
                          <span
                            className={`${styles.statusBadge} ${styles.statusBadge_idle}`}
                          >
                            Available
                          </span>
                        )}
                      </div>
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
      )}
    </section>
  );
}