/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./TripDetailsPage.module.css";
import { auth } from "../../../../../auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import TripDetails from "@/components/Dashboard/TripDetails/TripDetails";

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
  const idFromSession =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  const rolesFromSession = normalizeRoles(session?.user?.roles);

  if (idFromSession) {
    // If session already has roles, we’re done
    if (rolesFromSession.length)
      return { userId: idFromSession, roles: rolesFromSession };

    // Otherwise, pull roles from DB (avoids stale token issues)
    const u = await db.user.findUnique({
      where: { id: idFromSession },
      select: { id: true, roles: true },
    });

    if (u?.id) return { userId: u.id, roles: normalizeRoles(u.roles) };
  }

  // Last fallback: resolve by email
  const email = session?.user?.email ?? null;
  if (!email) throw new Error("Missing identity");

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, roles: true },
  });

  if (!u?.id) throw new Error("User not found");

  return { userId: u.id, roles: normalizeRoles(u.roles) };
}

export default async function TripDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) redirect(`/login?next=/dashboard/trips/${params.id}`);

  let viewer: { userId: string; roles: AppRole[] };
  try {
    viewer = await resolveViewer(session);
  } catch {
    redirect(`/login?next=/dashboard/trips/${params.id}`);
  }

  const { userId, roles } = viewer;

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

  if (!allowed) {
    redirect(
      isAdmin || isDriver ? "/driver-dashboard/trips" : "/dashboard/trips"
    );
  }

  return (
    <section className={styles.container}>
      <TripDetails booking={booking} />
    </section>
  );
}
