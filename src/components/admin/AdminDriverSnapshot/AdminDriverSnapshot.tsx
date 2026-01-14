import styles from "./AdminDriverSnapshot.module.css";

type Props = {
  activeDrivers: number;
  driversAssignedToday: number;
  unassignedTripsToday: number;
};

export default function AdminDriverSnapshot({
  activeDrivers,
  driversAssignedToday,
  unassignedTripsToday,
}: Props) {
  const coveragePct =
    activeDrivers > 0
      ? Math.min(100, Math.round((driversAssignedToday / activeDrivers) * 100))
      : 0;

  return (
    <section
      className="container"
      aria-label='Driver readiness snapshot'
    >
      <header className="header">
        <h2 className={`cardTitle h4`}>Driver readiness</h2>
        <div className="emptySmall">
          Coverage today:{" "}
          <span className={styles.metaStrong}>{coveragePct}%</span>
        </div>
      </header>

      <div className={styles.grid}>
        <Metric label='Active drivers' value={activeDrivers} />
        <Metric label='Drivers assigned today' value={driversAssignedToday} />
        <Metric label='Unassigned trips today' value={unassignedTripsToday} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <div className="emptyTitle underline">{label}</div>
      <p className={styles.metricValue}>{value}</p>
    </div>
  );
}
