"use client";

import Link from "next/link";
import styles from "./DriverOverview.module.css";

type TripData = {
  id: string;
  status: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  internalNotes: string | null;
  totalCents: number;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  serviceType: { name: string; slug: string } | null;
  vehicle: { name: string } | null;
  user: { name: string | null; email: string } | null;
  assignment: {
    vehicleUnit: { name: string; plate: string | null } | null;
  } | null;
  addons: { type: string; quantity: number }[];
};

type TodayTrip = {
  id: string;
  status: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  serviceType: { name: string } | null;
};

type Alert = {
  id: string;
  createdAt: Date;
  title: string;
  body: string;
  href: string;
};

type KPIs = {
  tripsToday: number;
  upcoming7Days: number;
  onTimeRate30Days: string;
  earningsWeek: string;
};

type Props = {
  nextTrip: TripData | null;
  todayTrips: TodayTrip[];
  alerts: Alert[];
  kpis: KPIs;
};

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(new Date(d));
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(new Date(d));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    PENDING_REVIEW: "Pending Review",
    PENDING_PAYMENT: "Pending Payment",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-Show",
  };
  return labels[status] || status.replace(/_/g, " ");
}

function statusBadgeClass(status: string) {
  if (["COMPLETED"].includes(status)) return styles.badgeGood;
  if (["EN_ROUTE", "IN_PROGRESS"].includes(status)) return styles.badgeActive;
  if (["ARRIVED"].includes(status)) return styles.badgeArrived;
  if (["CANCELLED", "NO_SHOW"].includes(status)) return styles.badgeBad;
  return styles.badgeNeutral;
}

export default function DriverOverview({
  nextTrip,
  todayTrips,
  alerts,
  kpis,
}: Props) {
  const customerName = nextTrip
    ? nextTrip.user?.name?.trim() || nextTrip.guestName?.trim() || "Customer"
    : null;

  return (
    <div className={styles.container}>
      {/* KPIs Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{kpis.tripsToday}</div>
          <div className={styles.kpiLabel}>Today</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{kpis.upcoming7Days}</div>
          <div className={styles.kpiLabel}>This Week</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{kpis.earningsWeek}</div>
          <div className={styles.kpiLabel}>Earnings</div>
        </div>
      </div>

      {/* Next Trip Card */}
      {nextTrip ? (
        <Link
          href={`/driver-dashboard/trips/${nextTrip.id}`}
          className={styles.nextTripCard}
        >
          <div className={styles.nextTripHeader}>
            <span className={styles.nextTripLabel}>📍 NEXT TRIP</span>
            <span
              className={`${styles.badge} ${statusBadgeClass(nextTrip.status)}`}
            >
              {statusLabel(nextTrip.status)}
            </span>
          </div>
          <div className={styles.nextTripTime}>
            {formatDateTime(nextTrip.pickupAt)}
          </div>
          <div className={styles.nextTripCustomer}>
            {customerName} • {nextTrip.serviceType?.name || "Trip"}
          </div>
          <div className={styles.nextTripRoute}>
            <div className={styles.routePoint}>
              <span className={styles.routeIcon}>🟢</span>
              <span className={styles.routeText}>{nextTrip.pickupAddress}</span>
            </div>
            <div className={styles.routePoint}>
              <span className={styles.routeIcon}>🔴</span>
              <span className={styles.routeText}>
                {nextTrip.dropoffAddress}
              </span>
            </div>
          </div>
          {nextTrip.specialRequests && (
            <div className={styles.specialNote}>
              ⚠️ {nextTrip.specialRequests}
            </div>
          )}
          <div className={styles.viewTripBtn}>View Trip Details →</div>
        </Link>
      ) : (
        <div className={styles.noTrips}>
          <div className={styles.noTripsIcon}>📋</div>
          <div className={styles.noTripsText}>No upcoming trips assigned</div>
          <div className={styles.noTripsSubtext}>
            Check back later or contact dispatch
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Today&apos;s Schedule</h2>
        {todayTrips.length === 0 ? (
          <div className={styles.emptyState}>No trips scheduled for today</div>
        ) : (
          <div className={styles.tripList}>
            {todayTrips.map((trip) => (
              <Link
                key={trip.id}
                href={`/driver-dashboard/trips/${trip.id}`}
                className={styles.tripItem}
              >
                <div className={styles.tripItemLeft}>
                  <div className={styles.tripItemTime}>
                    {formatTime(trip.pickupAt)}
                  </div>
                  <span
                    className={`${styles.badge} ${styles.badgeSmall} ${statusBadgeClass(trip.status)}`}
                  >
                    {statusLabel(trip.status)}
                  </span>
                </div>
                <div className={styles.tripItemRight}>
                  <div className={styles.tripItemService}>
                    {trip.serviceType?.name || "Trip"}
                  </div>
                  <div className={styles.tripItemRoute}>
                    {trip.pickupAddress.split(",")[0]} →{" "}
                    {trip.dropoffAddress.split(",")[0]}
                  </div>
                </div>
                <div className={styles.tripItemArrow}>›</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        {alerts.length === 0 ? (
          <div className={styles.emptyState}>No recent activity</div>
        ) : (
          <div className={styles.alertList}>
            {alerts.slice(0, 5).map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className={styles.alertItem}
              >
                <div className={styles.alertTitle}>{alert.title}</div>
                <div className={styles.alertBody}>{alert.body}</div>
                <div className={styles.alertTime}>
                  {new Intl.DateTimeFormat("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(alert.createdAt))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
