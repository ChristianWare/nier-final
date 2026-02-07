/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./CorporateLayout.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import CorporateSideNav from "@/components/corporate/CorporateSideNav/CorporateSideNav";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER" | "CORPORATE";

export default async function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/corporate");

  const roles: AppRole[] = Array.isArray((session.user as any)?.roles)
    ? (((session.user as any).roles as AppRole[]) ?? [])
    : [];

  const isCorporate = roles.includes("CORPORATE") || roles.includes("ADMIN");
  if (!isCorporate) redirect("/");

  // Get the corporate account linked to this user
  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user?.id },
    select: {
      corporateAccount: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  const account = contact?.corporateAccount ?? null;

  // If no corporate account is linked, show a message
  if (!account) {
    return (
      <main>
        <Nav background='white' />
        <LayoutWrapper>
          <section className={styles.container}>
            <div className={styles.noAccount}>
              <h1 className='h2'>No Corporate Account</h1>
              <p className='subheading'>
                Your account is not linked to a corporate account. Please
                contact Nier Transportation for assistance.
              </p>
            </div>
          </section>
        </LayoutWrapper>
      </main>
    );
  }

  // Count upcoming rides for badge
  const now = new Date();
  const upcomingRidesCount = await db.booking.count({
    where: {
      corporateAccountId: account.id,
      pickupAt: { gte: now },
      NOT: {
        status: {
          in: ["CANCELLED", "REFUNDED", "NO_SHOW"] as any,
        },
      },
    },
  });

  const fullName = session.user?.name?.trim() ?? "";
  const firstName = fullName.split(/\s+/)[0] || "";
  const displayName = firstName || "there";

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.content}>
            <div className={styles.left}>
              <p className={styles.companyLabel}>
                {account.name} — Corporate Dashboard
              </p>
              <h1 className={`${styles.heading} h2`}>Welcome {displayName}!</h1>

              <div className={styles.sideNavContainer}>
                <CorporateSideNav
                  upcomingRidesCount={upcomingRidesCount}
                  accountStatus={account.status}
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
