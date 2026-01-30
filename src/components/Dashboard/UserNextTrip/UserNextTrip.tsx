"use client";

import Button from "@/components/shared/Button/Button";
import styles from "./UserNextTrip.module.css";
import Link from "next/link";

export type UserNextTripData = {
  id: string;
  status: string;
  pickupAtIso: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  totalCents: number;
  currency: string;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  isPaid: boolean;
  checkoutUrl: string | null;
};

type Props = {
  trip: UserNextTripData | null;
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
    PENDING_REVIEW: "Pending Review",
    PENDING_PAYMENT: "Awaiting Payment",
    CONFIRMED: "Confirmed",
    ASSIGNED: "Driver Assigned",
    EN_ROUTE: "Driver En Route",
    ARRIVED: "Driver Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    DECLINED: "Declined",
    NO_SHOW: "No-Show",
  };
  return statusMap[s] || s.replace(/_/g, " ");
}

function badgeTone(s: string): "neutral" | "warn" | "good" | "accent" | "bad" {
  switch (s) {
    case "CONFIRMED":
    case "ASSIGNED":
      return "good";
    case "EN_ROUTE":
    case "IN_PROGRESS":
      return "accent";
    case "ARRIVED":
      return "accent";
    case "PENDING_PAYMENT":
      return "warn";
    case "PENDING_REVIEW":
      return "neutral";
    case "CANCELLED":
    case "NO_SHOW":
    case "DECLINED":
      return "bad";
    default:
      return "neutral";
  }
}

export default function UserNextTrip({ trip, timeZone }: Props) {
  if (!trip) {
    return (
      <section className={styles.container}>
        <header className={styles.header}>
          <h2 className='cardTitle h4'>
            <span className={styles.icon}>🚗</span>
            Your Next Trip
          </h2>
        </header>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No upcoming trips.</p>
          <p className={styles.emptyCopy}>
            Book a ride to see your next trip here.
          </p>
        </div>
        <Button href='/book' text='Book a Ride' btnType='black' arrow />
      </section>
    );
  }

  const pickup = formatPickup(trip.pickupAtIso, timeZone);
  const tone = badgeTone(trip.status);
  const href = `/dashboard/trips/${trip.id}`;
  const needsPayment = trip.status === "PENDING_PAYMENT" && !trip.isPaid;

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.icon}>🚗</span>
            Your Next Trip
          </h2>
          <span className={styles.timePill}>{pickup.rel}</span>
        </div>
      </header>

      {/* Payment Alert Banner */}
      {needsPayment && (
        <div className={styles.paymentAlert}>
          <span className={styles.paymentAlertIcon}>💳</span>
          <div className={styles.paymentAlertContent}>
            <p className={styles.paymentAlertTitle}>Payment Required</p>
            <p className={styles.paymentAlertCopy}>
              Complete your payment to confirm this trip.
            </p>
          </div>
          <Link
            href={trip.checkoutUrl || href}
            className={styles.paymentAlertBtn}
          >
            Pay {formatCurrency(trip.totalCents, trip.currency)}
          </Link>
        </div>
      )}

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

          {trip.driverName && (
            <div className={styles.row}>
              <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                Driver
              </div>
              <div className='emptySmall'>
                {trip.driverName}
                {trip.driverPhone && (
                  <span className={styles.pill}>{trip.driverPhone}</span>
                )}
              </div>
            </div>
          )}

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>
              Passengers
            </div>
            <div className='emptySmall'>
              {trip.passengers} • Luggage: {trip.luggage}
            </div>
          </div>

          <div className={styles.row}>
            <div className={`${styles.emptyTitleLocal} emptyTitle`}>
              Trip Total
            </div>
            <div className='val'>
              {formatCurrency(trip.totalCents, trip.currency)}
              {trip.isPaid && <span className={styles.paidBadge}>Paid</span>}
            </div>
          </div>

          {trip.specialRequests && (
            <div className={styles.row}>
              <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                Special Requests
              </div>
              <div className='emptySmall'>{trip.specialRequests}</div>
            </div>
          )}
        </div>
      </Link>

      <div className={styles.btnRow}>
        <Button href={href} text='View Details' btnType='black' arrow />
        {needsPayment && trip.checkoutUrl && (
          <Button
            href={trip.checkoutUrl}
            text='Complete Payment'
            btnType='accent'
            arrow
          />
        )}
      </div>
    </section>
  );
}
