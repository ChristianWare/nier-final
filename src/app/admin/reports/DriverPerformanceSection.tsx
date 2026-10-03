// The Driver Performance section: the same cards, charts and leaderboard on
// the reports page and the drivers page, from the same numbers.
import Link from "next/link";
import * as tz from "@/lib/timezone";
import type { DriverStatsRow } from "@/lib/reports/rideStats";
import KpiCard from "./KpiCard";
import StatusPieChart from "./StatusPieChart";
import styles from "./AdminReportsPage.module.css";

export default function DriverPerformanceSection({
  drivers,
  rangeLabel,
  basisLabel,
  currency,
  linkToDrivers = false,
}: {
  drivers: DriverStatsRow[];
  rangeLabel: string;
  basisLabel: string;
  currency: string;
  /** Drivers page: names open the driver, and issues link to their fixes. */
  linkToDrivers?: boolean;
}) {
  const driverTripsDistribution = drivers
    .slice(0, 10)
    .map((d) => ({ name: d.driverName, value: d.trips }));
  const driverEarningsDistribution = [...drivers]
    .sort((x, y) => y.payCents - x.payCents)
    .slice(0, 10)
    .map((d) => ({ name: d.driverName, value: d.payCents }));
  const driverPayMissing = drivers.reduce((sum, d) => sum + d.payMissing, 0);

  return (
    <>
      {/* ============================================ */}
      {/* DRIVER PERFORMANCE SECTION */}
      {/* ============================================ */}
      <section className={styles.section}>
        <div className='header'>
          <h2 className={`cardTitle h4`}>Driver Performance</h2>
          <span className={styles.sectionBadge}>
            {rangeLabel} · {basisLabel}
          </span>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard
            label='Active Drivers'
            value={String(drivers.length)}
            sub='With rides in this period'
          />
          <KpiCard
            label='Total Trips'
            value={String(drivers.reduce((sum, d) => sum + d.trips, 0))}
            sub={`Rides ${basisLabel}`}
          />
          <KpiCard
            label='Avg Trips per Driver'
            value={String(
              drivers.length > 0
                ? Math.round(
                    drivers.reduce((sum, d) => sum + d.trips, 0) /
                      drivers.length,
                  )
                : 0,
            )}
            sub='Workload distribution'
          />
          <KpiCard
            label='Driver Pay'
            value={tz.formatMoneyShort(
              drivers.reduce((sum, d) => sum + d.payCents, 0),
              currency,
            )}
            sub={
              driverPayMissing > 0
                ? `Not recorded on ${driverPayMissing} completed ${driverPayMissing === 1 ? "ride" : "rides"}`
                : "Pay + tips recorded on rides"
            }
            tone='good'
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Trips by Driver</h3>
              <span className='miniNote'>Top 10 drivers by trip count</span>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={driverTripsDistribution}
                dataKey='value'
                colors={[
                  "#3b82f6",
                  "#10b981",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                  "#06b6d4",
                  "#ec4899",
                  "#84cc16",
                  "#f97316",
                  "#6366f1",
                ]}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Earnings by Driver</h3>
              <span className='miniNote'>Top 10 drivers by pay recorded</span>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={driverEarningsDistribution}
                dataKey='value'
                isCurrency={true}
                currency={currency}
                colors={[
                  "#10b981",
                  "#3b82f6",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                  "#06b6d4",
                  "#ec4899",
                  "#84cc16",
                  "#f97316",
                  "#6366f1",
                ]}
              />
            </div>
          </div>
        </div>

        {/* Driver Performance Table */}
        <div className={styles.chartCardLarge}>
          <div className={styles.chartHeader}>
            <h3 className={`cardTitle h6`}>Driver Leaderboard</h3>
            <span className='miniNote'>Performance breakdown by driver</span>
          </div>
          <div className={styles.tableWrap}>
            {drivers.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyTitle}>
                  No rides with a driver in this period
                </div>
                <span className='miniNote'>
                  Try a different filter or expand the date range.
                </span>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th className={styles.right}>Trips</th>
                    <th className={styles.right}>Completed</th>
                    <th className={styles.right}>Upcoming</th>
                    <th className={styles.right}>Not closed out</th>
                    <th className={styles.right}>Cancelled</th>
                    <th className={styles.right}>No-Shows</th>
                    <th className={styles.right}>Completion Rate</th>
                    {linkToDrivers ? (
                      <th className={styles.right}>Pay rate</th>
                    ) : null}
                    <th className={styles.right}>Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.driverId}>
                      <td>
                        <div className={styles.driverName}>
                          {linkToDrivers ? (
                            <Link href={`/admin/drivers/${driver.driverId}`}>
                              {driver.driverName}
                            </Link>
                          ) : (
                            driver.driverName
                          )}
                        </div>
                        <span className='miniNote'>{driver.driverEmail}</span>
                      </td>
                      <td className={styles.right}>{driver.trips}</td>
                      <td className={styles.right}>{driver.completed}</td>
                      <td className={styles.right}>{driver.upcoming}</td>
                      <td className={styles.right}>
                        {linkToDrivers && driver.notClosedOut > 0 ? (
                          <a href='#not-closed-out'>{driver.notClosedOut}</a>
                        ) : (
                          driver.notClosedOut
                        )}
                      </td>
                      <td className={styles.right}>{driver.cancelled}</td>
                      <td className={styles.right}>{driver.noShows}</td>
                      <td className={styles.right}>
                        {driver.completionRate == null ? (
                          <span className='miniNote'>—</span>
                        ) : (
                          <span
                            className={
                              driver.completionRate >= 90
                                ? styles.rateBadgeGood
                                : driver.completionRate >= 70
                                  ? styles.rateBadgeWarn
                                  : styles.rateBadgeBad
                            }
                          >
                            {driver.completionRate}%
                          </span>
                        )}
                      </td>
                      {linkToDrivers ? (
                        <td className={styles.right}>
                          {!driver.paidPerRide
                            ? "Not per ride"
                            : driver.payPercent == null
                              ? "Not set"
                              : `${driver.payPercent}%`}
                        </td>
                      ) : null}
                      <td className={styles.right}>
                        {tz.formatMoneyShort(driver.payCents, currency)}
                        {driver.payMissing > 0 ? (
                          <div className='miniNote'>
                            {linkToDrivers ? (
                              <a href='#missing-pay'>
                                {driver.payMissing} not recorded
                              </a>
                            ) : (
                              `${driver.payMissing} not recorded`
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
