/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./AdminPageIntro.module.css";
import { useSession } from "next-auth/react";
// import AdminKPICard from "@/components/admin/AdminKPICard/AdminKPICard";
import AdminQuickActions from "../AdminQuickActions/AdminQuickActions";

type AppRole = "USER" | "ADMIN" | "DRIVER";

export type AdminPageIntroProps = {
  pendingReview: number;
  pendingPayment: number;
  confirmed: number;
};

export default function AdminPageIntro(
  {
    // pendingReview,
    // pendingPayment,
    // confirmed,
  }: AdminPageIntroProps,
) {
  const { data: session } = useSession();

  const roles: AppRole[] = Array.isArray((session?.user as any)?.roles)
    ? (((session?.user as any)?.roles as AppRole[]) ?? [])
    : [];

  const isAdmin = roles.includes("ADMIN");

  const fullName = isAdmin ? (session?.user?.name ?? "") : "";
  const firstName = fullName.trim().split(/\s+/)[0] || "";
  const displayName = firstName || "Admin";

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
          <h1 className={`heading undeline h2`}>
            Welcome {displayName}! (Admin)
          </h1>
        </div>
        <AdminQuickActions />

        {/* <div className={`cardTitle h4`} style={{ marginTop: "7rem" }}>
          Key Performance Indicators
        </div>

        <div className={styles.kpiGrid}>
          <AdminKPICard title='Pending review' value={pendingReview} />
          <AdminKPICard title='Pending payment' value={pendingPayment} />
          <AdminKPICard title='Confirmed' value={confirmed} />
        </div> */}
      </div>
    </section>
  );
}
