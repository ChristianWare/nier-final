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
import QuickActionsClient from "./QuickActionsClient";
import BookingNotesClient from "./BookingNotesClient";
import EditTripDetailsClient from "./EditTripDetailsClient";
import DuplicateBookingClient from "./DuplicateBookingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- shared-ish label helpers ---
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

function formatDateTimeLocal(d: Date) {
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

// Helper to determine who triggered a status event
function getEventActorLabel(
  actor: { name: string | null; email: string; roles: Role[] } | null,
  status: string,
): string {
  if (status === "CONFIRMED" && !actor) {
    return "System (payment received)";
  }

  if (!actor) {
    return "System";
  }

  const isAdmin = actor.roles?.includes(Role.ADMIN);
  const isDriver = actor.roles?.includes(Role.DRIVER);
  const name = actor.name?.trim() || actor.email;

  if (isAdmin) {
    return `Admin: ${name}`;
  }

  if (isDriver) {
    return `Driver: ${name}`;
  }

  return `User: ${name}`;
}

// ✅ Helper for payment status display
function getPaymentStatusDisplay(paymentStatus: string | null | undefined): {
  label: string;
  tone: BadgeTone;
} {
  switch (paymentStatus) {
    case "PAID":
      return { label: "Paid", tone: "good" };
    case "PENDING":
      return { label: "Pending", tone: "warn" };
    case "FAILED":
      return { label: "Failed", tone: "bad" };
    case "REFUNDED":
      return { label: "Refunded", tone: "neutral" };
    case "PARTIALLY_REFUNDED":
      return { label: "Partially Refunded", tone: "neutral" };
    case "NONE":
    default:
      return { label: "Not Paid", tone: "bad" };
  }
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
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, roles: true },
          },
        },
      },
      // ✅ NEW: Include notes
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!booking) return notFound();

  // Earliest status event for "created by"
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

  // ✅ NEW: Get customer's booking count for history link
  const customerEmail = booking.user?.email || booking.guestEmail;
  let customerBookingCount = 0;
  if (customerEmail) {
    customerBookingCount = await db.booking.count({
      where: {
        OR: [{ user: { email: customerEmail } }, { guestEmail: customerEmail }],
        id: { not: booking.id }, // Exclude current booking
      },
    });
  }

  const customerName =
    booking.user?.name?.trim() || booking.guestName?.trim() || "—";
  const customerEmailDisplay = booking.user?.email || booking.guestEmail || "—";
  const customerPhone = booking.guestPhone?.trim() || "—";
  const customerLine = booking.user
    ? `${customerName} (${customerEmailDisplay})`
    : `${customerName} (${customerEmailDisplay})${
        booking.guestPhone ? ` • ${customerPhone}` : ""
      }`;

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

  const isPaid = booking.payment?.status === "PAID";
  const mostRecentConfirmedEventId = isPaid
    ? (booking.statusEvents.find((e) => e.status === "CONFIRMED")?.id ?? null)
    : null;

  // Current status display
  const currentStatus = booking.status as BookingStatus;
  const currentStatusIsPaidConfirmed =
    isPaid &&
    (currentStatus === "CONFIRMED" || currentStatus === "PENDING_PAYMENT");
  const currentStatusLabel = currentStatusIsPaidConfirmed
    ? "Payment received"
    : statusLabel(currentStatus);
  const currentStatusTone: BadgeTone = currentStatusIsPaidConfirmed
    ? "good"
    : badgeTone(currentStatus);

  // ✅ Payment status display
  const paymentStatusDisplay = getPaymentStatusDisplay(booking.payment?.status);

  // ✅ Prepare data for EditTripDetailsClient
  const tripEditData = {
    pickupAt: formatDateTimeLocal(booking.pickupAt),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    passengers: booking.passengers,
    luggage: booking.luggage,
    specialRequests: booking.specialRequests,
    flightAirline: booking.flightAirline,
    flightNumber: booking.flightNumber,
    flightScheduledAt: booking.flightScheduledAt
      ? formatDateTimeLocal(booking.flightScheduledAt)
      : null,
    flightTerminal: booking.flightTerminal,
    flightGate: booking.flightGate,
  };

  // ✅ Prepare notes for client
  const notesForClient = booking.notes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    createdBy: n.createdBy,
  }));

  // ✅ Check if booking has flight info
  const hasFlightInfo =
    booking.flightAirline ||
    booking.flightNumber ||
    booking.flightScheduledAt ||
    booking.flightTerminal ||
    booking.flightGate;

  return (
    <section className='container'>
      <header className='header'>
        <h1 className={`heading h2`}>Booking Details</h1>

        <div className={styles.box}>
          <div className='emptyTitle'>Booking ID:</div>
          <p className='emptySmall'>{booking.id}</p>

          {/* Current status badge */}
          <div style={{ marginTop: 12 }}>
            <div className='emptyTitle'>Current Status:</div>
            <div style={{ marginTop: 6 }}>
              <span className={`badge badge_${currentStatusTone}`}>
                {currentStatusLabel}
              </span>
            </div>
          </div>

          {/* ✅ NEW: Payment status */}
          <div style={{ marginTop: 12 }}>
            <div className='emptyTitle'>Payment:</div>
            <div className={styles.paymentInfo}>
              <span className={`badge badge_${paymentStatusDisplay.tone}`}>
                {paymentStatusDisplay.label}
              </span>
              {booking.totalCents > 0 && (
                <span className={styles.paymentAmount}>
                  {formatMoney(booking.totalCents, booking.currency)}
                </span>
              )}
              {booking.payment?.paidAt && (
                <span className={styles.paymentDate}>
                  on {formatDateTime(booking.payment.paidAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ✅ NEW: Quick Actions at the top */}
        <Card title='Quick Actions'>
          <QuickActionsClient
            bookingId={booking.id}
            currentStatus={currentStatus}
            pickupAt={booking.pickupAt.toISOString()}
          />
          <div className={styles.quickActionsDivider} />
          <DuplicateBookingClient bookingId={booking.id} />
        </Card>
      </header>

      <Card title='Trip'>
        <KeyVal k='Created' v={createdAtLabel} />
        <KeyVal k='Created by' v={createdByDisplay} />

        {/* ✅ NEW: Customer with history link */}
        <div className={styles.keyVal}>
          <div className='emptyTitle'>Customer</div>
          <div>
            <p className='subheading'>{customerLine}</p>
            {customerBookingCount > 0 && customerEmail && (
              <Link
                href={`/admin/bookings?q=${encodeURIComponent(customerEmail)}`}
                className={styles.historyLink}
              >
                View {customerBookingCount} other booking
                {customerBookingCount !== 1 ? "s" : ""} from this customer →
              </Link>
            )}
          </div>
        </div>

        <KeyVal k='Service' v={booking.serviceType.name} />
        <KeyVal k='Vehicle category' v={booking.vehicle?.name ?? "—"} />
        <KeyVal k='Pickup at' v={formatDateTime(booking.pickupAt)} />
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

        {/* ✅ NEW: Flight Information */}
        {hasFlightInfo && (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.flightSection}>
              <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                Flight Information
              </div>
              {booking.flightAirline && (
                <KeyVal k='Airline' v={booking.flightAirline} />
              )}
              {booking.flightNumber && (
                <KeyVal k='Flight Number' v={booking.flightNumber} />
              )}
              {booking.flightScheduledAt && (
                <KeyVal
                  k='Scheduled Time'
                  v={formatDateTime(booking.flightScheduledAt)}
                />
              )}
              {booking.flightTerminal && (
                <KeyVal k='Terminal' v={booking.flightTerminal} />
              )}
              {booking.flightGate && <KeyVal k='Gate' v={booking.flightGate} />}
            </div>
          </>
        )}

        {/* ✅ NEW: Edit Trip Details */}
        <div className={styles.sectionDivider} />
        <EditTripDetailsClient
          bookingId={booking.id}
          initialData={tripEditData}
        />
      </Card>

      {/* ✅ NEW: Notes/Comments section */}
      <Card title='Internal Notes'>
        <BookingNotesClient bookingId={booking.id} notes={notesForClient} />
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
            <Link className={styles.inlineLink} href='/admin/users'>
              Users
            </Link>
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

      <Card title='Status timeline'>
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

              const actorLabel = getEventActorLabel(e.createdBy, e.status);

              return (
                <li key={e.id} className={styles.eventItem}>
                  <div className={styles.eventLeft}>
                    <span className={`badge badge_${tone}`}>{label}</span>
                    <span className={styles.eventActor}>{actorLabel}</span>
                  </div>
                  <p className='val'>{formatDateTime(new Date(e.createdAt))}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Danger Zone */}
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
