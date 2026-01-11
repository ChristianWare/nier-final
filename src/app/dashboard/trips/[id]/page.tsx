/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./TripDetailsPage.module.css";
import { auth } from "../../../../../auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import TripDetails from "@/components/Dashboard/TripDetails/TripDetails";

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

export default async function TripDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) redirect(`/login?next=/dashboard/trips/${params.id}`);

  const role = session.user?.role;
  const userId = await resolveUserId(session);
  if (!userId) redirect(`/login?next=/dashboard/trips/${params.id}`);

  const booking = await db.booking.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      serviceType: {
        select: { name: true, slug: true, pricingStrategy: true },
      },
      vehicle: { select: { name: true } },
      addons: true,
      payment: true,
      assignment: {
        include: {
          driver: { select: { id: true, name: true, email: true } },
          vehicleUnit: { select: { name: true, plate: true } },
        },
      },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!booking) notFound();

  // ✅ Access control:
  // - ADMIN: can view any booking
  // - DRIVER: can view only assigned bookings
  // - USER: can view only their own bookings
  const isAdmin = role === "ADMIN";
  const isDriver = role === "DRIVER";
  const isOwner = booking.userId === userId;
  const isAssignedDriver = Boolean(
    booking.assignment && booking.assignment.driverId === userId
  );

  const allowed =
    isAdmin || (isDriver && isAssignedDriver) || (!isDriver && isOwner);
  if (!allowed) redirect("/dashboard/trips");

  return (
    <section className={styles.container}>
      <TripDetails booking={booking} />
    </section>
  );
}
