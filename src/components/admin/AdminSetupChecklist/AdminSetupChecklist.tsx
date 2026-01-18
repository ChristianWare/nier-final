import styles from "./AdminSetupChecklist.module.css";
import Link from "next/link";
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";
import type { SetupChecklistItem } from "@/app/admin/lib/getBookingWizardSetupChecklist";

export default function AdminSetupChecklist({
  items,
  title = "Setup checklist",
}: {
  items: SetupChecklistItem[];
  title?: string;
}) {
  const required = items.filter((i) => !i.optional);
  const completedRequired = required.filter((i) => i.done).length;
  const requiredTotal = required.length;
  const remaining = Math.max(0, requiredTotal - completedRequired);

  return (
    <section className={styles.container} aria-label='Setup checklist'>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className='cardTitle h4'>{title}</h2>
          <div className={styles.progress}>
            <span className='miniNote'>
              {completedRequired}/{requiredTotal} complete
            </span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <BadgeCount value={remaining} max={99} hideIfZero />
        </div>
      </header>

      <ul className={styles.list}>
        {items.map((item) => {
          const stateClass = item.done
            ? styles.done
            : item.severity === "danger"
              ? styles.danger
              : item.severity === "warning"
                ? styles.warning
                : styles.info;

          return (
            <li key={item.id} className={`${styles.item} ${stateClass}`}>
              <div className={styles.left}>
                <div className={styles.topRow}>
                  <span className={styles.icon} aria-hidden='true'>
                    {item.done ? "✓" : "!"}
                  </span>
                  <div className={styles.titleRow}>
                    <div className='emptyTitle'>{item.title}</div>
                    {item.optional ? (
                      <span className={styles.optional}>Optional</span>
                    ) : null}
                    {item.done ? (
                      <span className={styles.donePill}>Done</span>
                    ) : null}
                  </div>
                </div>

                <p className='emptySmall'>{item.description}</p>
              </div>

              <div className={styles.right}>
                {item.href ? (
                  <Link
                    className={item.done ? "secondaryBtn" : "primaryBtn"}
                    href={item.href}
                  >
                    {item.ctaLabel || "Open"}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
