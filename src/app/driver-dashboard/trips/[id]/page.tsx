/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { BookingStatus } from "@prisma/client";

import styles from "./DriverTripDetailPage.module.css";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import TripStatusStepper from "@/components/Driver/TripStatusStepper/TripStatusStepper";
import FlightStatusCard from "@/components/admin/FlightStatusCard/FlightStatusCard";
import Button from "@/components/shared/Button/Button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

function formatMoney(cents: number | null | undefined, currency = "USD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// Helper to convert Prisma Decimal to number
function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof (val as any).toNumber === "function")
    return (val as any).toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function getGoogleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function getWazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

function getAppleMapsUrl(address: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}

// Calculate remaining wait minutes for no-show (server-side)
function calculateWaitMinutes(arrivedAt: Date | null): number {
  if (!arrivedAt) return 0;
  const arrivedTime = new Date(arrivedAt).getTime();
  const currentTime = new Date().getTime();
  const waitedMs = currentTime - arrivedTime;
  const waitedMin = waitedMs / (1000 * 60);
  return Math.max(0, Math.ceil(15 - waitedMin));
}

// Terminal statuses
const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
];

// Pickup navigation statuses
const PICKUP_NAV_STATUSES: BookingStatus[] = [
  BookingStatus.ASSIGNED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
];

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

export default async function DriverTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverId = await resolveSessionUserId(session);
  if (!driverId) redirect("/");

  const { timezone: companyTz } = await getCompanySettings();

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      serviceType: { select: { name: true, slug: true, airportLeg: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: {
          driver: { select: { id: true, name: true } },
          vehicleUnit: { select: { name: true, plate: true } },
        },
      },
      stops: {
        orderBy: { stopOrder: "asc" },
      },
      corporateAccount: {
        select: { name: true },
      },
      corporatePassenger: {
        select: { name: true, email: true, phone: true, department: true },
      },
      statusEvents: {
        where: { status: BookingStatus.ARRIVED },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!booking) return notFound();

  // Verify this driver is assigned (or is admin)
  const isAdmin = roles?.includes("ADMIN");
  if (!isAdmin && booking.assignment?.driverId !== driverId) {
    redirect("/driver-dashboard");
  }

  // Customer info
  const isCorporateBooking = Boolean(booking.corporateAccountId);
  const customerName =
    booking.user?.name?.trim() ||
    booking.guestName?.trim() ||
    (booking as any).corporatePassenger?.name?.trim() ||
    "Customer";
  const customerPhone =
    booking.user?.phone ||
    booking.guestPhone ||
    (booking as any).corporatePassenger?.phone ||
    null;
  const customerEmail =
    booking.user?.email ||
    booking.guestEmail ||
    (booking as any).corporatePassenger?.email ||
    null;
  const corporateAccountName = (booking as any).corporateAccount?.name ?? null;
  const corporatePassengerDepartment =
    (booking as any).corporatePassenger?.department ?? null;

  // Vehicle unit info
  const vehicleUnit = booking.assignment?.vehicleUnit;
  const vehicleUnitDisplay = vehicleUnit
    ? `${vehicleUnit.name}${vehicleUnit.plate ? ` (${vehicleUnit.plate})` : ""}`
    : booking.vehicle?.name || "—";

  // Earnings for driver
  const driverPaymentCents = booking.assignment?.driverPaymentCents ?? null;
  const tipCents = 0; // Would need to fetch from payment if tips are tracked

  // Arrived timestamp for no-show timer
  const arrivedEvent = booking.statusEvents[0];
  const arrivedAt = arrivedEvent?.createdAt ?? null;

  // Calculate initial wait minutes on server
  const initialWaitMinutes =
    booking.status === BookingStatus.ARRIVED
      ? calculateWaitMinutes(arrivedAt)
      : 0;

  // Check if trip is active (not terminal)
  const isActive = !TERMINAL_STATUSES.includes(booking.status as BookingStatus);

  // Flight tracking
  const flightDateForLookup = booking.flightScheduledAt
    ? new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: companyTz,
      }).format(booking.flightScheduledAt)
    : new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: companyTz,
      }).format(booking.pickupAt);

  const airportLeg = (booking.serviceType?.airportLeg ?? "NONE") as
    | "PICKUP"
    | "DROPOFF"
    | "NONE";

  // Determine which address to show for navigation
  const currentStatus = booking.status as BookingStatus;
  const showPickupNav = PICKUP_NAV_STATUSES.includes(currentStatus);
  const showDropoffNav = currentStatus === BookingStatus.IN_PROGRESS;

  const navAddress = showPickupNav
    ? booking.pickupAddress
    : showDropoffNav
      ? booking.dropoffAddress
      : null;

  return (
    <section className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href='/driver-dashboard' className='backBtn'>
          ← Back to Dashboard
        </Link>
        <h1 className='cardTitle h5'>Trip Details</h1>
      </header>

      {/* Status Stepper */}
      <div className={styles.stepperSection}>
        <TripStatusStepper
          bookingId={booking.id}
          currentStatus={currentStatus}
          arrivedAt={arrivedAt}
          initialWaitMinutes={initialWaitMinutes}
          pickupAt={booking.pickupAt}
        />
      </div>

      {/* Navigation Section (if active trip) */}
      {isActive && navAddress && (
        <div className={styles.navigationSection}>
          <h2 className={styles.sectionTitle}>
            Navigate to {showPickupNav ? "Pickup" : "Dropoff"}:
          </h2>
          <div className={styles.addressDisplay}>
            <p className={styles.addressText}>{navAddress}</p>
          </div>
          <div className={styles.navButtons}>
            <a
              href={getGoogleMapsUrl(navAddress)}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.navButton}
            >
              <span className={styles.navIcon}>🗺️</span>
              Google Maps
            </a>
            <a
              href={getWazeUrl(navAddress)}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.navButton}
            >
              <span className={styles.navIcon}>🚗</span>
              Waze
            </a>
            <a
              href={getAppleMapsUrl(navAddress)}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.navButton}
            >
              <span className={styles.navIcon}>🍎</span>
              Apple Maps
            </a>
          </div>
        </div>
      )}

      {/* Customer Contact */}
      <div className={styles.card}>
        <h2 className='cardTitle h4'>Customer Details</h2>

        {isCorporateBooking && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              marginBottom: 16,
              padding: "8px 14px",
              borderRadius: 5,
              background: "rgba(124, 58, 237, 0.08)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
            }}
          >
            <span style={{ fontSize: 18 }}>🏢</span>
            <div>
              <div
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  color: "rgb(124, 58, 237)",
                }}
              >
                Corporate Client — {corporateAccountName}
              </div>
              {corporatePassengerDepartment && (
                <div
                  style={{
                    fontSize: "1.2rem",
                    color: "rgb(124, 58, 237, 0.7)",
                    marginTop: 2,
                  }}
                >
                  {corporatePassengerDepartment}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.customerInfo}>
          <div className={styles.customerName}>{customerName}</div>
          {/* {customerEmail && (
            <div className={styles.phoneDisplay}>{customerEmail}</div>
          )} */}
          {customerPhone && (
            <div className={styles.contactButtons}>
              <a href={`tel:${customerPhone}`} className={styles.contactButton}>
                📞 Call
              </a>
              <a href={`sms:${customerPhone}`} className={styles.contactButton}>
                💬 Text
              </a>
            </div>
          )}
          {customerPhone && (
            <div className={styles.phoneDisplay}>{customerPhone}</div>
          )}
          {!customerPhone && (
            <div className={styles.noPhone}>No phone number on file</div>
          )}
        </div>
      </div>

      {/* Trip Details */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>📍 Route</h2>

        <div className={styles.routeTimeline}>
          {/* Pickup */}
          <div className={styles.routePoint}>
            <div className={`${styles.routeMarker} ${styles.markerPickup}`}>
              A
            </div>
            <div className={styles.routeDetails}>
              <div className={styles.routeLabel}>Pickup</div>
              <div className={styles.routeAddress}>{booking.pickupAddress}</div>
              <div className={styles.routeTime}>
                {formatTime(booking.pickupAt, companyTz)}{" "}
              </div>
            </div>
          </div>

          {/* Stops */}
          {booking.stops.map((stop, index) => (
            <div key={stop.id} className={styles.routePoint}>
              <div className={`${styles.routeMarker} ${styles.markerStop}`}>
                {index + 1}
              </div>
              <div className={styles.routeDetails}>
                <div className={styles.routeLabel}>Stop {index + 1}</div>
                <div className={styles.routeAddress}>{stop.address}</div>
                <div className={styles.routeWait}>
                  ~{stop.waitTimeMinutes ?? 5} min wait
                </div>
              </div>
            </div>
          ))}

          {/* Dropoff */}
          <div className={styles.routePoint}>
            <div className={`${styles.routeMarker} ${styles.markerDropoff}`}>
              B
            </div>
            <div className={styles.routeDetails}>
              <div className={styles.routeLabel}>Dropoff</div>
              <div className={styles.routeAddress}>
                {booking.dropoffAddress}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className={styles.card}>
        <h2 className='cardTitle h4'>Trip Info</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Date & Time</span>
            <span className={styles.infoValue}>
              {formatDateTime(booking.pickupAt, companyTz)}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Service</span>
            <span className={styles.infoValue}>
              {booking.serviceType?.name || "—"}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Vehicle</span>
            <span className={styles.infoValue}>{vehicleUnitDisplay}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Passengers</span>
            <span className={styles.infoValue}>{booking.passengers}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Luggage</span>
            <span className={styles.infoValue}>{booking.luggage}</span>
          </div>
          {booking.distanceMiles && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Distance</span>
              <span className={styles.infoValue}>
                {toNumber(booking.distanceMiles)} mi
              </span>
            </div>
          )}
        </div>

        {/* Special Requests */}
        {booking.specialRequests && (
          <div className={styles.specialRequests}>
            <h2 className='cardTitle h4'>⚠️ Special Requests</h2>
            <div className={styles.specialRequestsText}>
              {booking.specialRequests}
            </div>
          </div>
        )}

        {/* Flight Info + Live Status */}
        {(booking.flightAirline || booking.flightNumber) && (
          <div className={styles.flightInfo}>
            <h2 className='cardTitle h4'>✈️ Flight Info</h2>
            <div className={styles.flightInfoContent}>
              {booking.flightAirline && <span>{booking.flightAirline}</span>}
              {booking.flightNumber && (
                <span>Flight {booking.flightNumber}</span>
              )}
              {booking.flightTerminal && (
                <span>Terminal {booking.flightTerminal}</span>
              )}
            </div>
            {booking.flightNumber && (
              <div style={{ marginTop: 16 }}>
                <FlightStatusCard
                  flightNumber={booking.flightNumber}
                  flightDate={flightDateForLookup}
                  airportLeg={airportLeg}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Earnings */}
      {driverPaymentCents !== null && (
        <div className={styles.card}>
          <h2 className='cardTitle h4'>Your Earnings</h2>
          <div className={styles.earningsDisplay}>
            <div className={styles.earningsMain}>
              <span className={styles.earningsLabel}>Trip Payment</span>
              <span className={styles.earningsAmount}>
                {formatMoney(driverPaymentCents, booking.currency)}
              </span>
            </div>
            {tipCents > 0 && (
              <div className={styles.earningsTip}>
                <span className={styles.earningsLabel}>+ Tip</span>
                <span className={styles.earningsAmount}>
                  {formatMoney(tipCents, booking.currency)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Greetsign */}
      <div className={styles.card}>
        <h2 className='cardTitle h4'>🪧 Meet & Greet</h2>
        <p
          style={{
            fontSize: "1.25rem",
            opacity: 0.7,
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          Display a full-screen sign with the passenger&apos;s name for airport
          pickups.
        </p>

        <Button
          href={`/driver-dashboard/trips/${booking.id}/greetsign`}
          text='Open Greetsign'
          btnType='black'
          arrow
        />
      </div>

      {/* Admin Link (for admins only) */}
      {isAdmin && (
        <div className={styles.adminLink}>
          <Link
            href={`/admin/bookings/${booking.id}`}
            className={styles.adminButton}
          >
            View in Admin Panel →
          </Link>
        </div>
      )}
    </section>
  );
}
