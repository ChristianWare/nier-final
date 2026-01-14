import styles from "./AdminAlerts.module.css";
import Link from "next/link";
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";

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
  const count = alerts.length;

  return (
    <section className={styles.container} aria-label='Alerts'>
      <header className={styles.header}>
        <h2 className={`cardTitle h4${count > 0 ? ' redBorder' : ''}`}>Alerts</h2>
        <div className="miniNote">
          {count === 0 ? (
            "All clear"
          ) : (
            <>
              <BadgeCount value={count} max={99} hideIfZero />
            </>
          )}
        </div>
      </header>

      {count === 0 ? (
        <div className="emptySmall">No alerts right now.</div>
      ) : (
        <ul className={styles.list}>
          {alerts.map((a) => (
            <li key={a.id} className={`${styles.row} ${styles[a.severity]}`}>
              <div className={styles.left}>
                <div className="emptyTitle">{labelSeverity(a.severity)}</div>
                <p className="emptySmall">{a.message}</p>
              </div>

              <div className={styles.right}>
                {a.href ? (
                  <Link className='primaryBtn' href={a.href}>
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
