/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "../../../../../../auth";
import styles from "./GreetsignPage.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveSessionUserId(session: any) {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

export default async function GreetsignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverId = await resolveSessionUserId(session);
  if (!driverId) redirect("/");

  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      id: true,
      user: { select: { name: true } },
      guestName: true,
      corporatePassenger: { select: { name: true } },
      assignment: {
        select: { driverId: true },
      },
    },
  });

  if (!booking) return notFound();

  // Verify access
  const isAdmin = roles?.includes("ADMIN");
  if (!isAdmin && booking.assignment?.driverId !== driverId) {
    redirect("/driver-dashboard");
  }

  const passengerName =
    booking.user?.name?.trim() ||
    booking.guestName?.trim() ||
    booking.corporatePassenger?.name?.trim() ||
    "Guest";

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link
          href={`/driver-dashboard/trips/${booking.id}`}
          className={styles.backLink}
        >
          ← Back
        </Link>
        <span className={styles.headerTitle}>Greetsign</span>
        <span className={styles.headerSpacer} />
      </header>

      <div className={styles.signArea}>
        <div className={styles.passengerName}>{passengerName}</div>
        <div className={styles.companyName}>Nier Transportation</div>
      </div>
    </section>
  );
}
