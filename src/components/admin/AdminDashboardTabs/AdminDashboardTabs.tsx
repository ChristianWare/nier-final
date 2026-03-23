"use client";

import { useState } from "react";
import styles from "./AdminDashboardTabs.module.css";

type TabId =
  | "bookingRequests"
  | "incompleteRides"
  | "alerts"
  | "incompleteApprovals"
  | "paymentsReceived"
  | "outstandingBalances";

type Props = {
  bookingRequests: React.ReactNode;
  incompleteRides: React.ReactNode;
  alerts: React.ReactNode;
  incompleteApprovals: React.ReactNode;
  paymentsReceived: React.ReactNode;
  outstandingBalances: React.ReactNode;

  // Counts for badges — pass 0 to show tab with no badge
  countBookingRequests: number;
  countIncompleteRides: number;
  countAlerts: number;
  countIncompleteApprovals: number;
  countPaymentsReceived: number;
  countOutstandingBalances: number;
};

const TAB_ORDER: TabId[] = [
  "bookingRequests",
  "incompleteRides",
  "alerts",
  "incompleteApprovals",
  "paymentsReceived",
  "outstandingBalances",
];

const TAB_LABELS: Record<TabId, string> = {
  bookingRequests: "Booking Requests",
  incompleteRides: "Incomplete Rides",
  alerts: "Alerts",
  incompleteApprovals: "Approvals",
  paymentsReceived: "Payments",
  outstandingBalances: "Balances",
};

// Which tabs should show their badge in red vs the default neutral
const TAB_URGENCY: Record<TabId, "danger" | "warning" | "neutral"> = {
  bookingRequests: "warning",
  incompleteRides: "danger",
  alerts: "danger",
  incompleteApprovals: "warning",
  paymentsReceived: "neutral",
  outstandingBalances: "warning",
};

export default function AdminDashboardTabs({
  bookingRequests,
  incompleteRides,
  alerts,
  incompleteApprovals,
  paymentsReceived,
  outstandingBalances,
  countBookingRequests,
  countIncompleteRides,
  countAlerts,
  countIncompleteApprovals,
  countPaymentsReceived,
  countOutstandingBalances,
}: Props) {
  const counts: Record<TabId, number> = {
    bookingRequests: countBookingRequests,
    incompleteRides: countIncompleteRides,
    alerts: countAlerts,
    incompleteApprovals: countIncompleteApprovals,
    paymentsReceived: countPaymentsReceived,
    outstandingBalances: countOutstandingBalances,
  };

  const panels: Record<TabId, React.ReactNode> = {
    bookingRequests,
    incompleteRides,
    alerts,
    incompleteApprovals,
    paymentsReceived,
    outstandingBalances,
  };

  // Default to the first tab that has items, otherwise the first tab
  const defaultTab =
    (TAB_ORDER.find((id) => counts[id] > 0) as TabId | undefined) ??
    "bookingRequests";

  const [active, setActive] = useState<TabId>(defaultTab);

  return (
    <div className={styles.wrapper}>
      {/* ── Tab bar ── */}
      <div
        className={styles.tabBar}
        role='tablist'
        aria-label='Dashboard sections'
      >
        {TAB_ORDER.map((id) => {
          const count = counts[id];
          const isActive = active === id;
          const urgency = TAB_URGENCY[id];

          return (
            <button
              key={id}
              type='button'
              role='tab'
              aria-selected={isActive}
              aria-controls={`tabpanel-${id}`}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              onClick={() => setActive(id)}
            >
              <span className={styles.tabLabel}>{TAB_LABELS[id]}</span>
              {count > 0 && (
                <span
                  className={`${styles.badge} ${styles[`badge_${urgency}`]}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Panels — all mounted, visibility toggled with CSS ── */}
      <div className={styles.panels}>
        {TAB_ORDER.map((id) => (
          <div
            key={id}
            id={`tabpanel-${id}`}
            role='tabpanel'
            aria-labelledby={id}
            // display:none keeps components mounted (no state loss on tab switch)
            style={{ display: active === id ? "block" : "none" }}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}
