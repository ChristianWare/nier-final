"use client";

import { navProgress } from "@/components/shared/NavProgress/navProgress";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./AdminDashboardTabs.module.css";

type TabId =
  | "bookingRequests"
  | "incompleteRides"
  | "alerts"
  | "incompleteApprovals"
  | "paymentsReceived"
  | "outstandingBalances"
  | "invoices"
  | "reporting";

type Props = {
  bookingRequests: React.ReactNode;
  incompleteRides: React.ReactNode;
  alerts: React.ReactNode;
  incompleteApprovals: React.ReactNode;
  paymentsReceived: React.ReactNode;
  outstandingBalances: React.ReactNode;
  invoices: React.ReactNode;
  /** Reporting charts. Loaded only when the tab is opened (see reportingHref). */
  reporting?: React.ReactNode;
  /** Open this tab first (e.g. after loading the Reporting tab). */
  initialTab?: TabId;
  /** Where to go to load the Reporting tab's data, if it isn't loaded yet. */
  reportingHref?: string;
  countBookingRequests: number;
  countIncompleteRides: number;
  countAlerts: number;
  countIncompleteApprovals: number;
  countPaymentsReceived: number;
  countOutstandingBalances: number;
  countInvoices: number;
};

const TAB_ORDER: TabId[] = [
  "bookingRequests",
  "incompleteRides",
  "alerts",
  "incompleteApprovals",
  "paymentsReceived",
  "outstandingBalances",
  "invoices",
  "reporting",
];

const TAB_LABELS: Record<TabId, string> = {
  bookingRequests: "Booking Requests",
  incompleteRides: "Incomplete Rides",
  alerts: "Alerts",
  incompleteApprovals: "Approvals",
  paymentsReceived: "Payments",
  outstandingBalances: "Balances",
  invoices: "Invoices",
  reporting: "Reporting",
};

const TAB_URGENCY: Record<TabId, "danger" | "warning" | "neutral"> = {
  bookingRequests: "warning",
  incompleteRides: "danger",
  alerts: "danger",
  incompleteApprovals: "warning",
  paymentsReceived: "neutral",
  outstandingBalances: "warning",
  invoices: "warning",
  reporting: "neutral",
};

export default function AdminDashboardTabs({
  bookingRequests,
  incompleteRides,
  alerts,
  incompleteApprovals,
  paymentsReceived,
  outstandingBalances,
  invoices,
  reporting,
  initialTab,
  reportingHref,
  countBookingRequests,
  countIncompleteRides,
  countAlerts,
  countIncompleteApprovals,
  countPaymentsReceived,
  countOutstandingBalances,
  countInvoices,
}: Props) {
  const counts: Record<TabId, number> = {
    bookingRequests: countBookingRequests,
    incompleteRides: countIncompleteRides,
    alerts: countAlerts,
    incompleteApprovals: countIncompleteApprovals,
    paymentsReceived: countPaymentsReceived,
    outstandingBalances: countOutstandingBalances,
    invoices: countInvoices,
    reporting: 0,
  };

  const panels: Record<TabId, React.ReactNode> = {
    bookingRequests,
    incompleteRides,
    alerts,
    incompleteApprovals,
    paymentsReceived,
    outstandingBalances,
    invoices,
    reporting: reporting ?? null,
  };

  const defaultTab =
    initialTab ??
    (TAB_ORDER.find((id) => counts[id] > 0) as TabId | undefined) ??
    "bookingRequests";

  const [active, setActiveTab] = useState<TabId>(defaultTab);
  const router = useRouter();
  // The Reporting tab loads its data on demand.
  const setActive = (id: TabId) => {
    setActiveTab(id);
    if (id === "reporting" && reportingHref) {
      navProgress.start();
      router.push(reportingHref, { scroll: false });
    }
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalCount = TAB_ORDER.reduce((sum, id) => sum + counts[id], 0);

  return (
    <div className={styles.wrapper}>
      {/* ── Desktop tab bar — hidden at ≤1268px ── */}
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

      {/* ── Mobile dropdown — shown at ≤1268px ── */}
      <div className={styles.dropdownBar} ref={dropdownRef}>
        <button
          type='button'
          className={styles.dropdownTrigger}
          onClick={() => setDropdownOpen((v) => !v)}
          aria-haspopup='listbox'
          aria-expanded={dropdownOpen}
        >
          <span className={styles.dropdownTriggerLeft}>
            <span className={styles.dropdownTriggerLabel}>
              {TAB_LABELS[active]}
            </span>
            {counts[active] > 0 && (
              <span
                className={`${styles.badge} ${styles[`badge_${TAB_URGENCY[active]}`]}`}
              >
                {counts[active]}
              </span>
            )}
          </span>
          <span className={styles.dropdownTriggerRight}>
            {totalCount > 0 && (
              <span className={`${styles.badge} ${styles.badge_neutral}`}>
                {totalCount} total
              </span>
            )}
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className={`${styles.dropdownChevron} ${dropdownOpen ? styles.dropdownChevronOpen : ""}`}
            >
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </span>
        </button>

        {dropdownOpen && (
          <ul className={styles.dropdownMenu} role='listbox'>
            {TAB_ORDER.map((id) => {
              const count = counts[id];
              const isActive = active === id;
              const urgency = TAB_URGENCY[id];

              return (
                <li key={id} role='option' aria-selected={isActive}>
                  <button
                    type='button'
                    className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ""}`}
                    onClick={() => {
                      setActive(id);
                      setDropdownOpen(false);
                    }}
                  >
                    <span className={styles.dropdownItemLabel}>
                      {TAB_LABELS[id]}
                    </span>
                    {count > 0 && (
                      <span
                        className={`${styles.badge} ${styles[`badge_${urgency}`]}`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Panels ── */}
      <div className={styles.panels}>
        {TAB_ORDER.map((id) => (
          <div
            key={id}
            id={`tabpanel-${id}`}
            role='tabpanel'
            aria-labelledby={id}
            style={{ display: active === id ? "block" : "none" }}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}