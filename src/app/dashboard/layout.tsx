import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import styles from "./DashboardLayout.module.css";
import theme from "@/components/shared/DashboardTheme/DashboardTheme.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import DashboardSideNav from "@/components/Dashboard/DashboardSideNav/DashboardSideNav";
import DashboardBottomBar from "@/components/Dashboard/DashboardBottomBar/DashboardBottomBar";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login?next=/dashboard");

  const user = session.user as { id?: string; roles?: string[] } | undefined;
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  // Payments & receipts shows how many approved rides wait to be paid for.
  const paymentsDueCount = user?.id
    ? await db.booking.count({
        where: { userId: user.id, status: "PENDING_PAYMENT" },
      })
    : 0;

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.content}>
            <div className={styles.left}>
              <div className={styles.AdminSideNavContainer}>
                <DashboardSideNav
                  roles={roles}
                  paymentsDueCount={paymentsDueCount}
                />
              </div>
            </div>
            <div className={`${styles.right} ${theme.theme}`}>{children}</div>
          </div>
        </section>
      </LayoutWrapper>
      {/* Tablets and phones: the bottom bar replaces the side nav. */}
      <DashboardBottomBar roles={roles} paymentsDueCount={paymentsDueCount} />
    </main>
  );
}
