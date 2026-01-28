"use client";

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

function statusTone(
  s: string,
): "neutral" | "warning" | "danger" | "good" | "accent" {
  switch (s) {
    case "ASSIGNED":
    case "CONFIRMED":
      return "good";
    case "EN_ROUTE":
    case "IN_PROGRESS":
      return "accent";
    case "ARRIVED":
      return "warning";
    default:
      return "neutral";
  }
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
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
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🚗</div>
          <p className='emptySmall'>No upcoming trips assigned.</p>
          <p className='miniNote'>Check back later or contact dispatch.</p>
        </div>
      </section>
    );
  }

  const pickup = formatPickup(trip.pickupAtIso, timeZone);
  const tone = statusTone(trip.status);
  const href = `/driver-dashboard/trips/${trip.id}`;

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.icon}>📍</span>
            Next Trip
          </h2>
          <span className={styles.pill}>{pickup.rel}</span>
        </div>
      </header>

      <Link href={href} className={styles.tripCard}>
        <div className={styles.tripMain}>
          <div className={styles.tripHeader}>
            <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
              {prettyStatus(trip.status)}
            </span>
            <span className={styles.tripTime}>
              {pickup.dateLabel} @ {pickup.timeLabel}
            </span>
            {trip.driverPaymentCents != null && trip.driverPaymentCents > 0 && (
              <span className={styles.tripEarnings}>
                {formatCurrency(trip.driverPaymentCents, trip.currency)}
              </span>
            )}
          </div>

          <div className={styles.tripCustomer}>
            <span className={styles.customerName}>{trip.customerName}</span>
            {trip.customerPhone && (
              <span className={styles.customerPhone}>{trip.customerPhone}</span>
            )}
          </div>

          <div className={styles.tripRoute}>
            <div className={styles.routePoint}>
              <span className={styles.routeIcon}>📍</span>
              <span>{shortAddress(trip.pickupAddress)}</span>
            </div>
            <div className={styles.routePoint}>
              <span className={styles.routeIcon}>🏁</span>
              <span>{shortAddress(trip.dropoffAddress)}</span>
            </div>
          </div>

          <div className={styles.tripMeta}>
            <span className={styles.metaItem}>{trip.serviceName}</span>
            {trip.vehicleName && (
              <span className={styles.metaItem}>{trip.vehicleName}</span>
            )}
            <span className={styles.metaItem}>
              {trip.passengers} pax • {trip.luggage} bags
            </span>
          </div>

          {trip.specialRequests && (
            <div className={styles.specialRequests}>
              <span className={styles.specialIcon}>⚠️</span>
              <span>{trip.specialRequests}</span>
            </div>
          )}
        </div>

        <div className='primaryBtn'>View Details →</div>
      </Link>
    </section>
  );
}
