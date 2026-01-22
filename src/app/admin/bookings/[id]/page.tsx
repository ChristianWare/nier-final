// src/app/admin/bookings/[id]/page.tsx
import styles from "./AdminBookingDetailPage.module.css";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ApprovePriceForm from "@/components/admin/ApprovePriceForm/ApprovePriceForm";
import AssignBookingForm from "@/components/admin/AssignBookingForm/AssignBookingForm";
import SendPaymentLinkButton from "@/components/admin/SendPaymentLinkButton/SendPaymentLinkButton";
import { BookingStatus, Role } from "@prisma/client";
import Link from "next/link";
import DeleteBookingDangerZoneClient from "./DeleteBookingDangerZoneClient";
import AdminManualCardPaymentClient from "./AdminManualCardPaymentClient";

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

function fmtPersonLine(p: { name: string | null; email: string }) {
  const n = (p.name ?? "").trim();
  return n ? `${n} (${p.email})` : p.email;
}

function formatMoney(cents: number | null | undefined, currency = "USD") {
  if (cents == null) return "—";
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
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

  // Earliest status event = best hint for who created the booking (admin/user/guest)
  const createdEvent = await db.bookingStatusEvent.findFirst({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true, roles: true } },
    },
  });

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

  const customerName =
    booking.user?.name?.trim() || booking.guestName?.trim() || "—";
  const customerEmail = booking.user?.email || booking.guestEmail || "—";
  const customerPhone = booking.guestPhone?.trim() || "—";
  const customerLine = booking.user
    ? `${customerName} (${customerEmail})`
    : `${customerName} (${customerEmail})${
        booking.guestPhone ? ` • ${customerPhone}` : ""
      }`;

  // Created meta (when + who: Admin/User/Guest)
  const createdAtLabel = formatDateTime(booking.createdAt);

  const actor = createdEvent?.createdBy ?? null;

  let createdByDisplay = "Guest checkout";

  if (actor?.roles?.includes(Role.ADMIN)) {
    createdByDisplay = `Admin • ${fmtPersonLine(actor)}`;
  } else if (actor) {
    createdByDisplay = `User account • ${fmtPersonLine(actor)}`;
  } else if (booking.user) {
    createdByDisplay = `User account • ${fmtPersonLine({
      name: booking.user.name ?? null,
      email: booking.user.email,
    })}`;
  } else {
    const gName = (booking.guestName ?? "").trim() || "Guest";
    const gEmail = (booking.guestEmail ?? "").trim();
    const gPhone = (booking.guestPhone ?? "").trim();

    const parts = [
      "Guest checkout",
      gEmail ? `${gName} (${gEmail})` : gName,
      gPhone ? gPhone : null,
    ].filter(Boolean);

    createdByDisplay = parts.join(" • ");
  }

  /**
   * Display fix:
   * If Stripe says PAID, and your statusEvents contain a duplicate "CONFIRMED",
   * we treat the *most recent* CONFIRMED event as "Payment received".
   */
  const isPaid = booking.payment?.status === "PAID";
  const mostRecentConfirmedEventId = isPaid
    ? (booking.statusEvents.find((e) => e.status === "CONFIRMED")?.id ?? null)
    : null;

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
        <KeyVal k='Created' v={createdAtLabel} />
        <KeyVal k='Created by' v={createdByDisplay} />

        <KeyVal k='Customer' v={customerLine} />
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
          <>
            <AssignBookingForm
              bookingId={booking.id}
              drivers={drivers}
              vehicleUnits={vehicleUnits}
              currentDriverId={booking.assignment?.driverId ?? null}
              currentVehicleUnitId={booking.assignment?.vehicleUnitId ?? null}
              currentDriverPaymentCents={
                booking.assignment?.driverPaymentCents ?? null
              }
            />

            {/* ✅ Display current assignment details */}
            {booking.assignment ? (
              <div
                className={styles.assignmentInfo}
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                  Current assignment
                </div>
                <KeyVal
                  k='Driver'
                  v={`${booking.assignment.driver.name ?? "Driver"} (${
                    booking.assignment.driver.email
                  })`}
                />
                {booking.assignment.vehicleUnit ? (
                  <KeyVal
                    k='Vehicle'
                    v={`${booking.assignment.vehicleUnit.name}${
                      booking.assignment.vehicleUnit.plate
                        ? ` (${booking.assignment.vehicleUnit.plate})`
                        : ""
                    }`}
                  />
                ) : null}
                {booking.assignment.driverPaymentCents != null ? (
                  <KeyVal
                    k='Driver payment'
                    v={formatMoney(
                      booking.assignment.driverPaymentCents,
                      booking.currency,
                    )}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card title='Payment'>
        <div className={styles.paymentBlock}>
          <div className={styles.paymentStatus}>
            Payment status: <strong>{booking.payment?.status ?? "NONE"}</strong>
          </div>

          <SendPaymentLinkButton bookingId={booking.id} />

          {booking.payment?.checkoutUrl ? (
            <div className={styles.checkoutUrl}>
              Latest checkout URL: <br />
              <Link
                href={booking.payment.checkoutUrl}
                className='backBtn emptyTitleSmall'
                style={{ marginTop: "1rem", display: "inline-block" }}
                target='_blank'
                rel='noopener noreferrer'
              >
                Payment Link
              </Link>
            </div>
          ) : null}

          {/* ✅ Manual card payment */}
          <div style={{ marginTop: 18 }}>
            <div className='cardTitle h5'>Take card payment (manual)</div>
            <div className='miniNote' style={{ marginTop: 6 }}>
              Card-only checkout. After success, the button turns green and says
              &ldquo;Payment successful&rdquo;.
            </div>

            <div style={{ marginTop: 10 }}>
              <AdminManualCardPaymentClient
                bookingId={booking.id}
                amountCents={booking.totalCents}
                currency={booking.currency}
                isPaid={isPaid}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title='Status events'>
        {booking.statusEvents.length === 0 ? (
          <div className={styles.muted}>No events yet.</div>
        ) : (
          <ul className={styles.eventsList}>
            {booking.statusEvents.map((e) => {
              const isPaidConfirmed =
                Boolean(mostRecentConfirmedEventId) &&
                e.id === mostRecentConfirmedEventId;

              const tone: BadgeTone = isPaidConfirmed
                ? "good"
                : badgeTone(e.status as BookingStatus);

              const label = isPaidConfirmed
                ? "Payment received"
                : statusLabel(e.status as BookingStatus);

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

      {/* ✅ Danger Zone */}
      <DeleteBookingDangerZoneClient bookingId={booking.id} />
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className='cardTitle h4'>{title}</div>
      </div>
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <div className='emptyTitle'>{k}</div>
      <p className='subheading'>{v}</p>
    </div>
  );
}
