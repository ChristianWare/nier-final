import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import styles from "./DashboardLayout.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import DashboardSideNav from "@/components/Dashboard/DashboardSideNav/DashboardSideNav"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login?next=/dashboard");

  const fullName = session.user?.name?.trim() || "";
  const firstName = fullName.split(" ")[0] || "there";

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.content}>
            <div className={styles.left}>
              <h1 className={`${styles.heading} h2`}>
                Welcome {firstName}! - User Dashboard
              </h1>
              <div className={styles.AdminSideNavContainer}>
                <DashboardSideNav />
              </div>
            </div>
            <div className={styles.right}>{children}</div>
          </div>
        </section>
      </LayoutWrapper>
    </main>
  );
}
