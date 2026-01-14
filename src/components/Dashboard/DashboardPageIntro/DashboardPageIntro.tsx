"use client";

import styles from "./DashboardPageIntro.module.css";
import { useSession } from "next-auth/react";
import AdminKPICard from "@/components/admin/AdminKPICard/AdminKPICard";

export type DashboardPageIntroProps = {
  name?: string;
  pendingReview: number;
  pendingPayment: number;
  confirmed: number;
};

export default function DashboardPageIntro({
  name,
  pendingReview,
  pendingPayment,
  confirmed,
}: DashboardPageIntroProps) {
  const { data: session } = useSession();

  const sessionName = session?.user?.name ?? session?.user?.email ?? "";
  const displayName = (name ?? sessionName ?? "there").trim() || "there";

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
          <h1 className={`${styles.heading} h2`}>Welcome {displayName}!</h1>
     
        </div>

        <div className={styles.kpiGrid}>
          <AdminKPICard title='Upcoming trips' value={confirmed} />
          <AdminKPICard title='Pending review' value={pendingReview} />
          <AdminKPICard title='Payments due' value={pendingPayment} />
        </div>
      </div>
    </section>
  );
}
