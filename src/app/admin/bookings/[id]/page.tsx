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
    where: { role: "DRIVER" },
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
    <section style={{ display: "grid", gap: 16, maxWidth: 980 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Booking</h1>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
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
          <div style={{ opacity: 0.75 }}>
            No drivers yet. Create users and assign DRIVER role in{" "}
            <a href='/admin/users'>Users</a>.
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
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            Payment status: <strong>{booking.payment?.status ?? "NONE"}</strong>
          </div>
          <SendPaymentLinkButton bookingId={booking.id} />
          {booking.payment?.checkoutUrl ? (
            <div
              style={{ fontSize: 12, opacity: 0.75, wordBreak: "break-all" }}
            >
              Latest checkout URL: {booking.payment.checkoutUrl}
            </div>
          ) : null}
        </div>
      </Card>

      <Card title='Status events'>
        {booking.statusEvents.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No events yet.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {booking.statusEvents.map((e) => (
              <li key={e.id} style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>{e.status}</span>{" "}
                <span style={{ opacity: 0.7, fontSize: 12 }}>
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
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 10,
        padding: "6px 0",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.65 }}>{k}</div>
      <div style={{ fontSize: 13 }}>{v}</div>
    </div>
  );
}
