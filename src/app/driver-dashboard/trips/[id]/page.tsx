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

import Location from "@/components/shared/icons/Location/Location";
import Car from "@/components/shared/icons/Car/Car";
import Business from "@/components/shared/icons/Business/Business";
import AddressLines from "@/components/shared/AddressLines/AddressLines";
import { relativeFromNow } from "@/lib/relativeTime";
import {
  isTripPrivate,
  privateAddress,
  privateName,
  PRIVATE_CONTACT_NOTE,
} from "@/lib/tripPrivacy";
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

// Header labels and badge tones for each status.
const STATUS_TEXT: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  EN_ROUTE: "En route",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
};

const STATUS_TONE: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: "good",
  ASSIGNED: "good",
  EN_ROUTE: "accent",
  IN_PROGRESS: "accent",
  ARRIVED: "warn",
  COMPLETED: "good",
  CANCELLED: "bad",
  NO_SHOW: "bad",
};

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

  const {
    timezone: companyTz,
    dispatchPhone,
    dispatchPhoneRaw,
  } = await getCompanySettings();

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

  // Once the ride is over, the passenger's contact details and exact
  // addresses are hidden from the driver (admins still see them). See
  // tripPrivacy.ts.
  const isPrivate = isTripPrivate(booking.status, isAdmin);
  const shownAddress = (address: string) =>
    isPrivate ? privateAddress(address) : address;

  // Customer info
  const isCorporateBooking = Boolean(booking.corporateAccountId);
  const fullCustomerName =
    booking.user?.name?.trim() ||
    booking.guestName?.trim() ||
    (booking as any).corporatePassenger?.name?.trim() ||
    "Customer";
  const customerName = isPrivate
    ? privateName(fullCustomerName)
    : fullCustomerName;
  const customerPhone = isPrivate
    ? null
    : booking.user?.phone ||
      booking.guestPhone ||
      (booking as any).corporatePassenger?.phone ||
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
    "PICKUP" | "DROPOFF" | "NONE";

  // Determine which address to show for navigation
  const currentStatus = booking.status as BookingStatus;
  const showPickupNav = PICKUP_NAV_STATUSES.includes(currentStatus);
  const showDropoffNav = currentStatus === BookingStatus.IN_PROGRESS;

  const navAddress = showPickupNav
    ? booking.pickupAddress
    : showDropoffNav
      ? booking.dropoffAddress
      : null;

  const tz = companyTz;
  const pickupTime = formatTime(booking.pickupAt, tz);
  const pickupDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz,
  }).format(booking.pickupAt);
  const rel = isActive ? relativeFromNow(booking.pickupAt) : null;
  const statusLabel = STATUS_TEXT[currentStatus] ?? currentStatus;
  const hasFlight = Boolean(booking.flightAirline || booking.flightNumber);
  const isAirportPickup = airportLeg === "PICKUP" || hasFlight;
  const miles = toNumber(booking.distanceMiles);

  return (
    <section className={styles.container}>
      {/* Header: what this ride is, at a glance */}
      <header className={styles.header}>
        <Link href='/driver-dashboard/trips' className='backBtn'>
          ← Back to trips
        </Link>
        <div className={styles.summary}>
          <div className={styles.summaryTags}>
            {rel ? <span className={styles.relPill}>{rel}</span> : null}
            <span
              className={`badge badge_${STATUS_TONE[currentStatus] ?? "neutral"}`}
            >
              {statusLabel}
            </span>
          </div>
          <h1 className={styles.summaryTime}>{pickupTime}</h1>
          <p className={styles.summaryDate}>{pickupDate}</p>
          <p className={styles.summaryMeta}>
            {booking.serviceType?.name || "Trip"} · {vehicleUnitDisplay}
          </p>
        </div>
      </header>

      {/* Status and the next step */}
      <TripStatusStepper
        bookingId={booking.id}
        currentStatus={currentStatus}
        arrivedAt={arrivedAt}
        initialWaitMinutes={initialWaitMinutes}
        pickupAt={booking.pickupAt}
        customerPhone={isActive ? customerPhone : null}
      />

      {/* Special requests: before arriving, not after */}
      {booking.specialRequests && !isPrivate && (
        <p className={styles.requests}>
          <strong>Special requests:</strong> {booking.specialRequests}
        </p>
      )}

      {/* Passenger, and where to go next */}
      <div
        className={`${styles.pair} ${isActive && navAddress ? "" : styles.pairSingle}`}
      >
        <div className={styles.card}>
          <h2 className='cardTitle h4'>Passenger</h2>
          <div className={styles.passenger}>
            <p className={styles.passengerName}>{customerName}</p>
            {isCorporateBooking && (
              <p className={styles.corporateLine}>
                <Business aria-hidden='true' className={styles.corporateIcon} />
                {corporateAccountName}
                {corporatePassengerDepartment
                  ? ` · ${corporatePassengerDepartment}`
                  : ""}
              </p>
            )}
            {isPrivate ? (
              <p className={styles.privateNote}>
                {PRIVATE_CONTACT_NOTE}
                {dispatchPhone ? (
                  <>
                    {" "}
                    <a
                      href={
                        dispatchPhoneRaw
                          ? `tel:+1${dispatchPhoneRaw}`
                          : `tel:${dispatchPhone}`
                      }
                      className={styles.privateLink}
                    >
                      {dispatchPhone}
                    </a>
                  </>
                ) : null}
              </p>
            ) : customerPhone ? (
              <>
                <p className={styles.phoneDisplay}>{customerPhone}</p>
                <div className={styles.contactButtons}>
                  <a
                    href={`tel:${customerPhone}`}
                    className={styles.contactButton}
                  >
                    Call
                  </a>
                  <a
                    href={`sms:${customerPhone}`}
                    className={`${styles.contactButton} ${styles.contactButtonOutline}`}
                  >
                    Text
                  </a>
                </div>
              </>
            ) : (
              <p className={styles.noPhone}>No phone number on file</p>
            )}
          </div>
        </div>

        {isActive && navAddress && (
          <div className={styles.card}>
            <h2 className='cardTitle h4'>
              Navigate to {showPickupNav ? "pickup" : "drop-off"}
            </h2>
            <AddressLines address={navAddress} className={styles.navAddress} />
            <div className={styles.navButtons}>
              <a
                href={getGoogleMapsUrl(navAddress)}
                target='_blank'
                rel='noopener noreferrer'
                className={`${styles.navButton} ${styles.navButtonPrimary}`}
              >
                <Location aria-hidden='true' className={styles.navIcon} />
                Google Maps
              </a>
              <a
                href={getWazeUrl(navAddress)}
                target='_blank'
                rel='noopener noreferrer'
                className={styles.navButton}
              >
                <Car aria-hidden='true' className={styles.navIcon} />
                Waze
              </a>
              <a
                href={getAppleMapsUrl(navAddress)}
                target='_blank'
                rel='noopener noreferrer'
                className={styles.navButton}
              >
                <Location aria-hidden='true' className={styles.navIcon} />
                Apple Maps
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Airport pickups: the flight, and the sign for the curb */}
      {isAirportPickup && (
        <div className={styles.card}>
          <h2 className='cardTitle h4'>
            {isActive ? <>Flight and meet &amp; greet</> : "Flight"}
          </h2>
          {hasFlight ? (
            <>
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
                <FlightStatusCard
                  flightNumber={booking.flightNumber}
                  flightDate={flightDateForLookup}
                  airportLeg={airportLeg}
                />
              )}
            </>
          ) : (
            <p className={styles.muted}>No flight details on this booking.</p>
          )}
          {isActive && (
            <div className={styles.greet}>
              <p className={styles.muted}>
                Show a full-screen sign with the passenger&apos;s name at
                arrivals.
              </p>
              <Button
                href={`/driver-dashboard/trips/${booking.id}/greetsign`}
                text='Open greet sign'
                btnType='black'
                arrow
              />
            </div>
          )}
        </div>
      )}

      {/* Route */}
      <div className={styles.card}>
        <h2 className='cardTitle h4'>Route</h2>
        {(miles || booking.durationMinutes) && (
          <p className={styles.routeSummary}>
            {miles ? `${miles} mi` : ""}
            {miles && booking.durationMinutes ? " · " : ""}
            {booking.durationMinutes
              ? `about ${booking.durationMinutes} min`
              : ""}
          </p>
        )}

        {isPrivate && (
          <p className={styles.privacyNote}>
            Exact addresses are hidden once a trip is over, to protect the
            passenger&apos;s privacy. Named places keep their name.
          </p>
        )}

        <div className={styles.routeTimeline}>
          <div className={styles.routePoint}>
            <div className={`${styles.routeMarker} ${styles.markerPickup}`}>
              A
            </div>
            <div className={styles.routeDetails}>
              <div className={styles.routeLabel}>Pickup · {pickupTime}</div>
              <AddressLines
                address={shownAddress(booking.pickupAddress)}
                className={styles.routeAddress}
              />
            </div>
          </div>

          {booking.stops.map((stop, index) => (
            <div key={stop.id} className={styles.routePoint}>
              <div className={`${styles.routeMarker} ${styles.markerStop}`}>
                {index + 1}
              </div>
              <div className={styles.routeDetails}>
                <div className={styles.routeLabel}>
                  Stop {index + 1} · ~{stop.waitTimeMinutes ?? 5} min wait
                </div>
                <AddressLines
                  address={shownAddress(stop.address)}
                  className={styles.routeAddress}
                />
              </div>
            </div>
          ))}

          <div className={styles.routePoint}>
            <div className={`${styles.routeMarker} ${styles.markerDropoff}`}>
              B
            </div>
            <div className={styles.routeDetails}>
              <div className={styles.routeLabel}>Drop-off</div>
              <AddressLines
                address={shownAddress(booking.dropoffAddress)}
                className={styles.routeAddress}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trip info */}
      <div className={styles.card}>
        <h2 className='cardTitle h4'>Trip info</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Date &amp; time</span>
            <span className={styles.infoValue}>
              {formatDateTime(booking.pickupAt, tz)}
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
        </div>
      </div>

      {/* Earnings */}
      {driverPaymentCents !== null && (
        <div className={styles.card}>
          <h2 className='cardTitle h4'>Your earnings</h2>
          <div className={styles.earningsDisplay}>
            <div className={styles.earningsMain}>
              <span className={styles.earningsLabel}>Trip payment</span>
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
