/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/bookings/[id]/page.tsx
import styles from "./AdminBookingDetailPage.module.css";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PriceForm from "@/components/admin/Priceform/Priceform";
import AssignBookingForm from "@/components/admin/AssignBookingForm/AssignBookingForm";
import SendPaymentLinkButton from "@/components/admin/SendPaymentLinkButton/SendPaymentLinkButton";
import { BookingStatus, Role } from "@prisma/client";
import Link from "next/link";
import DeleteBookingDangerZoneClient from "./DeleteBookingDangerZoneClient";
import AdminManualCardPaymentClient from "./AdminManualCardPaymentClient";
import QuickActionsClient from "./QuickActionsClient";
import BookingNotesClient from "./BookingNotesClient";
import EditTripDetailsClient, { PricingData } from "./EditTripDetailsClient";
import DuplicateBookingClient from "./DuplicateBookingClient";
import RouteMapDisplay from "@/components/admin/RouteMapDisplay/RouteMapDisplay";
import RefundButton from "@/components/admin/RefundButton/RefundButton";
import ApprovalToggleClient from "./ApprovalToggleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- shared-ish label helpers ---
function statusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "DECLINED":
      return "Declined";
    case "PENDING_PAYMENT":
      return "Approved (awaiting payment)";
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
  if (status === "PENDING_PAYMENT") return "good";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "DECLINED") return "bad";
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

// ✅ Helper to format event details from metadata
function getEventDetails(
  eventType: string,
  metadata: Record<string, any> | null,
  currency: string,
): string | null {
  if (!metadata) return null;

  switch (eventType) {
    case "PAYMENT_RECEIVED": {
      const amount = formatMoney(metadata.amountCents, currency);
      const tip = metadata.tipCents
        ? formatMoney(metadata.tipCents, currency)
        : null;
      // ✅ Show tip in event details if present
      if (tip && metadata.tipCents > 0) {
        return `Amount: ${amount} (includes ${tip} tip)`;
      }
      return `Amount: ${amount}`;
    }

    case "PAYMENT_LINK_SENT": {
      const amount = formatMoney(metadata.amountCents, currency);
      const email = metadata.recipientEmail;
      return `${amount} → ${email}`;
    }

    case "DRIVER_ASSIGNED": {
      const driverName = metadata.driverName ?? "Driver";
      const driverPayment = metadata.driverPaymentCents
        ? ` • Pay: ${formatMoney(metadata.driverPaymentCents, currency)}`
        : "";
      const vehicle = metadata.vehicleUnitName
        ? ` • Vehicle: ${metadata.vehicleUnitName}${metadata.vehicleUnitPlate ? ` (${metadata.vehicleUnitPlate})` : ""}`
        : "";
      return `${driverName}${driverPayment}${vehicle}`;
    }

    case "TRIP_EDITED": {
      const fields = metadata.fieldsEdited;
      if (Array.isArray(fields) && fields.length > 0) {
        return `Changed: ${fields.join(", ")}`;
      }
      return null;
    }

    case "PRICE_ADJUSTED": {
      const oldTotal = formatMoney(metadata.oldTotalCents, currency);
      const newTotal = formatMoney(metadata.newTotalCents, currency);
      const diff = metadata.newTotalCents - metadata.oldTotalCents;
      const diffStr =
        diff > 0
          ? `+${formatMoney(diff, currency)}`
          : formatMoney(diff, currency);
      return `${oldTotal} → ${newTotal} (${diffStr})`;
    }

    case "REFUND_ISSUED": {
      const amount = formatMoney(metadata.amountCents, currency);
      const remaining = formatMoney(metadata.remainingPaidCents, currency);
      return `Refunded: ${amount} • Remaining: ${remaining}`;
    }

    case "APPROVAL_CHANGED": {
      return metadata.approved
        ? `Status: ${metadata.previousStatus} → ${metadata.newStatus}`
        : `Reverted to: ${metadata.newStatus}`;
    }

    case "BOOKING_DECLINED": {
      return metadata.reason ? `Reason: ${metadata.reason}` : null;
    }

    case "STATUS_CHANGE": {
      if (metadata.action) {
        return metadata.action;
      }
      if (metadata.previousStatus && metadata.newStatus) {
        return `${metadata.previousStatus} → ${metadata.newStatus}`;
      }
      return null;
    }

    default:
      return null;
  }
}

// ✅ Updated payment status display with balance and refund handling
function getPaymentStatusDisplay(
  paymentStatus: string | null | undefined,
  totalCents: number,
  amountPaidCents: number,
  amountRefundedCents: number,
): {
  label: string;
  tone: BadgeTone;
  hasBalanceDue: boolean;
  balanceDueCents: number;
  hasRefundDue: boolean;
  refundDueCents: number;
} {
  const netPaidCents = amountPaidCents - amountRefundedCents;
  const balanceDueCents = totalCents - netPaidCents;
  const hasBalanceDue = netPaidCents > 0 && balanceDueCents > 0;
  const hasRefundDue = netPaidCents > totalCents;
  const refundDueCents = hasRefundDue ? netPaidCents - totalCents : 0;

  if (paymentStatus === "REFUNDED") {
    return {
      label: "Refunded",
      tone: "neutral",
      hasBalanceDue: false,
      balanceDueCents: 0,
      hasRefundDue: false,
      refundDueCents: 0,
    };
  }

  if (paymentStatus === "PARTIALLY_REFUNDED") {
    return {
      label: "Partially Refunded",
      tone: "neutral",
      hasBalanceDue,
      balanceDueCents: hasBalanceDue ? balanceDueCents : 0,
      hasRefundDue,
      refundDueCents,
    };
  }

  if (paymentStatus === "PAID") {
    if (hasRefundDue) {
      return {
        label: "Overpaid",
        tone: "warn",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: true,
        refundDueCents,
      };
    }
    if (hasBalanceDue) {
      return {
        label: "Partial Payment",
        tone: "warn",
        hasBalanceDue: true,
        balanceDueCents,
        hasRefundDue: false,
        refundDueCents: 0,
      };
    }
    return {
      label: "Paid",
      tone: "good",
      hasBalanceDue: false,
      balanceDueCents: 0,
      hasRefundDue: false,
      refundDueCents: 0,
    };
  }

  switch (paymentStatus) {
    case "PENDING":
      return {
        label: "Pending",
        tone: "warn",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: false,
        refundDueCents: 0,
      };
    case "FAILED":
      return {
        label: "Failed",
        tone: "bad",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: false,
        refundDueCents: 0,
      };
    case "NONE":
    default:
      return {
        label: "Not Paid",
        tone: "bad",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: false,
        refundDueCents: 0,
      };
  }
}

// Helper to safely convert Decimal to number
function decimalToNumber(val: any): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val.toNumber === "function") return val.toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
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

  const customerEmail = booking.user?.email || booking.guestEmail;
  let customerBookingCount = 0;
  if (customerEmail) {
    customerBookingCount = await db.booking.count({
      where: {
        OR: [{ user: { email: customerEmail } }, { guestEmail: customerEmail }],
        id: { not: booking.id },
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
  const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
  const amountRefundedCents = booking.payment?.amountRefundedCents ?? 0;
  // ✅ Get tip amount from payment
  const tipCents = booking.payment?.tipCents ?? 0;

  // ✅ Determine if booking is approved (not in PENDING_REVIEW, DRAFT, or DECLINED)
  const isApproved =
    booking.status !== "PENDING_REVIEW" &&
    booking.status !== "DRAFT" &&
    booking.status !== "DECLINED";

  // ✅ Determine if booking is declined
  const isDeclined = booking.status === "DECLINED";

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

  // ✅ Updated payment status display with balance and refund handling
  const paymentStatusDisplay = getPaymentStatusDisplay(
    booking.payment?.status,
    booking.totalCents,
    amountPaidCents,
    amountRefundedCents,
  );

  // ✅ Prepare data for EditTripDetailsClient (with route data)
  const tripEditData = {
    pickupAt: formatDateTimeLocal(booking.pickupAt),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    pickupPlaceId: booking.pickupPlaceId,
    dropoffPlaceId: booking.dropoffPlaceId,
    pickupLat: decimalToNumber(booking.pickupLat),
    pickupLng: decimalToNumber(booking.pickupLng),
    dropoffLat: decimalToNumber(booking.dropoffLat),
    dropoffLng: decimalToNumber(booking.dropoffLng),
    distanceMiles: decimalToNumber(booking.distanceMiles),
    durationMinutes: booking.durationMinutes,
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

  // ✅ Prepare pricing data for EditTripDetailsClient
  const pricingData: PricingData | undefined =
    booking.serviceType && booking.vehicle
      ? {
          pricingStrategy: booking.serviceType
            .pricingStrategy as PricingData["pricingStrategy"],
          // Service pricing
          serviceMinFareCents: booking.serviceType.minFareCents ?? 0,
          serviceBaseFeeCents: booking.serviceType.baseFeeCents ?? 0,
          servicePerMileCents: booking.serviceType.perMileCents ?? 0,
          servicePerMinuteCents: booking.serviceType.perMinuteCents ?? 0,
          servicePerHourCents: booking.serviceType.perHourCents ?? 0,
          // Vehicle pricing
          vehicleBaseFareCents: booking.vehicle.baseFareCents ?? 0,
          vehiclePerMileCents: booking.vehicle.perMileCents ?? 0,
          vehiclePerMinuteCents: booking.vehicle.perMinuteCents ?? 0,
          vehiclePerHourCents: booking.vehicle.perHourCents ?? 0,
          vehicleMinHours: booking.vehicle.minHours ?? 0,
          // Current booking
          currentTotalCents: booking.totalCents,
          hoursRequested: decimalToNumber(booking.hoursRequested),
          currency: booking.currency,
        }
      : undefined;

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

  // ✅ Check if we have route coordinates for map display
  const hasRouteCoordinates =
    booking.pickupLat &&
    booking.pickupLng &&
    booking.dropoffLat &&
    booking.dropoffLng;

  return (
    <section className='container'>
      <header className='header'>
        <h1 className={`heading h2`}>Booking Details</h1>

        <div className={styles.box}>
          <div className={styles.boxLeft}>
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

            {/* ✅ Show decline reason if applicable */}
            {isDeclined && booking.declineReason && (
              <div className={styles.declineReasonBox}>
                <strong>Decline Reason:</strong> {booking.declineReason}
              </div>
            )}

            {/* ✅ Updated Payment status with balance display */}
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
                  <span className='miniNote'>
                    on {formatDateTime(booking.payment.paidAt)}
                  </span>
                )}
              </div>

              {/* ✅ NEW: Show tip amount if present */}
              {tipCents > 0 && (
                <div className={styles.tipDisplay}>
                  <span className={styles.tipIcon}>💰</span>
                  <span className={styles.tipLabel}>Driver Tip:</span>
                  <span className={styles.tipAmount}>
                    {formatMoney(tipCents, booking.currency)}
                  </span>
                </div>
              )}

              {/* ✅ Show balance due if applicable */}
              {paymentStatusDisplay.hasBalanceDue && (
                <div className={styles.balanceDueAlert}>
                  <strong>Balance Due:</strong>{" "}
                  {formatMoney(
                    paymentStatusDisplay.balanceDueCents,
                    booking.currency,
                  )}
                  <span className={styles.balanceDetail}>
                    (Paid: {formatMoney(amountPaidCents, booking.currency)} of{" "}
                    {formatMoney(booking.totalCents, booking.currency)})
                  </span>
                </div>
              )}

              {/* ✅ Show refund due if applicable */}
              {paymentStatusDisplay.hasRefundDue && (
                <div className={styles.refundDueAlert}>
                  <strong>Refund Due:</strong>{" "}
                  {formatMoney(
                    paymentStatusDisplay.refundDueCents,
                    booking.currency,
                  )}
                  <span className={styles.refundDetail}>
                    (Paid: {formatMoney(amountPaidCents, booking.currency)}
                    {amountRefundedCents > 0 && (
                      <>
                        , Refunded:{" "}
                        {formatMoney(amountRefundedCents, booking.currency)}
                      </>
                    )}
                    , New Total:{" "}
                    {formatMoney(booking.totalCents, booking.currency)})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Approval Toggle in boxRight */}
          <div className={styles.boxRight}>
            <ApprovalToggleClient
              bookingId={booking.id}
              isApproved={isApproved}
              isDeclined={isDeclined}
              isPaid={isPaid}
              bookingStatus={booking.status}
              declineReason={booking.declineReason}
            />
          </div>
        </div>

        {/* Quick Actions at the top */}
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
        <KeyVal k='Date' v={formatDateTime(booking.pickupAt)} />
        <KeyVal
          k='Distance / duration'
          v={`${booking.distanceMiles ?? "—"} mi • ${
            booking.durationMinutes ?? "—"
          } min`}
        />
        <KeyVal
          k='Amount due'
          v={formatMoney(booking.totalCents, booking.currency)}
        />
        {booking.specialRequests ? (
          <KeyVal k='Special requests' v={booking.specialRequests} />
        ) : null}
        <KeyVal k='Created' v={createdAtLabel} />
        <KeyVal k='Created by' v={createdByDisplay} />
        {/* Customer with history link */}
        <div className={styles.keyVal}>
          <div className='emptyTitle'>Customer</div>
          <div>
            <p className='subheading'>{customerLine}</p>
            {customerBookingCount > 0 && customerEmail && (
              <Link
                href={`/admin/bookings?q=${encodeURIComponent(customerEmail)}`}
                className='backBtn'
                style={{ marginTop: "0.5rem", display: "inline-block" }}
              >
                View {customerBookingCount} other booking
                {customerBookingCount !== 1 ? "s" : ""} from this customer →
              </Link>
            )}
          </div>
        </div>
        <KeyVal k='Service' v={booking.serviceType.name} />
        <KeyVal k='Vehicle category' v={booking.vehicle?.name ?? "—"} />
        <KeyVal k='Pickup' v={booking.pickupAddress} />
        <KeyVal k='Dropoff' v={booking.dropoffAddress} />
        <KeyVal
          k='Passengers / luggage'
          v={`${booking.passengers} / ${booking.luggage}`}
        />
        {/* ✅ Route Map Display */}
        {hasRouteCoordinates && (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.routeMapSection}>
              <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                Route Map
              </div>
              <RouteMapDisplay
                pickupLat={decimalToNumber(booking.pickupLat)!}
                pickupLng={decimalToNumber(booking.pickupLng)!}
                dropoffLat={decimalToNumber(booking.dropoffLat)!}
                dropoffLng={decimalToNumber(booking.dropoffLng)!}
                pickupAddress={booking.pickupAddress}
                dropoffAddress={booking.dropoffAddress}
              />
            </div>
          </>
        )}
        {/* Flight Information */}
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
        {/* Edit Trip Details */}
        <div className={styles.sectionDivider} />
        <EditTripDetailsClient
          bookingId={booking.id}
          initialData={tripEditData}
          pricingData={pricingData}
        />
      </Card>

      {/* ✅ Separated Price Card */}
      <Card title='Price'>
        <PriceForm
          bookingId={booking.id}
          currency={booking.currency}
          subtotalCents={booking.subtotalCents}
          feesCents={booking.feesCents}
          taxesCents={booking.taxesCents}
          totalCents={booking.totalCents}
        />
      </Card>

      <Card title='Payment'>
        <div className={styles.paymentBlock}>
          <div className={styles.paymentStatus}>
            Payment status: <strong>{booking.payment?.status ?? "NONE"}</strong>
            {amountPaidCents > 0 && (
              <span style={{ marginLeft: 10 }}>
                (Paid: {formatMoney(amountPaidCents, booking.currency)}
                {amountRefundedCents > 0 && (
                  <>
                    , Refunded:{" "}
                    {formatMoney(amountRefundedCents, booking.currency)}
                  </>
                )}
                {/* ✅ Show tip in payment status */}
                {tipCents > 0 && (
                  <>, Tip: {formatMoney(tipCents, booking.currency)}</>
                )}
                )
              </span>
            )}
          </div>

          {/* ✅ NEW: Tip breakdown in Payment card */}
          {tipCents > 0 && (
            <div className={styles.tipBreakdownCard}>
              <div className={styles.tipBreakdownHeader}>
                <span className={styles.tipBreakdownIcon}>💰</span>
                <span className={styles.tipBreakdownTitle}>
                  Driver Tip Received
                </span>
              </div>
              <div className={styles.tipBreakdownAmount}>
                {formatMoney(tipCents, booking.currency)}
              </div>
              <div className={styles.tipBreakdownNote}>
                This tip was added by the customer during checkout and should be
                passed to the assigned driver.
              </div>
            </div>
          )}

          {/* ✅ Send Payment Link Button - now checks isApproved */}
          <SendPaymentLinkButton
            bookingId={booking.id}
            totalCents={booking.totalCents}
            amountPaidCents={amountPaidCents}
            currency={booking.currency}
            isApproved={isApproved}
          />

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
              {/* ✅ Manual payment - now checks isApproved */}
              <AdminManualCardPaymentClient
                bookingId={booking.id}
                amountCents={booking.totalCents}
                currency={booking.currency}
                isPaid={isPaid}
                isApproved={isApproved}
                amountPaidCents={amountPaidCents}
              />
            </div>
          </div>
        </div>
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
              bookingTotalCents={booking.totalCents}
              currency={booking.currency}
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
                {/* ✅ NEW: Show tip for driver in assignment section */}
                {tipCents > 0 && (
                  <KeyVal
                    k='Customer tip'
                    v={formatMoney(tipCents, booking.currency)}
                  />
                )}
              </div>
            ) : null}
          </>
        )}
      </Card>

      {/* ✅ ENHANCED: Activity Timeline with event types and metadata */}
      <Card title='Activity Timeline'>
        {booking.statusEvents.length === 0 ? (
          <div className={styles.muted}>No activity yet.</div>
        ) : (
          <ul className={styles.eventsList}>
            {booking.statusEvents.map((e) => {
              // ✅ Extract eventType and metadata from the event
              const eventType = (e as any).eventType ?? "STATUS_CHANGE";
              const metadata = (e as any).metadata as Record<
                string,
                any
              > | null;

              const isPaidConfirmed =
                Boolean(mostRecentConfirmedEventId) &&
                e.id === mostRecentConfirmedEventId;

              // Determine badge tone and label based on event type
              let tone: BadgeTone = isPaidConfirmed
                ? "good"
                : badgeTone(e.status as BookingStatus);
              let label = isPaidConfirmed
                ? "Payment received"
                : statusLabel(e.status as BookingStatus);

              // ✅ Override label and tone for specific event types
              if (eventType === "PAYMENT_RECEIVED") {
                tone = "good";
                const method = metadata?.method;
                if (method === "manual") {
                  label = "Payment received (manual)";
                } else if (method === "online") {
                  label = "Payment received (online)";
                } else if (method === "balance") {
                  label = "Balance payment received";
                } else {
                  label = "Payment received";
                }
              } else if (eventType === "PAYMENT_LINK_SENT") {
                tone = "accent";
                label = metadata?.isBalancePayment
                  ? "Balance payment link sent"
                  : "Payment link sent";
              } else if (eventType === "DRIVER_ASSIGNED") {
                tone = "good";
                label = "Driver assigned";
              } else if (eventType === "TRIP_EDITED") {
                tone = "neutral";
                label = "Trip details edited";
              } else if (eventType === "PRICE_ADJUSTED") {
                tone = "warn";
                label = "Price adjusted";
              } else if (eventType === "REFUND_ISSUED") {
                tone = "warn";
                label = "Refund issued";
              } else if (eventType === "APPROVAL_CHANGED") {
                tone = metadata?.approved ? "good" : "neutral";
                label = metadata?.approved
                  ? "Booking approved"
                  : "Approval reversed";
              } else if (eventType === "BOOKING_DECLINED") {
                tone = "bad";
                label = "Booking declined";
              }

              const actorLabel = getEventActorLabel(e.createdBy, e.status);

              // ✅ Build event details based on metadata
              const eventDetails = getEventDetails(
                eventType,
                metadata,
                booking.currency,
              );

              return (
                <li key={e.id} className={styles.eventItem}>
                  <div className={styles.eventLeft}>
                    <span className={`badge badge_${tone}`}>{label}</span>
                    <span className={styles.eventActor}>{actorLabel}</span>
                    {/* ✅ Show event details if available */}
                    {eventDetails && (
                      <div className={`${styles.eventDetails} miniNote`}>
                        {eventDetails}
                      </div>
                    )}
                  </div>
                  <p className='val'>{formatDateTime(new Date(e.createdAt))}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title='Internal Notes'>
        <BookingNotesClient bookingId={booking.id} notes={notesForClient} />
      </Card>

      <Card title='Issue Refund' borderWarn stylesWarn>
        <div style={{ marginTop: 18 }}>
          <div className='miniNote' style={{ marginTop: 6 }}>
            You can refund clients manually here after they pay you.
          </div>

          <div style={{ marginTop: 10 }}>
            <RefundButton
              bookingId={booking.id}
              totalCents={booking.totalCents}
              amountPaidCents={amountPaidCents}
              amountRefundedCents={amountRefundedCents}
              currency={booking.currency}
              stripePaymentIntentId={
                booking.payment?.stripePaymentIntentId ?? null
              }
            />
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <DeleteBookingDangerZoneClient bookingId={booking.id} />
    </section>
  );
}

function Card({
  title,
  children,
  borderWarn,
  stylesWarn,
}: {
  title: string;
  children: ReactNode;
  borderWarn?: boolean;
  stylesWarn?: boolean;
}) {
  return (
    <div className={`${styles.card} ${borderWarn ? styles.borderWarn : ""}`}>
      <div className={styles.cardTop}>
        <div
          className='cardTitle h4'
          style={stylesWarn ? { background: "var(--warning300)" } : {}}
        >
          {title}
        </div>
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
