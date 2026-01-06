import styles from "./AdminScheduleSnapshot.module.css";

type DayCounts = {
  total: number;
  confirmed: number;
  unassigned: number;
};

type Props = {
  today: DayCounts;
  tomorrow: DayCounts;
  earliestUpcomingPickupAt: Date | null;
  tripsNext3Hours: number;
  timeZone?: string;
};

export default function AdminScheduleSnapshot({
  today,
  tomorrow,
  earliestUpcomingPickupAt,
  tripsNext3Hours,
  timeZone = "America/Phoenix",
}: Props) {
  return (
    <section className={styles.container} aria-label='Schedule snapshot'>
      <header className={styles.header}>
        <h2 className={`${styles.title} h4`}>Schedule</h2>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Earliest upcoming:</span>{" "}
            <span className={styles.metaValue}>
              {earliestUpcomingPickupAt
                ? formatDateTime(earliestUpcomingPickupAt, timeZone)
                : "—"}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Next 3 hours:</span>{" "}
            <span className={styles.metaValue}>{tripsNext3Hours}</span>
          </div>
        </div>
      </header>

      <div className={styles.table}>
        <div className={styles.rowHead}>
          <div className={styles.colLabel}></div>
          <div className={styles.col}>Total</div>
          <div className={styles.col}>Confirmed</div>
          <div className={styles.col}>Unassigned</div>
        </div>

        <div className={styles.row}>
          <div className={styles.colLabel}>Today</div>
          <div className={styles.colValue}>{today.total}</div>
          <div className={styles.colValue}>{today.confirmed}</div>
          <div className={styles.colValue}>{today.unassigned}</div>
        </div>

        <div className={styles.row}>
          <div className={styles.colLabel}>Tomorrow</div>
          <div className={styles.colValue}>{tomorrow.total}</div>
          <div className={styles.colValue}>{tomorrow.confirmed}</div>
          <div className={styles.colValue}>{tomorrow.unassigned}</div>
        </div>
      </div>
    </section>
  );
}

function formatDateTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
