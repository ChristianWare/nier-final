/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./SavedPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardSavedDetails from "@/components/Dashboard/DashboardSavedDetails/DashboardSavedDetails";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveUserId(session: any) {
  const sessionUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

type HistoryBooking = {
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  status: BookingStatus;
  vehicle: { name: string } | null;
  serviceType: { name: string };
};

function topCounts(
  values: { label: string; at: Date }[],
  take = 5
): { label: string; count: number; lastAt: Date }[] {
  const map = new Map<string, { count: number; lastAt: Date }>();

  for (const v of values) {
    const prev = map.get(v.label);
    if (!prev) {
      map.set(v.label, { count: 1, lastAt: v.at });
    } else {
      map.set(v.label, {
        count: prev.count + 1,
        lastAt: prev.lastAt > v.at ? prev.lastAt : v.at,
      });
    }
  }

  return Array.from(map.entries())
    .map(([label, meta]) => ({ label, count: meta.count, lastAt: meta.lastAt }))
    .sort(
      (a, b) => b.count - a.count || b.lastAt.getTime() - a.lastAt.getTime()
    )
    .slice(0, take);
}

export default async function DashboardSavedPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/saved");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/saved");

  const profile = {
    name: (session.user?.name ?? "").trim(),
    email: (session.user?.email ?? "").trim(),
  };

  const bookings: HistoryBooking[] = await db.booking.findMany({
    where: {
      userId,
      status: { not: "DRAFT" },
    },
    orderBy: { pickupAt: "desc" },
    take: 250,
    select: {
      pickupAddress: true,
      dropoffAddress: true,
      pickupAt: true,
      passengers: true,
      luggage: true,
      specialRequests: true,
      status: true,
      vehicle: { select: { name: true } },
      serviceType: { select: { name: true } },
    },
  });

  const frequentPickups = topCounts(
    bookings.map((b) => ({ label: b.pickupAddress, at: b.pickupAt })),
    5
  );

  const frequentDropoffs = topCounts(
    bookings.map((b) => ({ label: b.dropoffAddress, at: b.pickupAt })),
    5
  );

  const frequentRoutes = topCounts(
    bookings.map((b) => ({
      label: `${b.pickupAddress} → ${b.dropoffAddress}`,
      at: b.pickupAt,
    })),
    5
  );

  const lastTrip = bookings[0] ?? null;

  const lastUsed = lastTrip
    ? {
        service: lastTrip.serviceType?.name ?? null,
        vehicle: lastTrip.vehicle?.name ?? null,
        passengers: lastTrip.passengers,
        luggage: lastTrip.luggage,
        specialRequests: lastTrip.specialRequests,
        pickupAt: lastTrip.pickupAt,
        pickupAddress: lastTrip.pickupAddress,
        dropoffAddress: lastTrip.dropoffAddress,
      }
    : null;

  return (
    <section className={styles.container}>
      <DashboardSavedDetails
        profile={profile}
        frequentPickups={frequentPickups}
        frequentDropoffs={frequentDropoffs}
        frequentRoutes={frequentRoutes}
        lastUsed={lastUsed}
      />
    </section>
  );
}
