/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./SupportPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardSupport from "@/components/Dashboard/DashboardSupport/DashboardSupport";
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

export default async function DashboardSupportPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/support");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/support");

  const role = session.user?.role;

  // Show “relevant trips” in the selector:
  // - USER: bookings they own
  // - DRIVER: bookings assigned to them
  // - ADMIN: latest bookings (helpful when admin has no personal bookings)
  const where =
    role === "DRIVER"
      ? { assignment: { driverId: userId } }
      : role === "ADMIN"
        ? {}
        : { userId };

  const trips = await db.booking.findMany({
    where,
    orderBy: { pickupAt: "desc" },
    take: 60,
    select: {
      id: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      status: true,
      totalCents: true,
      currency: true,
      serviceType: { select: { name: true } },
    },
  });

  return (
    <section className={styles.container}>
      <DashboardSupport
        viewerRole={role ?? "USER"}
        user={{
          name: (session.user?.name ?? "").trim() || null,
          email: (session.user?.email ?? "").trim() || null,
        }}
        trips={trips.map((t) => ({
          id: t.id,
          pickupAt: t.pickupAt.toISOString(),
          pickupAddress: t.pickupAddress,
          dropoffAddress: t.dropoffAddress,
          status: t.status as BookingStatus,
          totalCents: t.totalCents,
          currency: t.currency,
          serviceName: t.serviceType?.name ?? "Service",
        }))}
      />
    </section>
  );
}
