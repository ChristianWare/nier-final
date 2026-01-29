"use client";

import styles from "./DriverSchedulePreview.module.css";
import { useEffect, useState } from "react";
import { getDriverSchedule } from "../../../../actions/admin/bookings";
import Link from "next/link";

type ScheduleTrip = {
  bookingId: string;
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  durationMinutes: number | null;
  driverPaymentCents: number | null;
  currency: string;
  vehicleName: string | null;
  vehiclePlate: string | null;
};

type Props = {
  driverId: string | null;
  driverName: string;
  targetPickupAt: string; // ISO string of the booking being assigned
  currentBookingId: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatMoney(cents: number | null, currency = "USD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getEstimatedEndTime(
  pickupAt: string,
  durationMinutes: number | null,
): string {
  if (!durationMinutes) return "?";
  const start = new Date(pickupAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return formatTime(end.toISOString());
}

function shortAddress(address: string): string {
  if (!address) return "";
  const parts = address.split(",");
  return parts[0]?.trim() || address;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_REVIEW: "Pending",
    PENDING_PAYMENT: "Awaiting Payment",
    CONFIRMED: "Confirmed",
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };
  return labels[status] || status;
}

function checkConflict(
  trips: ScheduleTrip[],
  targetPickupAt: string,
  bufferMinutes: number = 30,
): {
  hasConflict: boolean;
  conflictingTrip: ScheduleTrip | null;
  warningType: "overlap" | "tight" | null;
} {
  const targetTime = new Date(targetPickupAt).getTime();

  for (const trip of trips) {
    const tripStart = new Date(trip.pickupAt).getTime();
    const tripDuration = trip.durationMinutes ?? 60; // Default 60 min if unknown
    const tripEnd = tripStart + tripDuration * 60 * 1000;
    const tripEndWithBuffer = tripEnd + bufferMinutes * 60 * 1000;

    // Check if target overlaps with trip
    if (targetTime >= tripStart && targetTime <= tripEnd) {
      return {
        hasConflict: true,
        conflictingTrip: trip,
        warningType: "overlap",
      };
    }

    // Check if target is within buffer after trip ends
    if (targetTime > tripEnd && targetTime <= tripEndWithBuffer) {
      return { hasConflict: true, conflictingTrip: trip, warningType: "tight" };
    }

    // Check if target is before trip but too close
    const targetEndEstimate = targetTime + 60 * 60 * 1000; // Assume 1 hour for current booking
    if (targetEndEstimate > tripStart && targetTime < tripStart) {
      return {
        hasConflict: true,
        conflictingTrip: trip,
        warningType: "overlap",
      };
    }
  }

  return { hasConflict: false, conflictingTrip: null, warningType: null };
}

export default function DriverSchedulePreview({
  driverId,
  driverName,
  targetPickupAt,
  currentBookingId,
}: Props) {
  const [trips, setTrips] = useState<ScheduleTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const fd = new FormData();
    fd.set("driverId", driverId);
    fd.set("targetDate", targetPickupAt);
    fd.set("excludeBookingId", currentBookingId);

    getDriverSchedule(fd).then((result) => {
      if (cancelled) return;

      setLoading(false);
      if (result.error) {
        setError(result.error);
        setTrips([]);
      } else {
        setError(null);
        setTrips(result.trips ?? []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [driverId, targetPickupAt, currentBookingId]);

  if (!driverId) {
    return null;
  }

  const targetDate = new Date(targetPickupAt);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(targetDate);

  const targetTimeLabel = formatTime(targetPickupAt);

  const { hasConflict, conflictingTrip, warningType } = checkConflict(
    trips,
    targetPickupAt,
  );

  // Calculate total earnings for the day
  const totalEarnings = trips.reduce(
    (sum, t) => sum + (t.driverPaymentCents ?? 0),
    0,
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>📅</span>
          <span className={styles.headerTitle}>
            {driverName}&apos;s Schedule for {dateLabel}
          </span>
        </div>
        {trips.length > 0 && (
          <span className={styles.tripCount}>
            {trips.length} trip{trips.length !== 1 ? "s" : ""}
            {totalEarnings > 0 && (
              <span className={styles.totalEarnings}>
                • {formatMoney(totalEarnings, trips[0]?.currency ?? "USD")}{" "}
                total
              </span>
            )}
          </span>
        )}
      </div>

      {/* Conflict Warning */}
      {hasConflict && conflictingTrip && (
        <div
          className={`${styles.conflictAlert} ${
            warningType === "overlap"
              ? styles.conflictOverlap
              : styles.conflictTight
          }`}
        >
          <span className={styles.conflictIcon}>
            {warningType === "overlap" ? "🚨" : "⚠️"}
          </span>
          <div className={styles.conflictText}>
            {warningType === "overlap" ? (
              <>
                <strong>Scheduling Conflict!</strong> This booking (
                {targetTimeLabel}) overlaps with an existing trip at{" "}
                {formatTime(conflictingTrip.pickupAt)}.
              </>
            ) : (
              <>
                <strong>Tight Schedule</strong> — Previous trip ends around{" "}
                {getEstimatedEndTime(
                  conflictingTrip.pickupAt,
                  conflictingTrip.durationMinutes,
                )}
                . This booking starts at {targetTimeLabel} ({" "}
                {Math.round(
                  (new Date(targetPickupAt).getTime() -
                    new Date(conflictingTrip.pickupAt).getTime() -
                    (conflictingTrip.durationMinutes ?? 60) * 60 * 1000) /
                    60000,
                )}{" "}
                min buffer).
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          Loading schedule...
        </div>
      )}

      {/* Error State */}
      {error && !loading && <div className={styles.errorState}>{error}</div>}

      {/* Empty State */}
      {!loading && !error && trips.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>✓</span>
          <span>
            No other trips scheduled for this day. Driver is available!
          </span>
        </div>
      )}

      {/* Trip List */}
      {!loading && trips.length > 0 && (
        <div className={styles.tripList}>
          {trips.map((trip) => {
            const isConflicting = conflictingTrip?.bookingId === trip.bookingId;
            return (
              <div
                key={trip.bookingId}
                className={`${styles.tripItem} ${isConflicting ? styles.tripItemConflict : ""}`}
              >
                <div className={styles.tripTime}>
                  <span className={styles.timeStart}>
                    {formatTime(trip.pickupAt)}
                  </span>
                  {trip.durationMinutes && (
                    <>
                      <span className={styles.timeSeparator}>→</span>
                      <span className={styles.timeEnd}>
                        {getEstimatedEndTime(
                          trip.pickupAt,
                          trip.durationMinutes,
                        )}
                      </span>
                    </>
                  )}
                </div>

                <div className={styles.tripDetails}>
                  <div className={styles.tripRoute}>
                    <span className={styles.routeFrom}>
                      {shortAddress(trip.pickupAddress)}
                    </span>
                    <span className={styles.routeArrow}>→</span>
                    <span className={styles.routeTo}>
                      {shortAddress(trip.dropoffAddress)}
                    </span>
                  </div>
                  <div className={styles.tripMeta}>
                    <span
                      className={`${styles.tripStatus} ${styles[`status_${trip.status}`]}`}
                    >
                      {statusLabel(trip.status)}
                    </span>
                    {trip.durationMinutes && (
                      <span className={styles.tripDuration}>
                        ~{trip.durationMinutes} min
                      </span>
                    )}
                    {trip.driverPaymentCents && trip.driverPaymentCents > 0 && (
                      <span className={styles.tripPay}>
                        {formatMoney(trip.driverPaymentCents, trip.currency)}
                      </span>
                    )}
                    {trip.vehicleName && (
                      <span className={styles.tripVehicle}>
                        {trip.vehicleName}
                        {trip.vehiclePlate && ` (${trip.vehiclePlate})`}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/admin/bookings/${trip.bookingId}`}
                  className={styles.tripLink}
                  target='_blank'
                  title='View booking'
                >
                  ↗
                </Link>
              </div>
            );
          })}

          {/* Current booking indicator */}
          <div className={styles.currentBookingIndicator}>
            <div className={styles.currentBookingTime}>
              <span className={styles.currentBookingIcon}>📍</span>
              <span>{targetTimeLabel}</span>
            </div>
            <span className={styles.currentBookingLabel}>← This booking</span>
          </div>
        </div>
      )}
    </div>
  );
}
