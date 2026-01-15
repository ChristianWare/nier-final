/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./DriverPageIntro.module.css";
import { useSession } from "next-auth/react";
import AdminKPICard from "@/components/admin/AdminKPICard/AdminKPICard";

type AppRole = "USER" | "ADMIN" | "DRIVER";

export type DriverPageIntroProps = {
  assigned: number;
  upcoming: number;
  completed: number;
};

export default function DriverPageIntro({
  assigned,
  upcoming,
  completed,
}: DriverPageIntroProps) {
  const { data: session } = useSession();

  const roles: AppRole[] = Array.isArray((session?.user as any)?.roles)
    ? (((session?.user as any)?.roles as AppRole[]) ?? [])
    : [];

  const isDriver = roles.includes("DRIVER");

  const fullName = isDriver ? (session?.user?.name ?? "") : "";
  const firstName = fullName.trim().split(/\s+/)[0] || "";
  const displayName = firstName || "Driver";

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.top}>
          <h1 className={`${styles.heading} h2`}>
            Welcome {displayName}! (Driver)
          </h1>
        </div>

        <div className={styles.kpiGrid}>
          <AdminKPICard title='Assigned' value={assigned} />
          <AdminKPICard title='Upcoming' value={upcoming} />
          <AdminKPICard title='Completed' value={completed} />
        </div>
      </div>
    </section>
  );
}
