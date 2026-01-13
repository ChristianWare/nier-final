/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import styles from "./DriverDashboardLayout.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import DriverSideNav from "@/components/Driver/DriverSideNav/DriverSideNav";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function normalizeRoles(roles: any): AppRole[] {
  return Array.isArray(roles) && roles.length > 0
    ? (roles as AppRole[])
    : (["USER"] as AppRole[]);
}

async function resolveViewer(
  session: any
): Promise<{ userId: string; roles: AppRole[] }> {
  // Prefer standardized userId from your auth.ts session callback
  const userId =
    (session?.user?.userId as string | undefined) ??
    (session?.user?.id as string | undefined);

  const roles = normalizeRoles(session?.user?.roles);

  // If we already have userId + roles, great
  if (userId && roles.length) return { userId, roles };

  // Fallback: hydrate from DB using email (handles stale sessions)
  const email = session?.user?.email ?? null;
  if (!email) throw new Error("Missing identity");

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, roles: true },
  });

  if (!u?.id) throw new Error("User not found");
  return { userId: u.id, roles: normalizeRoles(u.roles) };
}

export default async function DriverDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard");

  const { roles } = await resolveViewer(session);

  const isDriver = roles.includes("DRIVER");
  const isAdmin = roles.includes("ADMIN");

  // ✅ gate driver dashboard
  if (!isDriver && !isAdmin) redirect("/");

  const fullName = (session.user?.name ?? "").trim();
  const firstName = fullName.split(/\s+/)[0] || "there";

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.content}>
            <div className={styles.left}>
              <h1 className={`${styles.heading} h2`}>Welcome {firstName}!</h1>
              <div className={styles.sideNavContainer}>
                <DriverSideNav />
              </div>
            </div>

            <div className={styles.right}>{children}</div>
          </div>
        </section>
      </LayoutWrapper>
    </main>
  );
}
