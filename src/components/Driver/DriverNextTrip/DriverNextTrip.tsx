"use client";

// The driver's next ride, at the top of the driver dashboard: when, how
// long until it, where from and to, who the passenger is (tap to call),
// the flight, pay and any special requests. "Navigate" opens Google Maps
// directions: to the pickup, or to the drop-off once the passenger is in
// the car. With nothing assigned, it says so and gives dispatch's number.

import Button from "@/components/shared/Button/Button";
import Location from "@/components/shared/icons/Location/Location";
import Phone from "@/components/shared/icons/Phone/Phone";
import AddressLines from "@/components/shared/AddressLines/AddressLines";
import styles from "./DriverNextTrip.module.css";

export type NextTripData = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  customerName: string;
  customerPhone: string | null;
  driverPaymentCents: number | null;
  currency: string;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  /** "Delta DL 551", when the ride has a flight. */
  flight?: string | null;
};

type Props = {
  trip: NextTripData | null;
  timeZone: string;
  /** Dispatch's number, for the empty state. */
  dispatchPhone?: string | null;
  dispatchPhoneTel?: string | null;
};

function formatCurrency(cents: number | null, currency: string = "USD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatPickup(iso: string, timeZone: string) {
  const d = new Date(iso);
  const now = new Date();

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  const diffMs = d.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));

  let rel: string;
  if (mins < 60) {
    rel = `in ${mins} min`;
  } else if (hours < 24) {
    rel = `in ${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    rel = `in ${days} day${days !== 1 ? "s" : ""}`;
  }

  if (diffMs < 0) {
    rel =
      mins < 60
        ? `${mins} min ago`
        : hours < 24
          ? `${hours} hour${hours !== 1 ? "s" : ""} ago`
          : `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  return { dateLabel, timeLabel, rel };
}

function prettyStatus(s: string) {
  const statusMap: Record<string, string> = {
    ASSIGNED: "Assigned",
    EN_ROUTE: "En route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-show",
    CONFIRMED: "Confirmed",
  };
  return statusMap[s] || s.replace(/_/g, " ");
}

function badgeTone(s: string): "neutral" | "warn" | "good" | "accent" | "bad" {
  switch (s) {
    case "ASSIGNED":
    case "CONFIRMED":
      return "good";
    case "EN_ROUTE":
    case "IN_PROGRESS":
      return "accent";
    case "ARRIVED":
      return "warn";
    case "CANCELLED":
    case "NO_SHOW":
      return "bad";
    default:
      return "neutral";
  }
}

/** Google Maps directions from where the phone is now, by car. */
function directionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address,
  )}&travelmode=driving`;
}

/** Digits for a tel: link, keeping a leading +. */
function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function DriverNextTrip({
  trip,
  timeZone,
  dispatchPhone,
  dispatchPhoneTel,
}: Props) {
  if (!trip) {
    return (
      <section className={styles.container}>
        <header className={styles.top}>
          <h2 className='cardTitle h4'>Next trip</h2>
        </header>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No rides assigned yet</p>
          <p className={styles.emptyCopy}>
            New rides show up here as soon as dispatch assigns them to you.
            {dispatchPhone ? (
              <>
                {" "}
                Questions? Call dispatch on{" "}
                <a
                  href={
                    dispatchPhoneTel
                      ? `tel:${dispatchPhoneTel}`
                      : telHref(dispatchPhone)
                  }
                  className={styles.inlineLink}
                >
                  {dispatchPhone}
                </a>
                .
              </>
            ) : null}
          </p>
        </div>
      </section>
    );
  }

  const pickup = formatPickup(trip.pickupAtIso, timeZone);
  const tone = badgeTone(trip.status);
  const href = `/driver-dashboard/trips/${trip.id}`;

  // Once the passenger is picked up, Navigate heads for the drop-off.
  const onBoard = trip.status === "IN_PROGRESS";
  const navigateTo = onBoard ? trip.dropoffAddress : trip.pickupAddress;

  return (
    <section className={styles.container}>
      <header className={styles.top}>
        <h2 className='cardTitle h4'>Next trip</h2>
        <div className={styles.tags}>
          <span className={styles.timePill}>{pickup.rel}</span>
          <span className={`badge badge_${tone}`}>
            {prettyStatus(trip.status)}
          </span>
        </div>
      </header>

      {/* When */}
      <div className={styles.when}>
        <p className={styles.time}>{pickup.timeLabel}</p>
        <p className={styles.date}>{pickup.dateLabel}</p>
      </div>

      {/* Where: the pickup and drop-off, joined like the route on the map */}
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

      {/* Who and what */}
      <dl className={styles.details}>
        <div className={styles.detail}>
          <dt>Passenger</dt>
          <dd>
            {trip.customerName}
            {trip.customerPhone ? (
              <a
                href={telHref(trip.customerPhone)}
                className={styles.call}
                aria-label={`Call ${trip.customerName}`}
              >
                <Phone className={styles.callIcon} aria-hidden='true' />
                {trip.customerPhone}
              </a>
            ) : null}
          </dd>
        </div>
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
        {trip.driverPaymentCents != null && trip.driverPaymentCents > 0 ? (
          <div className={styles.detail}>
            <dt>Your pay</dt>
            <dd className={styles.pay}>
              {formatCurrency(trip.driverPaymentCents, trip.currency)}
            </dd>
          </div>
        ) : null}
      </dl>

      {trip.specialRequests ? (
        <p className={styles.requests}>
          <strong>Special requests:</strong> {trip.specialRequests}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button href={href} text='Open trip' btnType='black' arrow />
        <a
          href={directionsUrl(navigateTo)}
          target='_blank'
          rel='noopener noreferrer'
          className={styles.navigate}
        >
          <Location className={styles.navigateIcon} aria-hidden='true' />
          {onBoard ? "Navigate to drop-off" : "Navigate to pickup"}
        </a>
      </div>
    </section>
  );
}
