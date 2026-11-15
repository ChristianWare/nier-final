/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// The top of the admin dashboard: who's signed in, a line on what the
// page is for, and the two things an admin does most: start a booking and
// open the bookings list.

import Link from "next/link";
import { useSession } from "next-auth/react";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import styles from "./AdminPageIntro.module.css";

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

  return (
    <section className={styles.container}>
      <div className={styles.text}>
        <SectionHeading dot text='Admin dashboard' />
        <h1 className={`${styles.heading} h3`}>
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className={styles.copy}>
          This month&apos;s earnings, then everything that needs you: new
          requests, rides to finish, approvals and payments.
        </p>
      </div>

      <div className={styles.actions}>
        <Button
          href='/admin/bookings/new'
          text='New booking'
          btnType='black'
          arrow
        />
        <Link href='/admin/bookings' className={styles.outline}>
          All bookings
        </Link>
      </div>
    </section>
  );
}
