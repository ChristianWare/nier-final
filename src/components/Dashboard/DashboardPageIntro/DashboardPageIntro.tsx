// The top of the customer dashboard, like the driver's: a pulsing label,
// "Welcome back", a line of copy and Book a ride, then three numbers that
// each open their list. Payments due takes the accent while anything is
// owed.

import Link from "next/link";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import styles from "./DashboardPageIntro.module.css";

export type DashboardPageIntroProps = {
  firstName: string;
  pendingReview: number;
  pendingPayment: number;
  confirmed: number;
};

export default function DashboardPageIntro({
  firstName,
  pendingReview,
  pendingPayment,
  confirmed,
}: DashboardPageIntroProps) {
  const kpis = [
    {
      label: "Upcoming trips",
      value: confirmed,
      href: "/dashboard/trips?range=upcoming",
      tone: "",
    },
    {
      label: "Awaiting approval",
      value: pendingReview,
      href: "/dashboard/trips?range=all&status=PENDING_REVIEW",
      tone: "",
    },
    {
      label: "Payments due",
      value: pendingPayment,
      href: "/dashboard/trips?range=all&status=PENDING_PAYMENT",
      tone: pendingPayment > 0 ? styles.kpiAccent : "",
    },
  ];

  return (
    <header className={styles.container}>
      <div className={styles.intro}>
        <SectionHeading dot text='Your rides' />
        <h1 className={`${styles.heading} h3`}>Welcome back, {firstName}</h1>
        <p className={styles.copy}>
          Your next ride, anything that needs you, and your trips and receipts.
        </p>
        <Button href='/book' text='Book a ride' btnType='black' arrow />
      </div>

      <div className={styles.kpis}>
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className={`${styles.kpi} ${k.tone}`}
          >
            <span className={styles.kpiLabel}>{k.label}</span>
            <span className={styles.kpiValue}>{k.value}</span>
          </Link>
        ))}
      </div>
    </header>
  );
}
