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
      <header className='header'>
        <h2 className={`cardTitle h4`}>Schedule</h2>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <div className='emptyTitle underline'>Earliest upcoming:</div>{" "}
            <div className='emptySmall'>
              {earliestUpcomingPickupAt
                ? formatDateTime(earliestUpcomingPickupAt, timeZone)
                : "—"}
            </div>
          </div>
          <div className={styles.metaItem}>
            <span className='emptyTitle underline'>Next 3 hours:</span>{" "}
            <span className='countPill'>{tripsNext3Hours}</span>
          </div>
        </div>
      </header>

      <div className={styles.table}>
        <div className={styles.rowHead}>
          <div className={styles.colLabel}></div>
          <div className='label'>Total</div>
          <div className='label'>Confirmed</div>
          <div className='label'>Unassigned</div>
        </div>

        <div className={styles.row}>
          <div className='emptyTitleSmall'>Today</div>
          <div className={styles.colValue}>{today.total}</div>
          <div className={styles.colValue}>{today.confirmed}</div>
          <div className={styles.colValue}>{today.unassigned}</div>
        </div>

        <div className={styles.row}>
          <div className='emptyTitleSmall'>Tomorrow</div>
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
