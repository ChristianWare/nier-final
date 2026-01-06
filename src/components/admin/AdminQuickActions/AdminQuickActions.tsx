import Link from "next/link";
import styles from "./AdminQuickActions.module.css";

type QuickAction = {
  label: string;
  href: string;
  description?: string;
};

const ACTIONS: QuickAction[] = [
  {
    label: "Review bookings",
    href: "/admin/bookings",
    description: "Work the queue",
  },
  {
    label: "Create booking",
    href: "/admin/bookings/new",
    description: "Admin-created trip",
  },
  {
    label: "Add vehicle unit",
    href: "/admin/vehicles/new",
    description: "Add an individual vehicle",
  },
  {
    label: "Add driver",
    href: "/admin/drivers",
    description: "Manage drivers",
  },
  {
    label: "Today’s schedule",
    href: "/admin/bookings?range=today",
    description: "Trips happening today",
  },
];

export default function AdminQuickActions() {
  return (
    <section className={styles.container} aria-label='Quick actions'>
      <header className={styles.header}>
        <h2 className={`${styles.title} h4`}>Quick actions</h2>
        <div className={styles.meta}>Go do the thing</div>
      </header>

      <div className={styles.grid}>
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.label}>{a.label}</div>
              <div className={styles.arrow}>→</div>
            </div>
            {a.description ? (
              <div className={styles.desc}>{a.description}</div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
