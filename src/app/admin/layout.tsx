import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import styles from "./AdminLayout.module.css";
import AdminSideNav from "@/components/admin/AdminSideNav/AdminSideNav";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session) redirect("/login?next=/admin");
  if (role !== "ADMIN") redirect("/");

  const [pendingReview, pendingPayment] = await Promise.all([
    db.booking.count({ where: { status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { status: "PENDING_PAYMENT" } }),
  ]);

  const bookingNeedsAttentionCount = pendingReview + pendingPayment;

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.content}>
            <div className={styles.left}>
              <h1 className={`${styles.heading} h2`}>Welcome Barry!</h1>
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
