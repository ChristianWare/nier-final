/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/dashboard/trips/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookingStatus } from "@prisma/client";
import type { ReactNode } from "react";

import styles from "./UserTripDetailPage.module.css";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import DefaultProfileImg from "../../../../../public/images/mesaii.jpg";
import RouteMapDisplay from "@/components/admin/RouteMapDisplay/RouteMapDisplay";
import UserTripPaymentClient from "./UserTripPaymentClient";
import UserCancelTripClient from "./UserCancelTripClient";
import InvoiceSection from "./InvoiceSection";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

function formatDateTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
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

function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof (val as any).toNumber === "function")
    return (val as any).toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function getConfirmationCode(bookingId: string): string {
  return bookingId.slice(0, 8).toUpperCase();
}

function statusLabel(status: BookingStatus): string {
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
    default:
      return String(status).replaceAll("_", " ");
  }
}

function badgeTone(status: BookingStatus): BadgeTone {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW") return "neutral";
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

function getPaymentStatusDisplay(
  paymentStatus: string | null | undefined,
  totalCents: number,
  amountPaidCents: number,
): {
  label: string;
  tone: BadgeTone;
} {
  if (paymentStatus === "REFUNDED") {
    return { label: "Refunded", tone: "neutral" };
  }
  if (paymentStatus === "PARTIALLY_REFUNDED") {
    return { label: "Partially Refunded", tone: "neutral" };
  }
  if (paymentStatus === "PAID") {
    if (amountPaidCents < totalCents) {
      return { label: "Partial Payment", tone: "warn" };
    }
    return { label: "Paid", tone: "good" };
  }
  if (paymentStatus === "PENDING") {
    return { label: "Pending", tone: "warn" };
  }
  if (paymentStatus === "FAILED") {
    return { label: "Failed", tone: "bad" };
  }
  return { label: "Not Paid", tone: "bad" };
}

async function resolveSessionUserId(session: any) {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

export default async function UserTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/trips");

  const userId = await resolveSessionUserId(session);
  if (!userId) redirect("/login?next=/dashboard/trips");

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      serviceType: { select: { name: true, slug: true } },
      vehicle: { select: { name: true } },
      payment: {
        select: {
          status: true,
          checkoutUrl: true,
          amountPaidCents: true,
          amountRefundedCents: true,
          tipCents: true,
          paidAt: true,
        },
      },
      assignment: {
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              image: true,
            },
          },
          vehicleUnit: { select: { name: true, plate: true } },
        },
      },
      stops: {
        orderBy: { stopOrder: "asc" },
      },
    },
  });

  if (!booking) return notFound();

  // Verify this user owns the booking
  if (booking.userId !== userId) {
    redirect("/dashboard/trips");
  }

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone;

  const currentStatus = booking.status as BookingStatus;
  const isPaid = booking.payment?.status === "PAID";
  const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
  const amountRefundedCents = booking.payment?.amountRefundedCents ?? 0;
  const tipCents = booking.payment?.tipCents ?? 0;

  // Current status display
  const currentStatusIsPaidConfirmed =
    isPaid &&
    (currentStatus === "CONFIRMED" || currentStatus === "PENDING_PAYMENT");
  const currentStatusLabel = currentStatusIsPaidConfirmed
    ? "Payment received"
    : statusLabel(currentStatus);
  const currentStatusTone: BadgeTone = currentStatusIsPaidConfirmed
    ? "good"
    : badgeTone(currentStatus);

  // Payment status display
  const paymentStatusDisplay = getPaymentStatusDisplay(
    booking.payment?.status,
    booking.totalCents,
    amountPaidCents,
  );

  // Driver info
  const hasDriver = !!booking.assignment?.driver;
  const driver = booking.assignment?.driver;
  const driverName = driver?.name?.trim() || "Your Driver";
  const driverPhone = driver?.phone || null;
  const driverImage = driver?.image || null;

  // Vehicle info
  const vehicleUnit = booking.assignment?.vehicleUnit;
  const vehicleUnitDisplay = vehicleUnit
    ? `${vehicleUnit.name}${vehicleUnit.plate ? ` (${vehicleUnit.plate})` : ""}`
    : null;

  // Check for stops
  const hasStops = booking.stops && booking.stops.length > 0;
  const stopCount = booking.stops?.length ?? 0;
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
  const totalWaitTimeMinutes =
    booking.stops?.reduce((sum, s) => sum + (s.waitTimeMinutes ?? 5), 0) ?? 0;

  // Check for flight info
  const hasFlightInfo =
    booking.flightAirline ||
    booking.flightNumber ||
    booking.flightScheduledAt ||
    booking.flightTerminal ||
    booking.flightGate;

  // Check if we have route coordinates for map
  const hasRouteCoordinates =
    booking.pickupLat &&
    booking.pickupLng &&
    booking.dropoffLat &&
    booking.dropoffLng;

  // Prepare stops for map
  const stopsForMap =
    booking.stops
      ?.map((s) => ({
        lat: toNumber(s.lat)!,
        lng: toNumber(s.lng)!,
        address: s.address,
        stopOrder: s.stopOrder,
      }))
      .filter((s) => s.lat && s.lng) ?? [];

  // Show payment section if pending payment
  const showPaymentSection = currentStatus === "PENDING_PAYMENT";

  // Can cancel if not paid and not in terminal/active status
  const canCancel =
    !isPaid &&
    amountPaidCents === 0 &&
    ![
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
      "IN_PROGRESS",
    ].includes(currentStatus);

  // Declined
  const isDeclined = currentStatus === "DECLINED";

  // Prepare stops for payment client
  const stopsForPayment = booking.stops.map((s) => ({
    id: s.id,
    stopOrder: s.stopOrder,
    address: s.address,
  }));

  // Build invoice data if paid
  let invoiceData: InvoiceData | null = null;

  if (isPaid) {
    const invoiceNumber = booking.id.slice(0, 8).toUpperCase();
    const invoiceDate = formatInvoiceDate(booking.createdAt);
    const paidDate = booking.payment?.paidAt
      ? formatInvoiceDate(booking.payment.paidAt)
      : null;

    // Build line items
    const lineItems: InvoiceLineItem[] = [];

    // Base fare (subtotal minus stop surcharge)
    const baseFareCents = booking.subtotalCents - stopSurchargeCents;

    lineItems.push({
      description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.vehicle?.name ?? "Vehicle"}`,
      amount: baseFareCents,
    });

    // Stop surcharge
    if (stopCount > 0 && stopSurchargeCents > 0) {
      lineItems.push({
        description: `Extra Stop${stopCount > 1 ? "s" : ""} (${stopCount} × $15.00)`,
        amount: stopSurchargeCents,
      });
    }

    // Fees
    if (booking.feesCents > 0) {
      lineItems.push({
        description: "Service Fee",
        amount: booking.feesCents,
      });
    }

    // Taxes
    if (booking.taxesCents > 0) {
      lineItems.push({
        description: "Tax",
        amount: booking.taxesCents,
      });
    }

    invoiceData = {
      invoiceNumber,
      invoiceDate,
      paidDate,

      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },

      customer: {
        name: booking.user?.name?.trim() || booking.user?.email || "Customer",
        email: booking.user?.email || "",
        phone: booking.user?.phone || null,
      },

      trip: {
        date: formatTripDateTime(booking.pickupAt),
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        stops: booking.stops.map((s) => ({
          address: s.address,
          stopOrder: s.stopOrder,
        })),
        serviceName: booking.serviceType?.name ?? "Transportation",
        vehicleName: booking.vehicle?.name ?? "Vehicle",
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: toNumber(booking.distanceMiles),
        durationMinutes: booking.durationMinutes,
      },

      lineItems,

      subtotalCents: booking.subtotalCents,
      feesCents: booking.feesCents,
      taxesCents: booking.taxesCents,
      totalCents: booking.totalCents,
      tipCents: tipCents,
      amountPaidCents: amountPaidCents,
      amountRefundedCents: amountRefundedCents,

      currency: booking.currency,
    };
  }

  return (
    <section className={styles.container}>
      <header className='header'>
        <Link href='/dashboard/trips' className='backBtn'>
          ← Back to My Trips
        </Link>
        <div className={styles.headerTop}>
          <div className={styles.headerTopLeft}>
            <h1 className={`${styles.heading} h2`}>Trip Details</h1>
          </div>
          <div className={styles.headerTopRight}>
            <div className='emptyTitle'>Confirmation #</div>
            <div className={styles.confirmationValue}>
              {getConfirmationCode(booking.id)}
            </div>
          </div>
        </div>

        <div className={styles.box}>
          <div className={styles.boxLeft}>
            <div style={{ marginTop: 12 }}>
              <div className='emptyTitle'>Current Status:</div>
              <div style={{ marginTop: 6 }}>
                <span className={`badge badge_${currentStatusTone}`}>
                  {currentStatusLabel}
                </span>
              </div>
            </div>

            {/* Show decline reason if applicable */}
            {isDeclined && booking.declineReason && (
              <div className={styles.declineReasonBox}>
                <strong>Decline Reason:</strong> {booking.declineReason}
              </div>
            )}
          </div>

          {/* Cancel button in boxRight if allowed */}
          <div className={styles.boxRight}>
            {/* {canCancel && <UserCancelTripClient bookingId={booking.id} />} */}
            {/* Payment status */}
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
                    on {formatDateTime(booking.payment.paidAt, companyTz)}
                  </span>
                )}
              </div>

              {/* Show tip amount if present */}
              {tipCents > 0 && (
                <div className={styles.tipDisplay}>
                  <span className={styles.tipIcon}>💰</span>
                  <span className={styles.tipLabel}>Driver Tip:</span>
                  <span className={styles.tipAmount}>
                    {formatMoney(tipCents, booking.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Payment Section (if pending payment) */}
      {showPaymentSection && (
        <Card title='Complete Your Payment'>
          <UserTripPaymentClient
            bookingId={booking.id}
            serviceName={booking.serviceType?.name ?? "Transportation"}
            vehicleName={booking.vehicle?.name ?? "Vehicle"}
            baseFareCents={booking.totalCents}
            currency={booking.currency}
            stops={stopsForPayment}
            stopSurchargeCents={stopSurchargeCents}
          />
        </Card>
      )}

      {/* Driver Card (if assigned) */}
      {hasDriver && (
        <Card title='Your Driver'>
          <div className={styles.driverSection}>
            <div className={styles.driverImageWrap}>
              <Image
                src={driverImage || DefaultProfileImg}
                alt={driverName}
                width={80}
                height={80}
                className={styles.driverImage}
              />
            </div>
            <div className={styles.driverInfo}>
              <KeyVal k='Driver' v={driverName} />
              {vehicleUnitDisplay && (
                <KeyVal k='Vehicle' v={vehicleUnitDisplay} />
              )}
              {driverPhone && (
                <div className={styles.driverContact}>
                  <a
                    href={`tel:${driverPhone}`}
                    className={styles.contactButton}
                  >
                    📞 Call Driver
                  </a>
                  <a
                    href={`sms:${driverPhone}`}
                    className={styles.contactButton}
                  >
                    💬 Text
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Trip Details Card */}
      <Card title='Trip'>
        <KeyVal k='Date' v={formatDateTime(booking.pickupAt, companyTz)} />
        <KeyVal
          k='Distance / duration'
          v={`${toNumber(booking.distanceMiles) ?? "—"} mi • ${booking.durationMinutes ?? "—"} min${hasStops ? ` (includes ${stopCount} stop${stopCount > 1 ? "s" : ""})` : ""}`}
        />
        <KeyVal
          k='Amount'
          v={formatMoney(booking.totalCents, booking.currency)}
        />
        {booking.specialRequests && (
          <KeyVal k='Special requests' v={booking.specialRequests} />
        )}
        <KeyVal k='Booked' v={formatDateTime(booking.createdAt, companyTz)} />
        <KeyVal k='Service' v={booking.serviceType?.name ?? "—"} />
        <KeyVal k='Vehicle category' v={booking.vehicle?.name ?? "—"} />

        {/* Route Timeline with Stops */}
        {hasStops ? (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.stopsSection}>
              <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                <span style={{ marginRight: "2rem" }}>🛑</span>Route with{" "}
                {stopCount} Extra Stop{stopCount > 1 ? "s" : ""}
              </div>
              <div className={styles.routeTimeline}>
                {/* Pickup */}
                <div className={styles.routePoint}>
                  <div
                    className={styles.routeMarker}
                    style={{ background: "#22c55e" }}
                  >
                    A
                  </div>
                  <div className={styles.routeAddress}>
                    <div className='emptyTitle'>Pickup</div>
                    <p className='subheading'>{booking.pickupAddress}</p>
                  </div>
                </div>

                {/* Stops */}
                {booking.stops.map((stop, index) => (
                  <div key={stop.id} className={styles.routePoint}>
                    <div
                      className={styles.routeMarker}
                      style={{ background: "#3b82f6" }}
                    >
                      {index + 1}
                    </div>
                    <div className={styles.routeAddress}>
                      <div className='emptyTitle'>Stop {index + 1}</div>
                      <p className='subheading'>{stop.address}</p>
                      <span className='miniNote'>
                        ~{stop.waitTimeMinutes ?? 5} min wait
                      </span>
                    </div>
                  </div>
                ))}

                {/* Dropoff */}
                <div className={styles.routePoint}>
                  <div
                    className={styles.routeMarker}
                    style={{ background: "#ef4444" }}
                  >
                    B
                  </div>
                  <div className={styles.routeAddress}>
                    <div className='emptyTitle'>Dropoff</div>
                    <p className='subheading'>{booking.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              {/* Stop charges */}
              <div className={styles.stopCharges}>
                <div className={styles.stopChargeRow}>
                  <span>Stop surcharge ({stopCount} × $15)</span>
                  <span className={styles.stopChargeAmount}>
                    {formatMoney(stopSurchargeCents, booking.currency)}
                  </span>
                </div>
                <div className={styles.stopChargeRow}>
                  <span>Total wait time</span>
                  <span>~{totalWaitTimeMinutes} min</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <KeyVal k='Pickup' v={booking.pickupAddress} />
            <KeyVal k='Dropoff' v={booking.dropoffAddress} />
          </>
        )}

        <KeyVal
          k='Passengers / luggage'
          v={`${booking.passengers} / ${booking.luggage}`}
        />

        {/* Route Map Display */}
        {hasRouteCoordinates && (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.routeMapSection}>
              <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                Route Map
              </div>
              <RouteMapDisplay
                pickupLat={toNumber(booking.pickupLat)!}
                pickupLng={toNumber(booking.pickupLng)!}
                dropoffLat={toNumber(booking.dropoffLat)!}
                dropoffLng={toNumber(booking.dropoffLng)!}
                pickupAddress={booking.pickupAddress}
                dropoffAddress={booking.dropoffAddress}
                stops={stopsForMap}
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
                ✈️ Flight Information
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
                  v={formatDateTime(booking.flightScheduledAt, companyTz)}
                />
              )}
              {booking.flightTerminal && (
                <KeyVal k='Terminal' v={booking.flightTerminal} />
              )}
              {booking.flightGate && <KeyVal k='Gate' v={booking.flightGate} />}
            </div>
          </>
        )}
      </Card>
      {/* Invoice Section (if paid) */}
      {isPaid && invoiceData && (
        <Card title='Invoice'>
          <InvoiceSection invoice={invoiceData} bookingId={booking.id} />
        </Card>
      )}

      {/* Help Section */}
      <Card title='Need Help?'>
        <div className={styles.helpContent}>
          <p className='subheading'>
            If you have questions about your booking or need to make changes,
            please contact us.
          </p>
          <div className={styles.helpActions}>
            <a href='tel:+14805551234' className={styles.helpButton}>
              📞 Call Support
            </a>
            <a href='mailto:support@example.com' className={styles.helpButton}>
              ✉️ Email Us
            </a>
          </div>
        </div>
      </Card>
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
