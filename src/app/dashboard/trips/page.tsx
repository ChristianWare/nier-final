import styles from "./TripsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardTrips from "@/components/Dashboard/DashboardTrips/DashboardTrips";
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

const PAST_STATUSES: BookingStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

type Tab = "upcoming" | "past" | "drafts";

function normalizeTab(v?: string): Tab {
  if (v === "past") return "past";
  if (v === "drafts") return "drafts";
  return "upcoming";
}

export default async function DashboardTripsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/trips");

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

  if (!userId) redirect("/login?next=/dashboard/trips");

  const tab = normalizeTab(searchParams?.tab);

  const [upcomingCount, pastCount, draftsCount] = await Promise.all([
    db.booking.count({
      where: { userId, status: { in: UPCOMING_STATUSES } },
    }),
    db.booking.count({
      where: { userId, status: { in: PAST_STATUSES } },
    }),
    db.booking.count({
      where: { userId, status: "DRAFT" },
    }),
  ]);

  const where =
    tab === "upcoming"
      ? { userId, status: { in: UPCOMING_STATUSES } }
      : tab === "past"
        ? { userId, status: { in: PAST_STATUSES } }
        : { userId, status: "DRAFT" as const };

  const orderBy =
    tab === "upcoming"
      ? ({ pickupAt: "asc" } as const)
      : tab === "past"
        ? ({ pickupAt: "desc" } as const)
        : ({ updatedAt: "desc" } as const);

  const trips = await db.booking.findMany({
    where,
    orderBy,
    take: 200,
    include: {
      serviceType: { select: { name: true, slug: true } },
      vehicle: { select: { name: true } },
      payment: {
        select: { status: true, checkoutUrl: true, receiptUrl: true },
      },
    },
  });

  return (
    <section className={styles.container}>
      <DashboardTrips
        tab={tab}
        counts={{
          upcoming: upcomingCount,
          past: pastCount,
          drafts: draftsCount,
        }}
        trips={trips}
      />
    </section>
  );
}
