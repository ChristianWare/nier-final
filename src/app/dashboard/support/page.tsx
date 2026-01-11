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

function getRoles(session: any): AppRole[] {
  const roles = session?.user?.roles;
  if (Array.isArray(roles) && roles.length > 0) return roles as AppRole[];

  const role = session?.user?.role;
  return role ? ([role] as AppRole[]) : (["USER"] as AppRole[]);
}

function derivePrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("DRIVER")) return "DRIVER";
  return "USER";
}

async function resolveUserId(session: any) {
  // Prefer standardized field from your auth.ts
  const standardizedUserId = session?.user?.userId ?? null;
  if (standardizedUserId) return standardizedUserId;

  // Fallbacks (older session shapes)
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

  const roles = getRoles(session);
  const viewerRole = derivePrimaryRole(roles);

  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  const isUser = roles.includes("USER");

  // Show “relevant trips” in the selector:
  // - ADMIN: latest bookings
  // - DRIVER: assigned bookings
  // - USER: bookings they own
  // - DRIVER + USER: union of both (assigned + owned)
  const where = isAdmin
    ? {}
    : isDriver && isUser
      ? {
          OR: [{ userId }, { assignment: { driverId: userId } }],
        }
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
