/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./TripDetailsPage.module.css";
import { auth } from "../../../../../auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import TripDetails from "@/components/Dashboard/TripDetails/TripDetails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getRoles(session: any): AppRole[] {
  const roles = session?.user?.roles;
  if (Array.isArray(roles) && roles.length > 0) return roles as AppRole[];

  const role = session?.user?.role;
  return role ? ([role] as AppRole[]) : (["USER"] as AppRole[]);
}

async function resolveUserId(session: any) {
  // Prefer standardized field from your auth.ts
  const standardizedUserId = session?.user?.userId ?? null;
  if (standardizedUserId) return standardizedUserId;

  // Fallback older session shapes
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

  const userId = await resolveUserId(session);
  if (!userId) redirect(`/login?next=/dashboard/trips/${params.id}`);

  const roles = getRoles(session);
  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  const isUser = roles.includes("USER");

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

  const isOwner = booking.userId === userId;
  const isAssignedDriver = Boolean(
    booking.assignment && booking.assignment.driverId === userId
  );

  // ✅ Access control:
  // - ADMIN: any booking
  // - DRIVER: assigned bookings
  // - USER: own bookings
  // - DRIVER + USER: union of both (assigned OR own)
  const allowed =
    isAdmin || (isDriver && isAssignedDriver) || (isUser && isOwner);

  if (!allowed) redirect("/dashboard/trips");

  return (
    <section className={styles.container}>
      <TripDetails booking={booking} />
    </section>
  );
}
