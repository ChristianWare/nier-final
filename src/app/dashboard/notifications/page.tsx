/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./NotificationsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardNotifications from "@/components/Dashboard/DashboardNotifications/DashboardNotifications";
import { BookingStatus, PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const role = session.user?.role;

  // Scope:
  // - DRIVER: notifications for bookings assigned to them
  // - USER/ADMIN: notifications for bookings owned by them
  const bookingScopeWhere =
    role === "DRIVER" ? { assignment: { driverId: userId } } : { userId };

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

  const statusItems: NotificationItem[] = statusEvents.map((e) => ({
    id: `se_${e.id}`,
    createdAt: e.createdAt.toISOString(),
    title: statusLabel(e.status),
    subtitle: `${e.booking.pickupAddress} → ${e.booking.dropoffAddress}`,
    bookingId: e.booking.id,
    bookingHref: `/dashboard/trips/${e.booking.id}`,
    links: [{ label: "View trip", href: `/dashboard/trips/${e.booking.id}` }],
    tag: "Trip update",
  }));

  const paymentItems: NotificationItem[] = payments.map((p) => {
    const occurredAt = (p.paidAt ?? p.updatedAt).toISOString();

    const links: { label: string; href: string }[] = [
      { label: "View trip", href: `/dashboard/trips/${p.booking.id}` },
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
      bookingHref: `/dashboard/trips/${p.booking.id}`,
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
