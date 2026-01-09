// src/app/dashboard/page.tsx
import styles from './DashboardPage.module.css'
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardPageIntro from "@/components/Dashboard/DashboardPageIntro/DashboardPageIntro";
import DashboardQuickActions from "@/components/Dashboard/DashboardQuickActions/DashboardQuickActions";
import DashboardOverview from "@/components/Dashboard/DashboardOverview/DashboardOverview";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPCOMING_STATUSES: BookingStatus[] = [
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
];

export default async function DashboardHomePage() {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard");

  const role = session?.user?.role;
  if (role === "ADMIN") redirect("/admin");
  if (role === "DRIVER") redirect("/driver");

  const email = session.user?.email ?? null;
  const sessionUserId = (session.user as { id?: string }).id ?? null;

  let userId = sessionUserId;

  if (!userId && email) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) redirect("/login?next=/dashboard");

  const now = new Date();

  const [
    pendingReview,
    pendingPayment,
    upcomingCount,
    nextTrip,
    recentActivity,
  ] = await Promise.all([
    db.booking.count({ where: { userId, status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { userId, status: "PENDING_PAYMENT" } }),
    db.booking.count({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_STATUSES },
      },
    }),
    db.booking.findFirst({
      where: {
        userId,
        pickupAt: { gte: now },
        status: { in: UPCOMING_STATUSES },
      },
      orderBy: { pickupAt: "asc" },
      include: {
        serviceType: { select: { id: true, name: true, slug: true } },
        vehicle: { select: { id: true, name: true } },
        payment: {
          select: { status: true, checkoutUrl: true, receiptUrl: true },
        },
        assignment: {
          include: {
            driver: { select: { id: true, name: true, email: true } },
            vehicleUnit: { select: { id: true, name: true, plate: true } },
          },
        },
      },
    }),
    db.bookingStatusEvent.findMany({
      where: { booking: { userId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const displayName =
    (session.user?.name ?? session.user?.email ?? "").trim() || "there";

  return (
    <section className={styles.container}>
      <DashboardPageIntro
        name={displayName}
        pendingReview={pendingReview}
        pendingPayment={pendingPayment}
        confirmed={upcomingCount}
      />

      <DashboardQuickActions />

      <DashboardOverview nextTrip={nextTrip} recentActivity={recentActivity} />
    </section>
  );
}
