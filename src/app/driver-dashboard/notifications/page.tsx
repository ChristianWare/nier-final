/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./NotificationsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
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
  tag: "Trip update" | "New assignment" | "Reminder" | "Payment";
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

function formatPickupTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
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

  const { timezone: companyTz } = await getCompanySettings();

  // Scope:
  // - ADMIN: all status events
  // - DRIVER: only assigned bookings
  const bookingScopeWhere = isAdmin ? {} : { assignment: { driverId: userId } };

  const tripBase = "/driver-dashboard/trips";

  // Time windows
  const now = new Date();
  const recentSince = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
  const assignmentsSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const upcomingWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24 hours
  const soonWindow = new Date(now.getTime() + 3 * 60 * 60 * 1000); // next 3 hours

  const [
    statusEvents,
    recentAssignments,
    recentlyUpdatedTrips,
    upcomingTrips,
    tripsStartingSoon,
  ] = await Promise.all([
    // Status change events
    db.bookingStatusEvent.findMany({
      where: { booking: bookingScopeWhere },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
          },
        },
        createdBy: { select: { name: true } },
      },
    }),

    // NEW: Recent assignments to this driver
    db.assignment.findMany({
      where: {
        driverId: userId,
        assignedAt: { gte: assignmentsSince },
        booking: {
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
      },
      orderBy: { assignedAt: "desc" },
      take: 30,
      include: {
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            user: { select: { name: true } },
            guestName: true,
            serviceType: { select: { name: true } },
          },
        },
        assignedBy: { select: { name: true } },
        vehicleUnit: { select: { name: true } },
      },
    }),

    // Trip details updated (catches pickup time/address/notes edits)
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
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        serviceType: { select: { name: true } },
      },
    }),

    // NEW: Upcoming trips within 24 hours (reminders)
    db.booking.findMany({
      where: {
        ...bookingScopeWhere,
        pickupAt: { gte: now, lte: upcomingWindow },
        status: {
          notIn: [
            "COMPLETED",
            "CANCELLED",
            "REFUNDED",
            "PARTIALLY_REFUNDED",
            "NO_SHOW",
            "IN_PROGRESS",
          ],
        },
      },
      orderBy: { pickupAt: "asc" },
      take: 20,
      select: {
        id: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        user: { select: { name: true } },
        guestName: true,
        serviceType: { select: { name: true } },
        assignment: {
          select: { driverPaymentCents: true },
        },
      },
    }),

    // NEW: Trips starting very soon (urgent reminders)
    db.booking.findMany({
      where: {
        ...bookingScopeWhere,
        pickupAt: { gte: now, lte: soonWindow },
        status: {
          notIn: [
            "COMPLETED",
            "CANCELLED",
            "REFUNDED",
            "PARTIALLY_REFUNDED",
            "NO_SHOW",
            "IN_PROGRESS",
            "EN_ROUTE",
            "ARRIVED",
          ],
        },
      },
      orderBy: { pickupAt: "asc" },
      take: 10,
      select: {
        id: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        user: { select: { name: true } },
        guestName: true,
        serviceType: { select: { name: true } },
      },
    }),
  ]);

  // Transform status events
  const statusItems: NotificationItem[] = statusEvents.map((e) => {
    const href = `${tripBase}/${e.booking.id}`;
    return {
      id: `se_${e.id}`,
      createdAt: e.createdAt.toISOString(),
      title: statusLabel(e.status),
      subtitle: `${e.createdBy?.name ?? "Dispatch"} • ${shortAddress(e.booking.pickupAddress)} → ${shortAddress(e.booking.dropoffAddress)}`,
      bookingId: e.booking.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Trip update",
    };
  });

  // NEW: Transform assignments into notifications
  const assignmentItems: NotificationItem[] = recentAssignments.map((a) => {
    const href = `${tripBase}/${a.booking.id}`;
    const customerName =
      a.booking.user?.name?.trim() || a.booking.guestName?.trim() || "Customer";
    const vehicleInfo = a.vehicleUnit?.name
      ? ` • Vehicle: ${a.vehicleUnit.name}`
      : "";

    return {
      id: `assign_${a.id}`,
      createdAt: a.assignedAt.toISOString(),
      title: "New ride assigned to you",
      subtitle: `${customerName} • ${a.booking.serviceType?.name ?? "Trip"} • ${formatPickupTime(a.booking.pickupAt, companyTz)}${vehicleInfo}`,
      bookingId: a.booking.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "New assignment",
    };
  });

  // Transform updated trips
  const updatedItems: NotificationItem[] = recentlyUpdatedTrips.map((t) => {
    const href = `${tripBase}/${t.id}`;
    return {
      id: `upd_${t.id}_${t.updatedAt.toISOString()}`,
      createdAt: t.updatedAt.toISOString(),
      title: "Trip details updated",
      subtitle: `${t.serviceType?.name ?? "Trip"} • ${shortAddress(t.pickupAddress)} → ${shortAddress(t.dropoffAddress)} • Pickup: ${formatPickupTime(t.pickupAt, companyTz)}`,
      bookingId: t.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Trip update",
    };
  });

  // NEW: Transform upcoming trips into reminders
  const upcomingItems: NotificationItem[] = upcomingTrips.map((t) => {
    const href = `${tripBase}/${t.id}`;
    const customerName =
      t.user?.name?.trim() || t.guestName?.trim() || "Customer";
    const driverPay = t.assignment?.driverPaymentCents ?? 0;
    const payInfo = driverPay > 0 ? ` • ${formatMoney(driverPay)}` : "";

    // Calculate hours until pickup
    const hoursUntil = Math.round(
      (new Date(t.pickupAt).getTime() - now.getTime()) / (1000 * 60 * 60),
    );
    const timeLabel =
      hoursUntil <= 1 ? "Starting soon" : `In ${hoursUntil} hours`;

    return {
      id: `upcoming_${t.id}`,
      createdAt: new Date(
        now.getTime() - (24 - hoursUntil) * 60 * 60 * 1000,
      ).toISOString(), // Sort by proximity
      title: `Upcoming trip - ${timeLabel}`,
      subtitle: `${customerName} • ${t.serviceType?.name ?? "Trip"} • ${formatPickupTime(t.pickupAt, companyTz)}${payInfo}`,
      bookingId: t.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Reminder",
    };
  });

  // NEW: Transform trips starting soon into urgent reminders
  const soonItems: NotificationItem[] = tripsStartingSoon.map((t) => {
    const href = `${tripBase}/${t.id}`;
    const customerName =
      t.user?.name?.trim() || t.guestName?.trim() || "Customer";

    // Calculate minutes until pickup
    const minutesUntil = Math.round(
      (new Date(t.pickupAt).getTime() - now.getTime()) / (1000 * 60),
    );
    const timeLabel =
      minutesUntil <= 30
        ? `Starting in ${minutesUntil} min`
        : `Starting in ${Math.round(minutesUntil / 60)} hours`;

    return {
      id: `soon_${t.id}`,
      createdAt: now.toISOString(), // Show at top
      title: `🚨 ${timeLabel}`,
      subtitle: `${customerName} • ${shortAddress(t.pickupAddress)} → ${shortAddress(t.dropoffAddress)}`,
      bookingId: t.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Reminder",
    };
  });

  // Combine all items
  const allItems = [
    ...soonItems, // Urgent items first
    ...assignmentItems,
    ...statusItems,
    ...updatedItems,
    ...upcomingItems,
  ];

  // Dedupe (same booking can appear multiple times)
  const map = new Map<string, NotificationItem>();
  allItems.forEach((x) => {
    // Priority: soon > assignment > status > updated > upcoming
    const priorityMap: Record<string, number> = {
      Reminder: x.title.includes("🚨") ? 5 : 1,
      "New assignment": 4,
      "Trip update": 3,
      Payment: 2,
    };

    const k = `${x.bookingId}_${x.tag}`;
    const existing = map.get(k);

    if (!existing) {
      map.set(k, x);
    } else {
      const existingPriority = priorityMap[existing.tag] ?? 0;
      const newPriority = priorityMap[x.tag] ?? 0;

      // Keep higher priority or newer item of same priority
      if (
        newPriority > existingPriority ||
        (newPriority === existingPriority &&
          new Date(x.createdAt).getTime() >
            new Date(existing.createdAt).getTime())
      ) {
        map.set(k, x);
      }
    }
  });

  const items = Array.from(map.values())
    .sort((a, b) => {
      // Urgent reminders (🚨) always first
      const aUrgent = a.title.includes("🚨") ? 1 : 0;
      const bUrgent = b.title.includes("🚨") ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;

      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 100);

  return (
    <section className={styles.container}>
      <DashboardNotifications items={items} />
    </section>
  );
}
