/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./NotificationsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardNotifications from "@/components/Dashboard/DashboardNotifications/DashboardNotifications";
import { BookingStatus, PaymentStatus } from "@prisma/client";

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
  tag: "Trip update" | "Payment";
};

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

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Trip pending review";
    case "PENDING_PAYMENT":
      return "Payment needed to confirm your trip";
    case "CONFIRMED":
      return "Trip confirmed";
    case "ASSIGNED":
      return "Driver assigned";
    case "EN_ROUTE":
      return "Driver en route";
    case "ARRIVED":
      return "Driver arrived";
    case "IN_PROGRESS":
      return "Trip in progress";
    case "COMPLETED":
      return "Trip completed";
    case "CANCELLED":
      return "Trip cancelled";
    case "NO_SHOW":
      return "Marked as no-show";
    case "REFUNDED":
      return "Trip refunded";
    case "PARTIALLY_REFUNDED":
      return "Trip partially refunded";
    case "DRAFT":
      return "Draft saved";
    default:
      return status;
  }
}

function paymentTitle(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "Payment received";
    case "FAILED":
      return "Payment failed";
    case "REFUNDED":
      return "Payment refunded";
    case "PARTIALLY_REFUNDED":
      return "Payment partially refunded";
    case "PENDING":
      return "Payment pending";
    case "NONE":
    default:
      return "Payment not completed";
  }
}

export default async function DashboardNotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/notifications");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/notifications");

  const roles = getRoles(session);
  const viewerRole = derivePrimaryRole(roles);

  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  const isUser = roles.includes("USER");

  // Scope:
  // - ADMIN: all notifications
  // - DRIVER: assigned bookings
  // - USER: owned bookings
  // - DRIVER+USER: assigned OR owned
  const bookingScopeWhere = isAdmin
    ? {}
    : isDriver && isUser
      ? {
          OR: [{ userId }, { assignment: { driverId: userId } }],
        }
      : isDriver
        ? { assignment: { driverId: userId } }
        : { userId };

  // Where should "View trip" go?
  // - USER: /dashboard/trips/[id]
  // - DRIVER/ADMIN: /driver-dashboard/trips/[id]
  const tripBase =
    viewerRole === "DRIVER" || viewerRole === "ADMIN"
      ? "/driver-dashboard/trips"
      : "/dashboard/trips";

  const [statusEvents, payments] = await Promise.all([
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
            status: true,
          },
        },
      },
    }),

    db.payment.findMany({
      where: { booking: bookingScopeWhere },
      orderBy: { updatedAt: "desc" },
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
      },
    }),
  ]);

  const statusItems: NotificationItem[] = statusEvents.map((e) => {
    const href = `${tripBase}/${e.booking.id}`;
    return {
      id: `se_${e.id}`,
      createdAt: e.createdAt.toISOString(),
      title: statusLabel(e.status),
      subtitle: `${e.booking.pickupAddress} → ${e.booking.dropoffAddress}`,
      bookingId: e.booking.id,
      bookingHref: href,
      links: [{ label: "View trip", href }],
      tag: "Trip update",
    };
  });

  const paymentItems: NotificationItem[] = payments.map((p) => {
    const occurredAt = (p.paidAt ?? p.updatedAt).toISOString();

    const href = `${tripBase}/${p.booking.id}`;

    const links: { label: string; href: string }[] = [
      { label: "View trip", href },
    ];

    // Helpful links
    if (p.receiptUrl)
      links.unshift({ label: "Open receipt", href: p.receiptUrl });
    if (
      p.checkoutUrl &&
      (p.status === "NONE" || p.status === "PENDING" || p.status === "FAILED")
    ) {
      links.unshift({ label: "Continue checkout", href: p.checkoutUrl });
    }

    return {
      id: `pay_${p.id}_${p.status}_${occurredAt}`,
      createdAt: occurredAt,
      title: paymentTitle(p.status),
      subtitle: `${p.booking.pickupAddress} → ${p.booking.dropoffAddress}`,
      bookingId: p.booking.id,
      bookingHref: href,
      links,
      tag: "Payment",
    };
  });

  const items = [...statusItems, ...paymentItems]
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
