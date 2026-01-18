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
  // ✅ time-sensitive / operational alerts
  alerts: AlertItem[];

  // ✅ setup/readiness checklist items (blocking or recommended)
  setup?: AlertItem[];
};

export default function AdminAlerts({ alerts, setup = [] }: Props) {
  const alertCount = alerts.length;
  const setupCount = setup.length;

  const setupHasBlocking = setup.some((s) => s.severity === "danger");

  return (
    <section className={styles.container} aria-label='Alerts'>
      {/* -------------------- */}
      {/* Setup checklist */}
      {/* -------------------- */}
      {setupCount > 0 ? (
        <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          <header className={styles.header}>
            <h2
              className={`cardTitle h4${setupHasBlocking ? " redBorder" : ""}`}
            >
              Setup checklist
            </h2>

            <div className='miniNote'>
              <BadgeCount value={setupCount} max={99} hideIfZero />
            </div>
          </header>

          <ul className={styles.list}>
            {setup.map((a) => (
              <li key={a.id} className={`${styles.row} ${styles[a.severity]}`}>
                <div className={styles.left}>
                  <div className='emptyTitle'>{labelSetup(a.severity)}</div>
                  <p className='emptySmall'>{a.message}</p>
                </div>

                <div className={styles.right}>
                  {a.href ? (
                    <Link className='primaryBtn' href={a.href}>
                      {a.ctaLabel || "Fix"}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* -------------------- */}
      {/* Operational alerts */}
      {/* -------------------- */}
      <header className={styles.header}>
        <h2 className={`cardTitle h4${alertCount > 0 ? " redBorder" : ""}`}>
          Alerts
        </h2>

        <div className='miniNote'>
          {alertCount === 0 ? null : (
            <BadgeCount value={alertCount} max={99} hideIfZero />
          )}
        </div>
      </header>

      {alertCount === 0 ? (
        <div className='emptySmall'>No alerts right now.</div>
      ) : (
        <ul className={styles.list}>
          {alerts.map((a) => (
            <li key={a.id} className={`${styles.row} ${styles[a.severity]}`}>
              <div className={styles.left}>
                <div className='emptyTitle'>{labelSeverity(a.severity)}</div>
                <p className='emptySmall'>{a.message}</p>
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

function labelSetup(sev: AlertItem["severity"]) {
  if (sev === "danger") return "Blocking";
  if (sev === "warning") return "Recommended";
  return "Optional";
}
