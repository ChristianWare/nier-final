// components/admin/AdminPageIntro/AdminPageIntro.tsx
import AdminKPICard from "@/components/admin/AdminKPICard/AdminKPICard";
import styles from "./AdminPageIntro.module.css";

export type AdminPageIntroProps = {
  name?: string;
  pendingReview: number;
  pendingPayment: number;
  confirmed: number;
};

export default function AdminPageIntro({
  name = "Barry",
  pendingReview,
  pendingPayment,
  confirmed,
}: AdminPageIntroProps) {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
          <h1 className={`${styles.heading} h2`}>Welcome {name}!</h1>
        </div>

        <div className={styles.kpiGrid}>
          <AdminKPICard title='Pending review' value={pendingReview} />
          <AdminKPICard title='Pending payment' value={pendingPayment} />
          <AdminKPICard title='Confirmed' value={confirmed} />
        </div>
      </div>
    </section>
  );
}
