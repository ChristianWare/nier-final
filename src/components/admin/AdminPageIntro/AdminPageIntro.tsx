/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./AdminPageIntro.module.css";
import { useSession } from "next-auth/react";
import AdminKPICard from "@/components/admin/AdminKPICard/AdminKPICard";

type AppRole = "USER" | "ADMIN" | "DRIVER";

export type AdminPageIntroProps = {
  pendingReview: number;
  pendingPayment: number;
  confirmed: number;
};

export default function AdminPageIntro({
  pendingReview,
  pendingPayment,
  confirmed,
}: AdminPageIntroProps) {
  const { data: session } = useSession();

  const roles: AppRole[] = (session?.user as any)?.roles?.length
    ? (((session?.user as any).roles as AppRole[]) ?? [])
    : (session?.user as any)?.role
      ? ([(session?.user as any).role] as AppRole[])
      : [];

  const isAdmin = roles.includes("ADMIN");

  const fullName = isAdmin ? (session?.user?.name ?? "") : "";
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";
  const displayName = firstName || "Admin";

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
          <h1 className={`${styles.heading} h2`}>
            Welcome {displayName}! (Admin)
          </h1>
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
