import styles from "./AdminBookingDetailPage.module.css";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ApprovePriceForm from "@/components/admin/ApprovePriceForm/ApprovePriceForm";
import AssignBookingForm from "@/components/admin/AssignBookingForm/AssignBookingForm";
import SendPaymentLinkButton from "@/components/admin/SendPaymentLinkButton/SendPaymentLinkButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Booking</h1>
        <div className={styles.meta}>
          ID: {booking.id} • Status: <strong>{booking.status}</strong>
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
          v={`${booking.distanceMiles ?? "—"} mi • ${booking.durationMinutes ?? "—"} min`}
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

      <Card title='Status events'>
        {booking.statusEvents.length === 0 ? (
          <div className={styles.muted}>No events yet.</div>
        ) : (
          <ul className={styles.eventsList}>
            {booking.statusEvents.map((e) => (
              <li key={e.id} className={styles.eventItem}>
                <span className={styles.eventStatus}>{e.status}</span>{" "}
                <span className={styles.eventTime}>
                  — {new Date(e.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
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
      <div className={styles.cardTitle}>{title}</div>
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <div className={styles.key}>{k}</div>
      <div className={styles.val}>{v}</div>
    </div>
  );
}
