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
import DefaultProfileImg from "../../../../../public/images/areas/mesaii.jpg";
import RouteMapDisplay from "@/components/admin/RouteMapDisplay/RouteMapDisplay";
import InvoiceSection from "@/app/dashboard/trips/[id]/InvoiceSection";
import { getCorporateInvoiceData } from "../../../../../actions/corporate/getCorporateInvoiceData";
import type { InvoiceData } from "@/lib/invoice/types";
import { EXTRA_STOP_FEE_CENTS } from "@/lib/pricing/calcQuote";
import AddressLines from "@/components/shared/AddressLines/AddressLines";
import AddToCalendar from "@/components/Dashboard/AddToCalendar/AddToCalendar";
import { rideCalendarEvent } from "@/components/Dashboard/AddToCalendar/rideEvent";
import Phone from "@/components/shared/icons/Phone/Phone";
import Email from "@/components/shared/icons/Email/Email";
import Plane from "@/components/shared/icons/Plane/Plane";
import RedoIcon from "@/components/shared/icons/RedoIcon/RedoIcon";
import { relativeFromNow } from "@/lib/relativeTime";
import { SITE } from "@/config/site";

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

/** Whether a pickup time is more than two hours behind us. */
function overTwoHoursAgo(d: Date) {
  return d.getTime() < Date.now() - 2 * 60 * 60 * 1000;
}

function getConfirmationCode(bookingId: string): string {
  return bookingId.slice(0, 8).toUpperCase();
}

function statusLabel(status: BookingStatus): string {
  switch (status) {
    case "PENDING_REVIEW":
      return "Awaiting approval";
    case "DECLINED":
      return "Declined";
    case "PENDING_PAYMENT":
      return "Payment due";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Chauffeur assigned";
    case "EN_ROUTE":
      return "On the way";
    case "ARRIVED":
      return "Chauffeur arrived";
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
          status: true,
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

  // Header: the ride at a glance, as on the customer's trip page.
  const ACTIVE: BookingStatus[] = [
    "PENDING_REVIEW",
    "PENDING_PAYMENT",
    "CONFIRMED",
    "ASSIGNED",
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
  ];
  const isUpcoming =
    ACTIVE.includes(currentStatus) && !overTwoHoursAgo(booking.pickupAt);
  const rel = isUpcoming ? relativeFromNow(booking.pickupAt) : null;
  const pickupTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: companyTz,
  }).format(booking.pickupAt);
  const pickupDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: companyTz,
  }).format(booking.pickupAt);
  // Book again: rides that are over, while the account can book.
  const canBookAgain =
    booking.corporateAccount?.status === "ACTIVE" &&
    ["COMPLETED", "CANCELLED", "NO_SHOW", "REFUNDED"].includes(currentStatus);
  const calendarEvent = rideCalendarEvent(
    {
      id: booking.id,
      pickupAt: booking.pickupAt,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      serviceName: booking.serviceType?.name ?? "Ride",
      vehicleName: booking.vehicle?.name ?? null,
      durationMinutes: booking.durationMinutes,
      hoursRequested: booking.hoursRequested,
      flight: booking.flightNumber
        ? [booking.flightAirline, booking.flightNumber]
            .filter(Boolean)
            .join(" ")
        : null,
    },
    {
      name: companySettings.companyName || SITE.name,
      dispatchPhone: companySettings.dispatchPhone,
    },
  );
  calendarEvent.url = `${SITE.url.replace(/\/$/, "")}/corporate/bookings/${booking.id}`;

  const hasDriver = !!booking.assignment?.driver;
  const driver = booking.assignment?.driver;
  const driverName = driver?.name?.trim() || "Your chauffeur";
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
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * EXTRA_STOP_FEE_CENTS;
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
      <header className={styles.header}>
        <Link href="/corporate/bookings" className="backBtn">
          ← Back to bookings
        </Link>
        <div className={styles.summary}>
          <div className={styles.summaryTags}>
            {rel ? <span className={styles.relPill}>{rel}</span> : null}
            <span className={`badge badge_${currentStatusTone}`}>
              {currentStatusLabel}
            </span>
            <span className="badge badge_neutral">Corporate billing</span>
          </div>
          <h1 className={styles.summaryTime}>{pickupTime}</h1>
          <p className={styles.summaryDate}>{pickupDate}</p>
          <p className={styles.summaryMeta}>
            {passengerName}
            {booking.serviceType?.name ? ` · ${booking.serviceType.name}` : ""}
            {booking.vehicle?.name ? ` · ${booking.vehicle.name}` : ""}
            {booking.totalCents > 0
              ? ` · ${formatMoney(booking.totalCents, booking.currency)}`
              : ""}
          </p>
          {booking.discountCents && booking.discountCents > 0 ? (
                <div className={styles.discountDisplay}>
                  <span style={{ color: "var(--darkGreen)", fontWeight: 600 }}>
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
          <p className={styles.confirmation}>
            Confirmation #
            <span className={styles.confirmationValue}>
              {getConfirmationCode(booking.id)}
            </span>
          </p>
        </div>

        {isDeclined && booking.declineReason && (
          <div className={styles.declineReasonBox}>
            <strong>Why it was declined:</strong> {booking.declineReason}
          </div>
        )}

        {(isUpcoming && currentStatus !== "PENDING_REVIEW") || canBookAgain ? (
          <div className={styles.headerActions}>
            {isUpcoming && currentStatus !== "PENDING_REVIEW" ? (
              <AddToCalendar
                icsHref={`/corporate/bookings/${booking.id}/calendar`}
                event={calendarEvent}
              />
            ) : null}
            {canBookAgain ? (
              <Link
                href={`/corporate/bookings/new?again=${booking.id}`}
                className={styles.againButton}
              >
                <RedoIcon className={styles.againIcon} aria-hidden="true" />
                Book this again
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      <Card title="Passenger">
        <KeyVal k="Name" v={passengerName} />
        {passengerEmail && <KeyVal k="Email" v={passengerEmail} />}
        {passengerPhone && (
          <KeyVal
            k="Phone"
            v={
              <a href={`tel:${passengerPhone}`} className={styles.inlineLink}>
                {formatPhone(passengerPhone)}
              </a>
            }
          />
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
        <Card title="Your chauffeur">
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
              <KeyVal k="Chauffeur" v={driverName} />
              {vehicleUnitDisplay && (
                <KeyVal k="Vehicle" v={vehicleUnitDisplay} />
              )}
              {driverPhone && (
                <div className={styles.driverContact}>
                  <a
                    href={`tel:${driverPhone}`}
                    className={styles.contactButton}
                  >
                    <Phone className={styles.contactIcon} aria-hidden="true" />
                    Call
                  </a>
                  <a
                    href={`sms:${driverPhone}`}
                    className={styles.contactButton}
                  >
                    Text
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
          v={`${toNumber(booking.distanceMiles) ?? "—"} mi · ${booking.durationMinutes ?? "—"} min${hasStops ? ` (includes ${stopCount} stop${stopCount > 1 ? "s" : ""})` : ""}`}
        />
        <KeyVal
          k="Amount"
          v={formatMoney(booking.totalCents, booking.currency)}
        />
        {booking.discountCents && booking.discountCents > 0 ? (
          <div className={styles.keyVal}>
            <div className="emptyTitle">Corporate discount</div>
            <p className="subheading" style={{ color: "var(--darkGreen)" }}>
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
                Route with {stopCount} extra stop{stopCount > 1 ? "s" : ""}
              </div>
              <div className={styles.routeTimeline}>
                <div className={styles.routePoint}>
                  <div className={`${styles.routeMarker} ${styles.markerPickup}`}>
                    A
                  </div>
                  <div className={styles.routeAddress}>
                    <div className="emptyTitle">Pickup</div>
                    <AddressLines
                      address={booking.pickupAddress}
                      className="subheading"
                    />
                  </div>
                </div>

                {booking.stops.map((stop, index) => (
                  <div key={stop.id} className={styles.routePoint}>
                    <div className={`${styles.routeMarker} ${styles.markerStop}`}>
                      {index + 1}
                    </div>
                    <div className={styles.routeAddress}>
                      <div className="emptyTitle">Stop {index + 1}</div>
                      <AddressLines address={stop.address} className="subheading" />
                      <span className="miniNote">
                        ~{stop.waitTimeMinutes ?? 5} min wait
                      </span>
                    </div>
                  </div>
                ))}

                <div className={styles.routePoint}>
                  <div className={`${styles.routeMarker} ${styles.markerDropoff}`}>
                    B
                  </div>
                  <div className={styles.routeAddress}>
                    <div className="emptyTitle">Drop-off</div>
                    <AddressLines
                      address={booking.dropoffAddress}
                      className="subheading"
                    />
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
            <KeyVal
              k="Pickup"
              v={<AddressLines address={booking.pickupAddress} />}
            />
            <KeyVal
              k="Drop-off"
              v={<AddressLines address={booking.dropoffAddress} />}
            />
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
                <span className={styles.flightTitle}>
                  <Plane className={styles.flightIcon} aria-hidden="true" />
                  Flight
                </span>
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

      <Card title="Need help?">
        <div className={styles.helpContent}>
          <p className="subheading">
            Questions about this ride, or need to change something? Dispatch
            can help.
          </p>
          <div className={styles.helpActions}>
            {supportPhone && (
              <a href={`tel:${supportPhone}`} className={styles.helpButton}>
                <Phone className={styles.contactIcon} aria-hidden="true" />
                Call {supportPhone}
              </a>
            )}
            {supportEmail && (
              <a href={`mailto:${supportEmail}`} className={styles.helpButton}>
                <Email className={styles.contactIcon} aria-hidden="true" />
                Email us
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

function KeyVal({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className={styles.keyVal}>
      <div className="emptyTitle">{k}</div>
      <div className="subheading">{v}</div>
    </div>
  );
}