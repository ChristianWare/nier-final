import styles from "./AdminAlerts.module.css";
import Link from "next/link";

export type AlertItem = {
  id: string;
  severity: "danger" | "warning" | "info";
  message: string;
  href?: string;
  ctaLabel?: string;
};

type Props = {
  alerts: AlertItem[];
};

export default function AdminAlerts({ alerts }: Props) {
  return (
    <section className={styles.container} aria-label='Alerts'>
      <header className={styles.header}>
        <h2 className={`${styles.title} h4`}>Alerts</h2>
        <div className={styles.meta}>
          {alerts.length ? `${alerts.length} active` : "All clear"}
        </div>
      </header>

      {alerts.length === 0 ? (
        <div className={styles.empty}>No alerts right now.</div>
      ) : (
        <ul className={styles.list}>
          {alerts.map((a) => (
            <li key={a.id} className={`${styles.row} ${styles[a.severity]}`}>
              <div className={styles.left}>
                <div className={styles.sev}>{labelSeverity(a.severity)}</div>
                <p className={styles.msg}>{a.message}</p>
              </div>

              <div className={styles.right}>
                {a.href ? (
                  <Link className={styles.btn} href={a.href}>
                    {a.ctaLabel || "View"}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function labelSeverity(sev: AlertItem["severity"]) {
  if (sev === "danger") return "Critical";
  if (sev === "warning") return "Warning";
  return "Info";
}
