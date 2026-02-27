/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/corporate/bookings/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BookingStatus } from "@prisma/client";
import type { ReactNode } from "react";

import styles from "./CorporateBookingDetailPage.module.css";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import DefaultProfileImg from "../../../../../public/images/mesaii.jpg";
import RouteMapDisplay from "@/components/admin/RouteMapDisplay/RouteMapDisplay";
import InvoiceSection from "@/app/dashboard/trips/[id]/InvoiceSection";
import { getCorporateInvoiceData } from "../../../../../actions/corporate/getCorporateInvoiceData";
import type { InvoiceData } from "@/lib/invoice/types";

export const metadata = { title: "Booking Details | Corporate" };
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

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const d =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length !== 10) return raw;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default async function CorporateBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id, active: true },
    select: { corporateAccountId: true, role: true },
  });

  if (!contact) redirect("/");

  const accountId = contact.corporateAccountId;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      serviceType: { select: { name: true, slug: true } },
      vehicle: { select: { name: true } },
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
      corporateAccount: {
        select: {
          id: true,
          name: true,
          billingCycle: true,
          paymentTerms: true,
          discountPercent: true,
        },
      },
      corporatePassenger: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          department: true,
        },
      },
    },
  });

  if (!booking) return notFound();

  if (booking.corporateAccountId !== accountId) {
    redirect("/corporate/bookings");
  }

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone;
  const supportPhone = companySettings.dispatchPhone || "";
  const supportEmail = companySettings.supportEmail || "";

  const currentStatus = booking.status as BookingStatus;
  const currentStatusLabel = statusLabel(currentStatus);
  const currentStatusTone: BadgeTone = badgeTone(currentStatus);
  const isDeclined = currentStatus === "DECLINED";

  const hasDriver = !!booking.assignment?.driver;
  const driver = booking.assignment?.driver;
  const driverName = driver?.name?.trim() || "Your Driver";
  const driverPhone = driver?.phone || null;
  const driverImage = driver?.image || null;

  const vehicleUnit = booking.assignment?.vehicleUnit;
  const vehicleUnitDisplay = vehicleUnit
    ? `${vehicleUnit.name}${vehicleUnit.plate ? ` (${vehicleUnit.plate})` : ""}`
    : null;

  const passengerName =
    booking.corporatePassenger?.name?.trim() || "—";
  const passengerEmail = booking.corporatePassenger?.email || null;
  const passengerPhone = booking.corporatePassenger?.phone || null;
  const passengerDepartment = booking.corporatePassenger?.department || null;

  const hasStops = booking.stops && booking.stops.length > 0;
  const stopCount = booking.stops?.length ?? 0;
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
  const totalWaitTimeMinutes =
    booking.stops?.reduce((sum, s) => sum + (s.waitTimeMinutes ?? 5), 0) ?? 0;

  const hasFlightInfo =
    booking.flightAirline ||
    booking.flightNumber ||
    booking.flightScheduledAt ||
    booking.flightTerminal ||
    booking.flightGate;

  const hasRouteCoordinates =
    booking.pickupLat &&
    booking.pickupLng &&
    booking.dropoffLat &&
    booking.dropoffLng;

  const stopsForMap =
    booking.stops
      ?.map((s) => ({
        lat: toNumber(s.lat)!,
        lng: toNumber(s.lng)!,
        address: s.address,
        stopOrder: s.stopOrder,
      }))
      .filter((s) => s.lat && s.lng) ?? [];

  let invoiceData: InvoiceData | null = null;
  let corporateInvoiceId: string | null = null;

  const invoiceLineItem = await db.corporateInvoiceLineItem.findFirst({
    where: { bookingId: booking.id },
    select: { invoiceId: true },
  });

  if (invoiceLineItem) {
    corporateInvoiceId = invoiceLineItem.invoiceId;
    const result = await getCorporateInvoiceData(invoiceLineItem.invoiceId);
    if (result.ok) {
      invoiceData = result.data;
    }
  }

  return (
    <section className={styles.container}>
      <header className="header">
        <Link href="/corporate/bookings" className="backBtn">
          ← Back to Bookings
        </Link>
        <div className={styles.headerTop}>
          <div className={styles.headerTopLeft}>
            <h1 className={`${styles.heading} h2`}>Booking Details</h1>
          </div>
          <div className={styles.headerTopRight}>
            <div className="emptyTitle">Confirmation #</div>
            <div className={styles.confirmationValue}>
              {getConfirmationCode(booking.id)}
            </div>
          </div>
        </div>

        <div className={styles.box}>
          <div className={styles.boxLeft}>
            <div style={{ marginTop: 12 }}>
              <div className="emptyTitle">Current Status:</div>
              <div style={{ marginTop: 6 }}>
                <span className={`badge badge_${currentStatusTone}`}>
                  {currentStatusLabel}
                </span>
              </div>
            </div>

            {isDeclined && booking.declineReason && (
              <div className={styles.declineReasonBox}>
                <strong>Decline Reason:</strong> {booking.declineReason}
              </div>
            )}
          </div>

          <div className={styles.boxRight}>
            <div style={{ marginTop: 12 }}>
              <div className="emptyTitle">Billing:</div>
              <div className={styles.paymentInfo}>
                <span className="badge badge_accent">Corporate Billing</span>
                {booking.totalCents > 0 && (
                  <span className={styles.paymentAmount}>
                    {formatMoney(booking.totalCents, booking.currency)}
                  </span>
                )}
              </div>

              {booking.discountCents && booking.discountCents > 0 ? (
                <div className={styles.discountDisplay}>
                  <span style={{ color: "#15803d", fontWeight: 600 }}>
                    −{formatMoney(booking.discountCents, booking.currency)} off
                    {booking.corporateAccount?.discountPercent
                      ? ` (${Number(booking.corporateAccount.discountPercent)}%)`
                      : ""}
                  </span>
                  <span className="miniNote" style={{ marginLeft: 8 }}>
                    was{" "}
                    {formatMoney(
                      booking.totalCents + booking.discountCents,
                      booking.currency,
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <Card title="Passenger">
        <KeyVal k="Name" v={passengerName} />
        {passengerEmail && <KeyVal k="Email" v={passengerEmail} />}
        {passengerPhone && (
          <KeyVal k="Phone" v={`📞 ${formatPhone(passengerPhone)}`} />
        )}
        {passengerDepartment && (
          <KeyVal k="Department" v={passengerDepartment} />
        )}
        {booking.costCenter && (
          <KeyVal k="Cost Center" v={booking.costCenter} />
        )}
        {booking.projectCode && (
          <KeyVal k="Project Code" v={booking.projectCode} />
        )}
      </Card>

      {hasDriver && (
        <Card title="Your Driver">
          <div className={styles.driverSection}>
            <div className={styles.driverImageWrap}>
              <Image
                src={driverImage || DefaultProfileImg}
                alt={driverName}
                title={driverName}
                width={80}
                height={80}
                className={styles.driverImage}
              />
            </div>
            <div className={styles.driverInfo}>
              <KeyVal k="Driver" v={driverName} />
              {vehicleUnitDisplay && (
                <KeyVal k="Vehicle" v={vehicleUnitDisplay} />
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

      <Card title="Trip">
        <KeyVal k="Date" v={formatDateTime(booking.pickupAt, companyTz)} />
        <KeyVal
          k="Distance / duration"
          v={`${toNumber(booking.distanceMiles) ?? "—"} mi • ${booking.durationMinutes ?? "—"} min${hasStops ? ` (includes ${stopCount} stop${stopCount > 1 ? "s" : ""})` : ""}`}
        />
        <KeyVal
          k="Amount"
          v={formatMoney(booking.totalCents, booking.currency)}
        />
        {booking.discountCents && booking.discountCents > 0 ? (
          <div className={styles.keyVal}>
            <div className="emptyTitle">Corporate discount</div>
            <p className="subheading" style={{ color: "#15803d" }}>
              −{formatMoney(booking.discountCents, booking.currency)} off
              {booking.corporateAccount?.discountPercent
                ? ` (${Number(booking.corporateAccount.discountPercent)}%)`
                : ""}
              <span
                style={{
                  marginLeft: 8,
                  color: "var(--paragraph)",
                  fontWeight: 400,
                }}
              >
                was{" "}
                {formatMoney(
                  booking.totalCents + booking.discountCents,
                  booking.currency,
                )}
              </span>
            </p>
          </div>
        ) : null}
        {booking.specialRequests && (
          <KeyVal k="Special requests" v={booking.specialRequests} />
        )}
        <KeyVal k="Booked" v={formatDateTime(booking.createdAt, companyTz)} />
        <KeyVal k="Service" v={booking.serviceType?.name ?? "—"} />
        <KeyVal k="Vehicle category" v={booking.vehicle?.name ?? "—"} />

        {hasStops ? (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.stopsSection}>
              <div className="cardTitle h5" style={{ marginBottom: 10 }}>
                <span style={{ marginRight: "2rem" }}>🛑</span>Route with{" "}
                {stopCount} Extra Stop{stopCount > 1 ? "s" : ""}
              </div>
              <div className={styles.routeTimeline}>
                <div className={styles.routePoint}>
                  <div
                    className={styles.routeMarker}
                    style={{ background: "#22c55e" }}
                  >
                    A
                  </div>
                  <div className={styles.routeAddress}>
                    <div className="emptyTitle">Pickup</div>
                    <p className="subheading">{booking.pickupAddress}</p>
                  </div>
                </div>

                {booking.stops.map((stop, index) => (
                  <div key={stop.id} className={styles.routePoint}>
                    <div
                      className={styles.routeMarker}
                      style={{ background: "#3b82f6" }}
                    >
                      {index + 1}
                    </div>
                    <div className={styles.routeAddress}>
                      <div className="emptyTitle">Stop {index + 1}</div>
                      <p className="subheading">{stop.address}</p>
                      <span className="miniNote">
                        ~{stop.waitTimeMinutes ?? 5} min wait
                      </span>
                    </div>
                  </div>
                ))}

                <div className={styles.routePoint}>
                  <div
                    className={styles.routeMarker}
                    style={{ background: "#ef4444" }}
                  >
                    B
                  </div>
                  <div className={styles.routeAddress}>
                    <div className="emptyTitle">Dropoff</div>
                    <p className="subheading">{booking.dropoffAddress}</p>
                  </div>
                </div>
              </div>

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
            <KeyVal k="Pickup" v={booking.pickupAddress} />
            <KeyVal k="Dropoff" v={booking.dropoffAddress} />
          </>
        )}

        <KeyVal
          k="Passengers / luggage"
          v={`${booking.passengers} / ${booking.luggage}`}
        />

        {hasRouteCoordinates && (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.routeMapSection}>
              <div className="cardTitle h5" style={{ marginBottom: 10 }}>
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

        {hasFlightInfo && (
          <>
            <div className={styles.sectionDivider} />
            <div className={styles.flightSection}>
              <div className="cardTitle h5" style={{ marginBottom: 10 }}>
                ✈️ Flight Information
              </div>
              {booking.flightAirline && (
                <KeyVal k="Airline" v={booking.flightAirline} />
              )}
              {booking.flightNumber && (
                <KeyVal k="Flight Number" v={booking.flightNumber} />
              )}
              {booking.flightScheduledAt && (
                <KeyVal
                  k="Scheduled Time"
                  v={formatDateTime(booking.flightScheduledAt, companyTz)}
                />
              )}
              {booking.flightTerminal && (
                <KeyVal k="Terminal" v={booking.flightTerminal} />
              )}
              {booking.flightGate && (
                <KeyVal k="Gate" v={booking.flightGate} />
              )}
            </div>
          </>
        )}
      </Card>

      {invoiceData && (
        <Card title="Invoice">
          <InvoiceSection invoice={invoiceData} bookingId={booking.id} />
        </Card>
      )}

      <Card title="Need Help?">
        <div className={styles.helpContent}>
          <p className="subheading">
            If you have questions about this booking or need to make changes,
            please contact us.
          </p>
          <div className={styles.helpActions}>
            {supportPhone && (
              <a href={`tel:${supportPhone}`} className={styles.helpButton}>
                📞 Call Support
              </a>
            )}
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} className={styles.helpButton}>
                ✉️ Email Us
              </a>
            )}
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
        <div className="cardTitle h4">{title}</div>
      </div>
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <div className="emptyTitle">{k}</div>
      <p className="subheading">{v}</p>
    </div>
  );
}