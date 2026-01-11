/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./AdminLayout.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import AdminSideNav from "@/components/admin/AdminSideNav/AdminSideNav";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/admin");

  const roles: AppRole[] = Array.isArray((session.user as any)?.roles)
    ? (((session.user as any).roles as AppRole[]) ?? [])
    : [];

  const isAdmin = roles.includes("ADMIN");
  if (!isAdmin) redirect("/");

  const [pendingReview, pendingPayment] = await Promise.all([
    db.booking.count({ where: { status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { status: "PENDING_PAYMENT" } }),
  ]);

  const bookingNeedsAttentionCount = pendingReview + pendingPayment;

  const fullName = session.user?.name?.trim() ?? "";
  const firstName = fullName.split(/\s+/)[0] || "";
  const displayName = firstName || "Admin";

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.content}>
            <div className={styles.left}>
              <h1 className={`${styles.heading} h2`}>
                Welcome {displayName}! (Admin)
              </h1>

              <div className={styles.AdminSideNavContainer}>
                <AdminSideNav
                  bookingNeedsAttentionCount={bookingNeedsAttentionCount}
                />
              </div>
            </div>

            <div className={styles.right}>{children}</div>
          </div>
        </section>
      </LayoutWrapper>
    </main>
  );
}
