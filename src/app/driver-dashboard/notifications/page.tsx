/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./NotificationsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardNotifications from "@/components/Dashboard/DashboardNotifications/DashboardNotifications";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

type NotificationItem = {
  id: string;
  createdAt: string; // ISO
  title: string;
  subtitle: string;
  bookingId: string;
  bookingHref: string;
  links: { label: string; href: string }[];
  tag: "Trip update"; // driver page = no payments
};

function getRoles(session: any): AppRole[] {
  const roles = session?.user?.roles;
  if (Array.isArray(roles) && roles.length > 0) return roles as AppRole[];

  const role = session?.user?.role;
  return role ? ([role] as AppRole[]) : (["USER"] as AppRole[]);
}

async function resolveUserId(session: any) {
  const standardizedUserId = session?.user?.userId ?? null;
  if (standardizedUserId) return standardizedUserId;

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

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "ASSIGNED":
      return "Trip assigned";
    case "EN_ROUTE":
      return "Marked en route";
    case "ARRIVED":
      return "Marked arrived";
    case "IN_PROGRESS":
      return "Trip in progress";
    case "COMPLETED":
      return "Trip completed";
    case "CANCELLED":
      return "Trip cancelled";
    case "NO_SHOW":
      return "Marked as no-show";
    case "PENDING_REVIEW":
      return "Trip pending review";
    case "PENDING_PAYMENT":
      return "Awaiting customer payment";
    case "CONFIRMED":
      return "Trip confirmed";
    case "REFUNDED":
      return "Trip refunded";
    case "PARTIALLY_REFUNDED":
      return "Trip partially refunded";
    case "DRAFT":
      return "Draft saved";
    default:
      return String(status).replaceAll("_", " ");
  }
}

export default async function DriverNotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/notifications");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/driver-dashboard/notifications");

  const roles = getRoles(session);
  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");

  if (!isAdmin && !isDriver) redirect("/");

  // Scope:
  // - ADMIN: all status events
  // - DRIVER: only assigned bookings
  const bookingScopeWhere = isAdmin ? {} : { assignment: { driverId: userId } };

  const tripBase = "/driver-dashboard/trips";

  // Heuristics window for “details changed” / “missing notes”
  const now = new Date();
  const recentSince = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [statusEvents, recentlyUpdatedTrips, missingNotesTrips] =
    await Promise.all([
      db.bookingStatusEvent.findMany({
        where: { booking: bookingScopeWhere },
        orderBy: { createdAt: "desc" },
        take: 60,
        include: {
          booking: {
            select: {
              id: true,
              pickupAddress: true,
              dropoffAddress: true,
            },
          },
          createdBy: { select: { name: true } },
        },
      }),

      // catches pickup time/address/notes edits even if no status event was created
      db.booking.findMany({
        where: {
          ...bookingScopeWhere,
          updatedAt: { gte: recentSince },
          status: {
            notIn: [
              "COMPLETED",
              "CANCELLED",
              "REFUNDED",
              "PARTIALLY_REFUNDED",
              "NO_SHOW",
            ],
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
          id: true,
          updatedAt: true,
          pickupAddress: true,
          dropoffAddress: true,
        },
      }),

      // driver-only attention signal
      db.booking.findMany({
        where: {
          ...bookingScopeWhere,
          status: {
            notIn: [
              "COMPLETED",
              "CANCELLED",
              "REFUNDED",
              "PARTIALLY_REFUNDED",
              "NO_SHOW",
            ],
          },
          AND: [{ internalNotes: null }, { specialRequests: null }],
        },
        orderBy: { pickupAt: "asc" },
        take: 20,
        select: {
          id: true,
          pickupAt: true,
          pickupAddress: true,
          dropoffAddress: true,
        },
      }),
    ]);

  const statusItems: NotificationItem[] = statusEvents.map((e) => {
    const href = `${tripBase}/${e.booking.id}`;
    return {
      id: `se_${e.id}`,
      createdAt: e.createdAt.toISOString(),
      title: statusLabel(e.status),
      subtitle: `${e.createdBy?.name ?? "Dispatch"} • ${e.booking.pickupAddress} → ${e.booking.dropoffAddress}`,
      bookingId: e.booking.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Trip update",
    };
  });

  const updatedItems: NotificationItem[] = recentlyUpdatedTrips.map((t) => {
    const href = `${tripBase}/${t.id}`;
    return {
      id: `upd_${t.id}_${t.updatedAt.toISOString()}`,
      createdAt: t.updatedAt.toISOString(),
      title: "Trip details updated",
      subtitle: `${t.pickupAddress} → ${t.dropoffAddress}`,
      bookingId: t.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Trip update",
    };
  });

  const missingNotesItems: NotificationItem[] = missingNotesTrips.map((t) => {
    const href = `${tripBase}/${t.id}`;
    return {
      id: `mn_${t.id}`,
      createdAt: new Date(t.pickupAt).toISOString(),
      title: "Missing trip notes",
      subtitle: `${t.pickupAddress} → ${t.dropoffAddress}`,
      bookingId: t.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Trip update",
    };
  });

  // Dedupe (same booking update can appear multiple times)
  const map = new Map<string, NotificationItem>();
  [...statusItems, ...updatedItems, ...missingNotesItems].forEach((x) => {
    // de-dupe by (bookingId + title) keeping newest
    const k = `${x.bookingId}_${x.title}`;
    const existing = map.get(k);
    if (!existing) map.set(k, x);
    else if (
      new Date(x.createdAt).getTime() > new Date(existing.createdAt).getTime()
    ) {
      map.set(k, x);
    }
  });

  const items = Array.from(map.values())
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 80);

  return (
    <section className={styles.container}>
      <DashboardNotifications items={items} />
    </section>
  );
}
