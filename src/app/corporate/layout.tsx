/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import styles from "./CorporateLayout.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import CorporateSideNav from "@/components/corporate/CorporateSideNav/CorporateSideNav";
import CorporateBottomBar from "@/components/corporate/CorporateBottomBar/CorporateBottomBar";
import theme from "@/components/shared/DashboardTheme/DashboardTheme.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import { db } from "@/lib/db";
import { SITE } from "@/config/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The corporate portal is for signed-in account users only.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
                {roles.includes("ADMIN") ? (
                  <>
                    You&apos;re not linked to a corporate account yet. To use
                    this dashboard, open your profile in Admin → Users and,
                    under Manage roles → Corporate, link yourself to an account.
                  </>
                ) : (
                  <>
                    Your account is not linked to a corporate account. Please
                    contact {SITE.name} for assistance.
                  </>
                )}
              </p>
            </div>
          </section>
        </LayoutWrapper>
      </main>
    );
  }

  // Badges: rides booked from now on, and invoices waiting to be paid.
  const now = new Date();
  const [upcomingRidesCount, invoicesDueCount] = await Promise.all([
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: now },
        NOT: {
          status: {
            in: ["CANCELLED", "REFUNDED", "NO_SHOW"] as any,
          },
        },
      },
    }),
    db.corporateInvoice.count({
      where: {
        corporateAccountId: account.id,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
  ]);

  const canBook = account.status === "ACTIVE";

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.content}>
            <div className={styles.left}>
              <div className={styles.sideNavContainer}>
                <CorporateSideNav
                  roles={roles}
                  canBook={canBook}
                  upcomingRidesCount={upcomingRidesCount}
                  invoicesDueCount={invoicesDueCount}
                />
              </div>
            </div>

            <div className={`${styles.right} ${theme.theme}`}>
              {/* A suspended account can't book: say so on every page. */}
              {!canBook ? (
                <div className={styles.statusBanner} role='status'>
                  <strong>
                    {account.status === "SUSPENDED"
                      ? "Account suspended."
                      : "Account closed."}
                  </strong>{" "}
                  New bookings are paused. Contact {SITE.name} to sort it out;
                  your bookings, invoices and reports are still here.
                </div>
              ) : null}
              {children}
            </div>
          </div>
        </section>
      </LayoutWrapper>
      {/* Tablets and phones: the bottom bar replaces the side nav. */}
      <CorporateBottomBar
        roles={roles}
        canBook={canBook}
        upcomingRidesCount={upcomingRidesCount}
        invoicesDueCount={invoicesDueCount}
      />
    </main>
  );
}
