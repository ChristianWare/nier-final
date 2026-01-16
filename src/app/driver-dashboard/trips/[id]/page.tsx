/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import { updateDriverBookingStatus } from "../../../../../actions/driver-dashboard/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

const TERMINAL: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
  BookingStatus.NO_SHOW,
];

function normalizeRoles(roles: any): AppRole[] {
  return Array.isArray(roles) && roles.length > 0
    ? (roles as AppRole[])
    : (["USER"] as AppRole[]);
}

async function resolveViewer(
  session: any
): Promise<{ userId: string; roles: AppRole[] }> {
  const userId =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  const roles = normalizeRoles(session?.user?.roles);

  if (userId) {
    if (roles.length) return { userId, roles };
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: true },
    });
    if (u?.id) return { userId: u.id, roles: normalizeRoles(u.roles) };
  }

  const email = session?.user?.email ?? null;
  if (!email) throw new Error("Missing identity");
  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, roles: true },
  });
  if (!u?.id) throw new Error("User not found");
  return { userId: u.id, roles: normalizeRoles(u.roles) };
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatDateTime(dt: Date) {
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function bufferRecommendation(durationMinutes: number | null | undefined) {
  const mins = durationMinutes ?? 0;
  if (mins >= 90) return "Arrive 20–25 minutes early.";
  if (mins >= 45) return "Arrive 15–20 minutes early.";
  return "Arrive 10–15 minutes early.";
}

function nextActionOptions(status: BookingStatus) {
  if (TERMINAL.includes(status)) return [];

  if (
    status === "ASSIGNED" ||
    status === "CONFIRMED" ||
    status === "PENDING_REVIEW" ||
    status === "PENDING_PAYMENT"
  ) {
    return [{ label: "I’m en route", next: BookingStatus.EN_ROUTE }];
  }
  if (status === "EN_ROUTE") {
    return [{ label: "Arrived", next: BookingStatus.ARRIVED }];
  }
  if (status === "ARRIVED") {
    return [{ label: "Passenger onboard", next: BookingStatus.IN_PROGRESS }];
  }
  if (status === "IN_PROGRESS") {
    return [{ label: "Complete trip", next: BookingStatus.COMPLETED }];
  }

  return [];
}

export default async function DriverTripDetailsPage({
  params,
}: {
  params: { id?: string };
}) {
  const bookingId = params?.id;
  if (!bookingId) notFound();

  const session = await auth();
  if (!session) redirect(`/login?next=/driver-dashboard/trips/${bookingId}`);

  const { userId, roles } = await resolveViewer(session);
  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  if (!isAdmin && !isDriver) redirect("/");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      serviceType: {
        select: { name: true, slug: true, pricingStrategy: true },
      },
      vehicle: { select: { name: true } },
      addons: { select: { type: true, quantity: true, label: true } },
      payment: {
        select: { status: true, receiptUrl: true, checkoutUrl: true },
      },
      assignment: {
        include: {
          driver: { select: { id: true, name: true, email: true } },
          vehicleUnit: { select: { name: true, plate: true } },
        },
      },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 60,
        include: { createdBy: { select: { name: true } } },
      },
    },
  });

  if (!booking) notFound();

  const isAssignedDriver = Boolean(
    booking.assignment?.driverId && booking.assignment.driverId === userId
  );

  if (!isAdmin && !isAssignedDriver) redirect("/driver-dashboard/trips");

  const passengerName =
    booking.user?.name?.trim() ||
    booking.guestName?.trim() ||
    booking.user?.email ||
    booking.guestEmail ||
    "Passenger";

  const passengerEmail = booking.user?.email || booking.guestEmail || "—";
  const passengerPhone = booking.guestPhone || "—";

  const vehicleUnit = booking.assignment?.vehicleUnit
    ? `${booking.assignment.vehicleUnit.name}${
        booking.assignment.vehicleUnit.plate
          ? ` • ${booking.assignment.vehicleUnit.plate}`
          : ""
      }`
    : null;

  const actions = nextActionOptions(booking.status);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Trip details</h1>
          <p style={{ margin: 0, opacity: 0.75 }}>
            {formatDateTime(booking.pickupAt)} • {booking.pickupAddress} →{" "}
            {booking.dropoffAddress}
          </p>
        </div>

        <Link
          href='/driver-dashboard/trips'
          style={{ textDecoration: "none", fontWeight: 700 }}
        >
          ← Back to trips
        </Link>
      </header>

      <Card title='Core info'>
        <Row label='Pickup time' value={formatDateTime(booking.pickupAt)} />
        <Row
          label='Buffer'
          value={bufferRecommendation(booking.durationMinutes)}
        />
        <Row
          label='Pickup'
          value={
            <a
              href={mapsHref(booking.pickupAddress)}
              target='_blank'
              rel='noreferrer'
            >
              Open in Maps →
            </a>
          }
        />
        <Row
          label='Dropoff'
          value={
            <a
              href={mapsHref(booking.dropoffAddress)}
              target='_blank'
              rel='noreferrer'
            >
              Open in Maps →
            </a>
          }
        />
        <Row label='Service' value={booking.serviceType?.name ?? "Service"} />
        <Row
          label='Status'
          value={String(booking.status).replaceAll("_", " ")}
        />
      </Card>

      <Card title='Passenger'>
        <Row label='Name' value={passengerName} />
        <Row label='Email' value={passengerEmail} />
        <Row label='Phone' value={passengerPhone} />
      </Card>

      <Card title='Notes & instructions'>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Passenger notes
            </div>
            <div style={{ opacity: 0.85 }}>
              {booking.specialRequests?.trim() || "—"}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Dispatch notes
            </div>
            <div style={{ opacity: 0.85 }}>
              {booking.internalNotes?.trim() || "—"}
            </div>
          </div>

          {booking.addons?.length ? (
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Add-ons</div>
              <div style={{ opacity: 0.85 }}>
                {booking.addons
                  .map((a) => `${a.label ?? a.type} ×${a.quantity}`)
                  .join(", ")}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Card title='Vehicle'>
        <Row label='Category' value={booking.vehicle?.name ?? "—"} />
        <Row label='Unit' value={vehicleUnit ?? "TBD"} />
      </Card>

      <Card title='Job actions'>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {actions.length === 0 ? (
            <div style={{ opacity: 0.75 }}>
              {TERMINAL.includes(booking.status)
                ? "This trip is finished."
                : "No actions available for this status."}
            </div>
          ) : (
            actions.map((a) => (
              <form key={a.next} action={updateDriverBookingStatus}>
                <input type='hidden' name='bookingId' value={booking.id} />
                <input type='hidden' name='nextStatus' value={a.next} />
                <button
                  type='submit'
                  style={{
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontWeight: 800,
                    border: "1px solid rgba(0,0,0,0.18)",
                    cursor: "pointer",
                    background: "white",
                  }}
                >
                  {a.label}
                </button>
              </form>
            ))
          )}

          <Link
            href={`/driver-dashboard/support?bookingId=${booking.id}`}
            style={{
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 800,
              border: "1px solid rgba(0,0,0,0.18)",
              textDecoration: "none",
              color: "inherit",
              background: "white",
            }}
          >
            Report issue →
          </Link>
        </div>
      </Card>

      <Card title='Activity log'>
        {booking.statusEvents.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No updates yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {booking.statusEvents.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  {String(e.status).replaceAll("_", " ")}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>
                  {formatDateTime(e.createdAt)}{" "}
                  {e.createdBy?.name ? `• ${e.createdBy.name}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {booking.payment ? (
        <Card title='Payment (FYI)'>
          <Row label='Status' value={booking.payment.status} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {booking.payment.receiptUrl ? (
              <a
                href={booking.payment.receiptUrl}
                target='_blank'
                rel='noreferrer'
              >
                Open receipt →
              </a>
            ) : null}

            {booking.payment.checkoutUrl &&
            (booking.payment.status === "NONE" ||
              booking.payment.status === "PENDING" ||
              booking.payment.status === "FAILED") ? (
              <a
                href={booking.payment.checkoutUrl}
                target='_blank'
                rel='noreferrer'
              >
                Continue checkout →
              </a>
            ) : null}
          </div>
        </Card>
      ) : null}
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
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 900 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
      <div style={{ opacity: 0.7, fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
