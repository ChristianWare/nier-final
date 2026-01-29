"use client";

import Button from "@/components/shared/Button/Button";
import styles from "./DriverNextTrip.module.css";
import Link from "next/link";

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
};

type Props = {
  trip: NextTripData | null;
  timeZone: string;
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
    weekday: "short",
    month: "short",
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
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-Show",
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

export default function DriverNextTrip({ trip, timeZone }: Props) {
  if (!trip) {
    return (
      <section className={styles.container}>
        <header className={styles.header}>
          <h2 className='cardTitle h4'>
            <span className={styles.icon}>📍</span>
            Next Trip
          </h2>
        </header>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No upcoming trips assigned.</p>
          <p className={styles.emptyCopy}>
            Check back later or contact dispatch.
          </p>
        </div>
      </section>
    );
  }

  const pickup = formatPickup(trip.pickupAtIso, timeZone);
  const tone = badgeTone(trip.status);
  const href = `/driver-dashboard/trips/${trip.id}`;

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.icon}>📍</span>
            Next Trip
          </h2>
          <span className={styles.timePill}>{pickup.rel}</span>
        </div>
      </header>

      <Link href={href} className={styles.card}>
        <header className={styles.cardTop}>
          <h3 className='cardTitle h4'>Trip Details</h3>
          <span className={`badge badge_${tone}`}>
            {prettyStatus(trip.status)}
          </span>
        </header>

        <div className={styles.tripMeta}>
          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>Date</div>
            <div className='emptySmall'>
              {pickup.dateLabel} @ {pickup.timeLabel}
            </div>
          </div>

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>
              Customer
            </div>
            <div className='emptySmall'>
              {trip.customerName}
              {trip.customerPhone && (
                <span className={styles.pill}>{trip.customerPhone}</span>
              )}
            </div>
          </div>

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>Pickup</div>
            <div className='emptySmall'>{trip.pickupAddress}</div>
          </div>

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>
              Drop off
            </div>
            <div className='emptySmall'>{trip.dropoffAddress}</div>
          </div>

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>
              Service
            </div>
            <div className='emptySmall'>{trip.serviceName}</div>
          </div>

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>
              Vehicle
            </div>
            <div className='emptySmall'>
              {trip.vehicleName ?? "Vehicle TBD"}
            </div>
          </div>

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>
              Passengers
            </div>
            <div className='emptySmall'>
              {trip.passengers} • Luggage: {trip.luggage}
            </div>
          </div>

          {trip.driverPaymentCents != null && trip.driverPaymentCents > 0 && (
            <div className={styles.row}>
              <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                Your Earnings
              </div>
              <div className='val'>
                {formatCurrency(trip.driverPaymentCents, trip.currency)}
              </div>
            </div>
          )}

          {trip.specialRequests && (
            <div className={styles.row}>
              <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                ⚠️ Special Requests
              </div>
              <div className='emptySmall'>{trip.specialRequests}</div>
            </div>
          )}
        </div>
      </Link>
      <Button href={href} text='View Details' btnType='black' arrow />
    </section>
  );
}
