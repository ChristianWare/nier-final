// The customer's next ride, at the top of their dashboard: when, how long
// until it, where from and to, who's driving (name, car and plate once a
// chauffeur is assigned), the flight, and what it costs. Then View trip,
// Pay now when payment is due, Add to calendar and Call dispatch.

import Button from "@/components/shared/Button/Button";
import AddressLines from "@/components/shared/AddressLines/AddressLines";
import AddToCalendar from "@/components/Dashboard/AddToCalendar/AddToCalendar";
import Driver from "@/components/shared/icons/Driver/Driver";
import Phone from "@/components/shared/icons/Phone/Phone";
import type { CalendarEvent } from "@/lib/calendar";
import { relativeFromNow } from "@/lib/relativeTime";
import styles from "./UserNextTrip.module.css";

export type UserNextTripData = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  /** The category booked ("Luxury SUV"). */
  vehicleName: string | null;
  /** The car itself, once assigned ("Cadillac Escalade"). */
  vehicleUnitName: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
  driverPhone: string | null;
  totalCents: number;
  currency: string;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  isPaid: boolean;
  checkoutUrl: string | null;
  /** "Delta DL 551", when the ride has a flight. */
  flight: string | null;
  durationMinutes: number | null;
  hoursRequested: number | null;
};

type Props = {
  trip: UserNextTripData;
  timeZone: string;
  calendarEvent: CalendarEvent;
  dispatchPhone?: string | null;
  dispatchPhoneTel?: string | null;
};

const STATUS_TEXT: Record<string, string> = {
  PENDING_REVIEW: "Awaiting approval",
  PENDING_PAYMENT: "Payment due",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Chauffeur assigned",
  EN_ROUTE: "On the way",
  ARRIVED: "Chauffeur arrived",
  IN_PROGRESS: "In progress",
};

const STATUS_TONE: Record<string, string> = {
  PENDING_REVIEW: "neutral",
  PENDING_PAYMENT: "warn",
  CONFIRMED: "good",
  ASSIGNED: "good",
  EN_ROUTE: "accent",
  ARRIVED: "accent",
  IN_PROGRESS: "accent",
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** Digits for a tel: link, keeping a leading +. */
function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function UserNextTrip({
  trip,
  timeZone,
  calendarEvent,
  dispatchPhone,
  dispatchPhoneTel,
}: Props) {
  const pickupAt = new Date(trip.pickupAtIso);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(pickupAt);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(pickupAt);

  const href = `/dashboard/trips/${trip.id}`;
  const needsPayment = trip.status === "PENDING_PAYMENT" && !trip.isPaid;
  const awaitingApproval = trip.status === "PENDING_REVIEW";
  const chauffeurFirstName = trip.driverName?.trim().split(/\s+/)[0] ?? null;
  const car = [trip.vehicleUnitName ?? trip.vehicleName, trip.vehiclePlate]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className={styles.container} aria-labelledby='next-trip-title'>
      <header className={styles.top}>
        <h2 id='next-trip-title' className='cardTitle h4'>
          Your next trip
        </h2>
        <div className={styles.tags}>
          <span className={styles.timePill}>{relativeFromNow(pickupAt)}</span>
          <span
            className={`badge badge_${STATUS_TONE[trip.status] ?? "neutral"}`}
          >
            {STATUS_TEXT[trip.status] ?? trip.status.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      {/* When */}
      <div className={styles.when}>
        <p className={styles.time}>{time}</p>
        <p className={styles.date}>{date}</p>
      </div>

      {/* What's needed from the customer, if anything */}
      {needsPayment ? (
        <p className={styles.notice}>
          <strong>Your ride is approved.</strong> Pay{" "}
          {formatMoney(trip.totalCents, trip.currency)} to confirm it.
        </p>
      ) : awaitingApproval ? (
        <p className={styles.notice}>
          <strong>We&apos;re reviewing your request.</strong> You&apos;ll get an
          email as soon as it&apos;s approved, usually within a few hours.
        </p>
      ) : null}

      {/* Where */}
      <ol className={styles.route}>
        <li className={styles.stop}>
          <span
            className={`${styles.dot} ${styles.dotPickup}`}
            aria-hidden='true'
          />
          <span className={styles.stopLabel}>Pickup</span>
          <AddressLines
            address={trip.pickupAddress}
            className={styles.stopAddress}
          />
        </li>
        <li className={styles.stop}>
          <span
            className={`${styles.dot} ${styles.dotDropoff}`}
            aria-hidden='true'
          />
          <span className={styles.stopLabel}>Drop-off</span>
          <AddressLines
            address={trip.dropoffAddress}
            className={styles.stopAddress}
          />
        </li>
      </ol>

      {/* Who's driving */}
      {chauffeurFirstName ? (
        <div className={styles.chauffeur}>
          <span className={styles.chauffeurIcon} aria-hidden='true'>
            <Driver />
          </span>
          <div className={styles.chauffeurText}>
            <span className={styles.chauffeurLabel}>Your chauffeur</span>
            <span className={styles.chauffeurName}>{chauffeurFirstName}</span>
            {car ? <span className={styles.chauffeurCar}>{car}</span> : null}
          </div>
          {trip.driverPhone ? (
            <a
              href={telHref(trip.driverPhone)}
              className={styles.call}
              aria-label={`Call ${chauffeurFirstName}`}
            >
              <Phone className={styles.callIcon} aria-hidden='true' />
              Call
            </a>
          ) : null}
        </div>
      ) : trip.status === "CONFIRMED" ? (
        <p className={styles.muted}>
          Your chauffeur&apos;s name, car and plate show here once they&apos;re
          assigned, usually the day before your ride.
        </p>
      ) : null}

      {/* The rest */}
      <dl className={styles.details}>
        <div className={styles.detail}>
          <dt>Service</dt>
          <dd>{trip.serviceName}</dd>
        </div>
        <div className={styles.detail}>
          <dt>Vehicle</dt>
          <dd>{trip.vehicleName ?? "To be confirmed"}</dd>
        </div>
        <div className={styles.detail}>
          <dt>Passengers</dt>
          <dd>
            {trip.passengers} · {trip.luggage} bag
            {trip.luggage === 1 ? "" : "s"}
          </dd>
        </div>
        {trip.flight ? (
          <div className={styles.detail}>
            <dt>Flight</dt>
            <dd>{trip.flight}</dd>
          </div>
        ) : null}
        <div className={styles.detail}>
          <dt>Total</dt>
          <dd className={styles.total}>
            {formatMoney(trip.totalCents, trip.currency)}
            {trip.isPaid ? <span className={styles.paid}>Paid</span> : null}
          </dd>
        </div>
      </dl>

      <div className={styles.actions}>
        {needsPayment ? (
          <Button href={href} text='Pay now' btnType='red' arrow />
        ) : null}
        <Button href={href} text='View trip' btnType='black' arrow />
        {!awaitingApproval ? (
          <AddToCalendar bookingId={trip.id} event={calendarEvent} />
        ) : null}
        {dispatchPhone ? (
          <a
            href={
              dispatchPhoneTel
                ? `tel:${dispatchPhoneTel}`
                : telHref(dispatchPhone)
            }
            className={styles.dispatch}
          >
            <Phone className={styles.dispatchIcon} aria-hidden='true' />
            Call dispatch
          </a>
        ) : null}
      </div>
    </section>
  );
}
