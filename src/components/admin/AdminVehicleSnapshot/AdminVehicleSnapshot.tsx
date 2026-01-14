import styles from "./AdminVehicleSnapshot.module.css";

export type VehicleCategoryReadiness = {
  id: string; // categoryId or "unassigned"
  name: string;
  activeUnits: number;
  availableToday: number;
};

type Props = {
  activeUnits: number;
  availableUnitsToday: number;
  inactiveUnits: number;
  byCategory?: VehicleCategoryReadiness[];
};

export default function AdminVehicleSnapshot({
  activeUnits,
  availableUnitsToday,
  inactiveUnits,
  byCategory = [],
}: Props) {
  return (
    <section
      className={styles.container}
      aria-label='Vehicle readiness snapshot'
    >
      <header className='header'>
        <h2 className={`cardTitle h4`}>Vehicle readiness</h2>
        <div className='emptySmall'>
          Available today:{" "}
          <span className={styles.metaStrong}>{availableUnitsToday}</span>
        </div>
      </header>

      <div className={styles.grid}>
        <Metric label='Active vehicle units' value={activeUnits} />
        <Metric label='Available units today' value={availableUnitsToday} />
        <Metric label='Inactive (maintenance)' value={inactiveUnits} />
      </div>

      {byCategory.length > 0 ? (
        <div className={styles.breakdown}>
          <div className='emptyTitle underline'>By category</div>
          <ul className={styles.list}>
            {byCategory.map((c) => (
              <li key={c.id} className={styles.row}>
                <span className='emptyTitleSmall'>{c.name}</span>
                <span className={styles.catNums}>
                  <span className='pill pillGood'>
                    Active: <strong>{c.activeUnits}</strong>
                  </span>
                  <span className='pill pillGood'>
                    Available today: <strong>{c.availableToday}</strong>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <div className='emptyTitle underline'>{label}</div>
      <p className='countPill'>{value}</p>
    </div>
  );
}
