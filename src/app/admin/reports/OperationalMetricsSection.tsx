// Operational Metrics: status mix, completion, cancellations, no-shows, lead
// time and peak times. Shown on the dashboard's Reporting tab.
import {
  leadTimeBuckets,
  operationalStats,
  peakTimes,
  type ReportRide,
} from "@/lib/reports/rideStats";
import KpiCard from "./KpiCard";
import StatusPieChart from "./StatusPieChart";
import LeadTimePieChart from "./LeadTimePieChart";
import PeakTimesPieChart from "./PeakTimesPieChart";
import styles from "./AdminReportsPage.module.css";

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_REVIEW: "Pending Review",
    PENDING_PAYMENT: "Pending Payment",
    CONFIRMED: "Confirmed",
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partial Refund",
    NO_SHOW: "No Show",
  };
  return labels[status] || status;
}

export default function OperationalMetricsSection({
  rides,
  todayStart,
  timeZone,
  rangeLabel,
  basisLabel,
}: {
  rides: ReportRide[];
  todayStart: Date;
  timeZone: string;
  rangeLabel: string;
  basisLabel: string;
}) {
  const ops = operationalStats(rides, todayStart);
  const bookingsByStatus = ops.byStatus.map((x) => ({
    name: formatStatusLabel(x.status),
    value: x.count,
    status: x.status,
  }));
  const leadTimeData = leadTimeBuckets(rides);
  const peakTimesData = peakTimes(rides, timeZone);
  const totalBookings = ops.total;
  const completedBookings = ops.completed;
  const cancelledBookings = ops.cancelled;
  const noShowBookings = ops.noShows;
  const completionRate = ops.completionRate ?? 0;
  const cancellationRate = ops.cancellationRate ?? 0;
  const noShowRate = ops.noShowRate ?? 0;

  return (
    <>
      {/* ============================================ */}
      {/* OPERATIONAL METRICS SECTION */}
      {/* ============================================ */}
      <section className={styles.section}>
        <div className='header'>
          <h2 className={`cardTitle h4`}>Operational Metrics</h2>
          <span className={styles.sectionBadge}>
            {rangeLabel} · {basisLabel}
          </span>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard
            label='Total Bookings'
            value={String(totalBookings)}
            sub={`${basisLabel.charAt(0).toUpperCase()}${basisLabel.slice(1)} in this period`}
          />
          <KpiCard
            label='Completion Rate'
            value={`${completionRate}%`}
            sub={`${completedBookings} completed · ${ops.notClosedOut} not closed out`}
            tone={completionRate >= 80 ? "good" : "warn"}
          />
          <KpiCard
            label='Cancellation Rate'
            value={`${cancellationRate}%`}
            sub={`${cancelledBookings} cancelled`}
            tone={cancellationRate <= 10 ? "good" : "warn"}
          />
          <KpiCard
            label='No-Show Rate'
            value={`${noShowRate}%`}
            sub={`${noShowBookings} no-shows`}
            tone={noShowRate <= 5 ? "good" : "warn"}
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Bookings by Status</h3>
              <span className='miniNote'>Distribution</span>
            </div>
            <div className={styles.chartBodyPie}>
              <StatusPieChart
                data={bookingsByStatus}
                dataKey='value'
                colors={[
                  "#10b981",
                  "#3b82f6",
                  "#8b5cf6",
                  "#f59e0b",
                  "#ef4444",
                  "#6b7280",
                  "#ec4899",
                  "#06b6d4",
                ]}
              />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Lead Time Distribution</h3>
              <span className='miniNote'>
                How far in advance customers book
              </span>
            </div>
            <div className={styles.chartBodyPie}>
              <LeadTimePieChart data={leadTimeData} />
            </div>
          </div>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Peak Days</h3>
              <span className='miniNote'>Busiest days of the week</span>
            </div>
            <div className={styles.chartBodyPie}>
              <PeakTimesPieChart data={peakTimesData.dayData} />
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={`cardTitle h6`}>Peak Hours</h3>
              <span className='miniNote'>Busiest times of day</span>
            </div>
            <div className={styles.chartBodyPie}>
              <PeakTimesPieChart
                data={peakTimesData.hourData}
                colors={["#fbbf24", "#f97316", "#8b5cf6", "#1e3a5f"]}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
