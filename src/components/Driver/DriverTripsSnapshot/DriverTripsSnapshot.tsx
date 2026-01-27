/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./DriverTripsSnapshot.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

export type TripItem = {
  id: string;
  status: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  customerName: string;
  serviceName: string;
  vehicleName: string | null;
  driverPaymentCents: number | null;
  currency: string;
};

type Props = {
  tripsToday: TripItem[];
  tripsThisWeek: TripItem[];
  tripsAllUpcoming: TripItem[];
  timeZone?: string;
};

type TabBucket = "today" | "this_week" | "all_upcoming";

function formatMoney(cents: number | null, currency = "USD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateTime(d: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(d));
}

function formatTime(d: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(d));
}

function formatDate(d: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(d));
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function statusTone(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "neutral";
    case "EN_ROUTE":
    case "IN_PROGRESS":
      return "accent";
    case "ARRIVED":
      return "warn";
    case "COMPLETED":
      return "good";
    case "CANCELLED":
    case "NO_SHOW":
      return "bad";
    default:
      return "neutral";
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-Show",
    PENDING_REVIEW: "Pending",
    PENDING_PAYMENT: "Pending Payment",
    CONFIRMED: "Confirmed",
  };
  return labels[status] || status.replace(/_/g, " ");
}

function tabLabel(tab: TabBucket) {
  switch (tab) {
    case "today":
      return "Today";
    case "this_week":
      return "This Week";
    case "all_upcoming":
      return "All Upcoming";
    default:
      return "All";
  }
}

export default function DriverTripsSnapshot({
  tripsToday,
  tripsThisWeek,
  tripsAllUpcoming,
  timeZone = "America/Phoenix",
}: Props) {
  const [activeTab, setActiveTab] = useState<TabBucket>("today");

  const stats = useMemo(() => {
    const todayEarnings = tripsToday.reduce(
      (sum, t) => sum + (t.driverPaymentCents ?? 0),
      0,
    );
    const weekEarnings = tripsThisWeek.reduce(
      (sum, t) => sum + (t.driverPaymentCents ?? 0),
      0,
    );

    return {
      todayCount: tripsToday.length,
      todayEarnings,
      weekCount: tripsThisWeek.length,
      weekEarnings,
      allCount: tripsAllUpcoming.length,
    };
  }, [tripsToday, tripsThisWeek, tripsAllUpcoming]);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case "today":
        return tripsToday;
      case "this_week":
        return tripsThisWeek;
      case "all_upcoming":
        return tripsAllUpcoming;
      default:
        return tripsToday;
    }
  }, [activeTab, tripsToday, tripsThisWeek, tripsAllUpcoming]);

  const showDate = activeTab !== "today";

  return (
    <section className={styles.container} aria-label='Upcoming trips'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.cc}>🚗</span>
            My Trips
          </h2>

          <div className={styles.kpis}>
            <span className={`${styles.kpi} ${styles.kpiAccent}`}>
              Today: {stats.todayCount} trip{stats.todayCount !== 1 ? "s" : ""}
            </span>
            <span className={styles.kpi}>
              This week: {stats.weekCount} trip
              {stats.weekCount !== 1 ? "s" : ""}
            </span>
            {stats.todayEarnings > 0 && (
              <span className={`${styles.kpi} ${styles.kpiGood}`}>
                Today&apos;s earnings: {formatMoney(stats.todayEarnings)}
              </span>
            )}
            {stats.weekEarnings > 0 && (
              <span className={styles.kpi}>
                Week earnings: {formatMoney(stats.weekEarnings)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs} role='tablist' aria-label='Trip filter'>
            {(["today", "this_week", "all_upcoming"] as TabBucket[]).map(
              (tab) => (
                <button
                  key={tab}
                  type='button'
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tabLabel(tab)}
                  <span className={styles.tabCount}>
                    {tab === "today" && stats.todayCount}
                    {tab === "this_week" && stats.weekCount}
                    {tab === "all_upcoming" && stats.allCount}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      </header>

      {currentList.length === 0 ? (
        <div className={styles.emptyState}>
          <p className='emptySmall'>
            {activeTab === "today"
              ? "No trips scheduled for today."
              : activeTab === "this_week"
                ? "No trips scheduled this week."
                : "No upcoming trips assigned."}
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {currentList.map((trip) => {
            const href = `/driver-dashboard/trips/${trip.id}`;
            const route = `${shortAddress(trip.pickupAddress)} → ${shortAddress(trip.dropoffAddress)}`;

            return (
              <li key={trip.id} className={styles.row}>
                <div className={styles.left}>
                  <div className={styles.tripHeader}>
                    <span className={`badge badge_${statusTone(trip.status)}`}>
                      {statusLabel(trip.status)}
                    </span>
                    <span className={styles.tripTime}>
                      {showDate
                        ? formatDateTime(trip.pickupAt, timeZone)
                        : formatTime(trip.pickupAt, timeZone)}
                    </span>
                    {trip.driverPaymentCents != null &&
                      trip.driverPaymentCents > 0 && (
                        <span className={styles.tripEarnings}>
                          {formatMoney(trip.driverPaymentCents, trip.currency)}
                        </span>
                      )}
                  </div>

                  <div className={styles.tripDetails}>
                    <span className='emptyTitle'>{trip.customerName}</span>
                    <span className='miniNote'>{trip.serviceName}</span>
                  </div>

                  <div className={styles.tripMeta}>
                    <span className='miniNote'>{route}</span>
                    <span className='miniNote'>
                      {trip.passengers} pax • {trip.luggage} bags
                    </span>
                    {trip.vehicleName && (
                      <span className='miniNote'>{trip.vehicleName}</span>
                    )}
                  </div>

                  {trip.specialRequests && (
                    <div className={styles.specialRequests}>
                      <span className={styles.specialIcon}>⚠️</span>
                      <span className='miniNote'>{trip.specialRequests}</span>
                    </div>
                  )}
                </div>

                <Link className='primaryBtn' href={href}>
                  Details
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
