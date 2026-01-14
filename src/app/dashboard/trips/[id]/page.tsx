/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./TripDetailsPage.module.css";
import { auth } from "../../../../../auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import TripDetails from "@/components/Dashboard/TripDetails/TripDetails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function normalizeRoles(input: any): AppRole[] {
  if (Array.isArray(input)) {
    return input.filter(Boolean) as AppRole[];
  }
  if (typeof input === "string" && input.trim()) {
    return [input as AppRole];
  }
  return [];
}

async function resolveViewer(
  session: any
): Promise<{ userId: string; roles: AppRole[] }> {
  const idFromSession =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  const rolesFromSession = normalizeRoles(
    session?.user?.roles ?? session?.user?.role
  );

  if (idFromSession) {
    if (rolesFromSession.length)
      return { userId: idFromSession, roles: rolesFromSession };

    const u = await db.user.findUnique({
      where: { id: idFromSession },
      select: { id: true, roles: true },
    });

    if (u?.id) {
      const roles = normalizeRoles(u.roles);
      return {
        userId: u.id,
        roles: roles.length ? roles : (["USER"] as AppRole[]),
      };
    }
  }

  const email = session?.user?.email ?? null;
  if (!email) throw new Error("Missing identity");

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, roles: true },
  });

  if (!u?.id) throw new Error("User not found");

  const roles = normalizeRoles(u.roles);
  return {
    userId: u.id,
    roles: roles.length ? roles : (["USER"] as AppRole[]),
  };
}

export default async function TripDetailsPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const session = await auth();
  if (!session)
    redirect(`/login?next=${encodeURIComponent(`/dashboard/trips/${id}`)}`);

  let viewer: { userId: string; roles: AppRole[] };
  try {
    viewer = await resolveViewer(session);
  } catch {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/trips/${id}`)}`);
  }

  const { userId, roles } = viewer;

  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  const isUser = roles.includes("USER");

  const booking = await db.booking.findUnique({
    where: { id },
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
