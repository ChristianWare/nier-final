import styles from "./DashboardQuickActions.module.css";
import Button from "@/components/shared/Button/Button";

type QuickAction = {
  label: string;
  href: string;
  description?: string;
};

const ACTIONS: QuickAction[] = [
  {
    label: "Book a ride",
    href: "/book",
    description: "Start a new booking",
  },
  {
    label: "My trips",
    href: "/dashboard/trips",
    description: "Upcoming and past rides",
  },
  {
    label: "Payments & receipts",
    href: "/dashboard/payments",
    description: "View receipts and invoices",
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    description: "Ride updates and alerts",
  },
  {
    label: "Profile & security",
    href: "/dashboard/profile",
    description: "Manage your account",
  },
  {
    label: "Support",
    href: "/dashboard/support",
    description: "Get help fast",
  },
];

export default function DashboardQuickActions() {
  return (
    <section className={styles.container} aria-label='Quick actions'>
      <header className={styles.header}>
        <h2 className={`${styles.title} h4`}>Quick actions</h2>
      </header>

      <div className={styles.grid}>
        {ACTIONS.map((a) => (
          <div key={a.href} className={styles.card}>
            <div className={styles.btnContainer}>
              <Button href={a.href} text={a.label} btnType='black' arrow />
            </div>
            {a.description ? (
              <p className="subheading">{a.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
