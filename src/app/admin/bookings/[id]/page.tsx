import styles from "./AdminBookingDetailPage.module.css";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ApprovePriceForm from "@/components/admin/ApprovePriceForm/ApprovePriceForm";
import AssignBookingForm from "@/components/admin/AssignBookingForm/AssignBookingForm";
import SendPaymentLinkButton from "@/components/admin/SendPaymentLinkButton/SendPaymentLinkButton";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- shared-ish label helpers (matches the spirit of AdminActivityFeed kindLabel) ---
function statusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "PENDING_PAYMENT":
      return "Payment due";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Driver assigned";
    case "EN_ROUTE":
      return "Driver en route";
    case "ARRIVED":
      return "Driver arrived";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

function badgeTone(status: BookingStatus): BadgeTone {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  if (status === "COMPLETED") return "good";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  return "neutral";
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: true,
      serviceType: true,
      vehicle: true,
      payment: true,
      assignment: {
        include: {
          driver: { select: { id: true, name: true, email: true } },
          vehicleUnit: { select: { id: true, name: true, plate: true } },
        },
      },
      statusEvents: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!booking) return notFound();

  const drivers = await db.user.findMany({
    where: { roles: { has: "DRIVER" } },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const vehicleUnits = await db.vehicleUnit.findMany({
    where: {
      active: true,
      ...(booking.vehicleId ? { categoryId: booking.vehicleId } : {}),
    },
    select: { id: true, name: true, plate: true },
    orderBy: { name: "asc" },
    take: 300,
  });

  return (
    <section className='container'>
      <header className='header'>
        <h1 className={`heading h2`}>Booking Details</h1>

        <div className={styles.box}>
          <div className='emptyTitle'>Booking ID:</div>
          <p className='emptySmall'>{booking.id}</p>
        </div>
      </header>

      <Card title='Trip'>
        <KeyVal
          k='Customer'
          v={`${booking.user.name ?? "—"} (${booking.user.email})`}
        />
        <KeyVal k='Service' v={booking.serviceType.name} />
        <KeyVal k='Vehicle category' v={booking.vehicle?.name ?? "—"} />
        <KeyVal k='Pickup at' v={booking.pickupAt.toLocaleString()} />
        <KeyVal k='Pickup' v={booking.pickupAddress} />
        <KeyVal k='Dropoff' v={booking.dropoffAddress} />
        <KeyVal
          k='Passengers / luggage'
          v={`${booking.passengers} / ${booking.luggage}`}
        />
        <KeyVal
          k='Distance / duration'
          v={`${booking.distanceMiles ?? "—"} mi • ${
            booking.durationMinutes ?? "—"
          } min`}
        />
        {booking.specialRequests ? (
          <KeyVal k='Special requests' v={booking.specialRequests} />
        ) : null}
      </Card>

      <Card title='Assign (allowed before payment)'>
        {drivers.length === 0 ? (
          <div className={styles.muted}>
            No drivers yet. Create users and assign DRIVER role in{" "}
            <a className={styles.inlineLink} href='/admin/users'>
              Users
            </a>
            .
          </div>
        ) : (
          <AssignBookingForm
            bookingId={booking.id}
            drivers={drivers}
            vehicleUnits={vehicleUnits}
            currentDriverId={booking.assignment?.driverId ?? null}
            currentVehicleUnitId={booking.assignment?.vehicleUnitId ?? null}
          />
        )}
      </Card>

      <Card title='Approve & price'>
        <ApprovePriceForm
          bookingId={booking.id}
          currency={booking.currency}
          subtotalCents={booking.subtotalCents}
          feesCents={booking.feesCents}
          taxesCents={booking.taxesCents}
          totalCents={booking.totalCents}
        />
      </Card>

      <Card title='Payment link'>
        <div className={styles.paymentBlock}>
          <div className={styles.paymentStatus}>
            Payment status: <strong>{booking.payment?.status ?? "NONE"}</strong>
          </div>
          <SendPaymentLinkButton bookingId={booking.id} />
          {booking.payment?.checkoutUrl ? (
            <div className={styles.checkoutUrl}>
              Latest checkout URL: {booking.payment.checkoutUrl}
            </div>
          ) : null}
        </div>
      </Card>

      {/* ✅ Updated: friendly label + badge tone, similar to AdminActivityFeed */}
      <Card title='Status events'>
        {booking.statusEvents.length === 0 ? (
          <div className={styles.muted}>No events yet.</div>
        ) : (
          <ul className={styles.eventsList}>
            {booking.statusEvents.map((e) => {
              const tone = badgeTone(e.status as BookingStatus);
              const label = statusLabel(e.status as BookingStatus);

              return (
                <li key={e.id} className={styles.eventItem}>
                  <div className={styles.eventLeft}>
                    <span className={`badge badge_${tone}`}>{label}</span>
                  </div>
                  <p className='val'>{formatDateTime(new Date(e.createdAt))}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className='cardTitle h4'>{title}</div>
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <div className='emptyTitleSmall'>{k}</div>
      <div className='val'>{v}</div>
    </div>
  );
}
