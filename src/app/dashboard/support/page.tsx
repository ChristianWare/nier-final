/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./SupportPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardSupport from "@/components/Dashboard/DashboardSupport/DashboardSupport";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function normalizeRoles(roles: any): AppRole[] {
  return Array.isArray(roles) && roles.length > 0
    ? (roles as AppRole[])
    : (["USER"] as AppRole[]);
}

function primaryFromRoles(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("DRIVER")) return "DRIVER";
  return "USER";
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

export default async function DashboardSupportPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/support");

  let viewer: { userId: string; roles: AppRole[] };
  try {
    viewer = await resolveViewer(session);
  } catch {
    redirect("/login?next=/dashboard/support");
  }

  const { userId, roles } = viewer;

  const viewerRole = primaryFromRoles(roles);

  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  const isUser = roles.includes("USER");

  // Show “relevant trips” in the selector:
  // - ADMIN: latest bookings
  // - DRIVER: assigned bookings
  // - USER: bookings they own
  // - DRIVER + USER: union of both (assigned + owned)
  const where: any = isAdmin
    ? {}
    : isDriver && isUser
      ? { OR: [{ userId }, { assignment: { driverId: userId } }] }
      : isDriver
        ? { assignment: { driverId: userId } }
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
        viewerRole={viewerRole}
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
