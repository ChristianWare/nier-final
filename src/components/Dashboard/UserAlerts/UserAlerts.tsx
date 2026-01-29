"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./UserAlerts.module.css";
import Link from "next/link";

export type UserAlertItem = {
  id: string;
  severity: "danger" | "warning" | "info" | "success";
  title: string;
  message: string;
  href?: string;
  ctaLabel?: string;
  // For declined bookings
  declineReason?: string | null;
  // For payment due
  amountDue?: string | null;
  dueDate?: string | null;
  paymentUrl?: string | null;
  // For payment received / refunds
  amountPaid?: string | null;
  amountRefunded?: string | null;
  // For driver assigned
  driverName?: string | null;
  vehicleName?: string | null;
  // Booking info
  bookingId?: string;
  pickupDate?: string;
  route?: string;
  timestamp?: string;
  // Alert type for icon selection
  alertType?:
    | "declined"
    | "payment_due"
    | "payment_received"
    | "approved"
    | "driver_assigned"
    | "refunded"
    | "cancelled";
};

type Props = {
  alerts: UserAlertItem[];
};

// Slide drawer component for smooth animation
function SlideDrawer({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, children]);

  return (
    <div
      className={`${styles.drawerWrapper} ${isOpen ? styles.drawerOpen : ""}`}
      style={{ height: isOpen ? height : 0 }}
    >
      <div ref={contentRef} className={styles.detailsPanel}>
        {children}
      </div>
    </div>
  );
}

// Get appropriate icon based on alert type
function getAlertIcon(
  alertType: UserAlertItem["alertType"],
  severity: UserAlertItem["severity"],
): string {
  switch (alertType) {
    case "payment_received":
      return "✅";
    case "approved":
      return "👍";
    case "driver_assigned":
      return "🚗";
    case "declined":
      return "❌";
    case "payment_due":
      return "💳";
    case "refunded":
      return "💸";
    case "cancelled":
      return "🚫";
    default:
      // Fallback to severity-based icons
      switch (severity) {
        case "success":
          return "✅";
        case "danger":
          return "🚨";
        case "warning":
          return "⚠️";
        default:
          return "ℹ️";
      }
  }
}

export default function UserAlerts({ alerts }: Props) {
  const count = alerts.length;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (count === 0) {
    return null; // Don't render if no alerts
  }

  return (
    <section className={styles.container} aria-label='Alerts'>
      <header className={styles.header}>
        <h2 className='cardTitle h4'>
          <span className={styles.alertIcon}>🔔</span>
          Alerts
          {count > 0 && <span className={styles.alertCount}>{count}</span>}
        </h2>
      </header>

      <ul className={styles.list}>
        {alerts.map((a) => {
          const isExpanded = expandedIds.has(a.id);
          const hasDetails =
            a.declineReason ||
            a.amountDue ||
            a.amountPaid ||
            a.amountRefunded ||
            a.driverName ||
            a.pickupDate ||
            a.route ||
            a.href;

          return (
            <li key={a.id} className={`${styles.row} ${styles[a.severity]}`}>
              <div className={styles.alertContent}>
                {/* Main Row */}
                <div className={styles.mainRow}>
                  <div className={styles.left}>
                    <div className={styles.alertHeader}>
                      <span className={styles.severityIcon}>
                        {getAlertIcon(a.alertType, a.severity)}
                      </span>
                      <span className={styles.alertTitle}>{a.title}</span>
                    </div>
                    <p className={styles.alertMessage}>{a.message}</p>
                    {a.timestamp && (
                      <span className={styles.timestamp}>{a.timestamp}</span>
                    )}
                  </div>

                  <div className={styles.right}>
                    {hasDetails && (
                      <button
                        type='button'
                        className={`${styles.detailsBtn} ${isExpanded ? styles.detailsBtnActive : ""}`}
                        onClick={() => toggleExpanded(a.id)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Hide" : "Details"}
                        <span
                          className={`${styles.chevron} ${isExpanded ? styles.chevronUp : ""}`}
                        >
                          ▼
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Slide Drawer for Details */}
                <SlideDrawer isOpen={isExpanded}>
                  {/* Decline Reason */}
                  {a.declineReason && (
                    <div className={styles.declineBox}>
                      <span className={styles.declineLabel}>Reason:</span>
                      <p className={styles.declineReason}>{a.declineReason}</p>
                    </div>
                  )}

                  {/* Payment Received Info */}
                  {a.amountPaid && (
                    <div className={styles.successBox}>
                      <div className={styles.successRow}>
                        <span className={styles.successLabel}>
                          Amount Paid:
                        </span>
                        <span className={styles.successAmount}>
                          {a.amountPaid}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Refund Info */}
                  {a.amountRefunded && (
                    <div className={styles.refundBox}>
                      <div className={styles.refundRow}>
                        <span className={styles.refundLabel}>
                          Amount Refunded:
                        </span>
                        <span className={styles.refundAmount}>
                          {a.amountRefunded}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Driver Assigned Info */}
                  {a.driverName && (
                    <div className={styles.driverBox}>
                      <div className={styles.driverRow}>
                        <span className={styles.driverIcon}>👤</span>
                        <div className={styles.driverInfo}>
                          <span className={styles.driverLabel}>
                            Your Driver:
                          </span>
                          <span className={styles.driverName}>
                            {a.driverName}
                          </span>
                        </div>
                      </div>
                      {a.vehicleName && (
                        <div className={styles.driverRow}>
                          <span className={styles.driverIcon}>🚐</span>
                          <div className={styles.driverInfo}>
                            <span className={styles.driverLabel}>Vehicle:</span>
                            <span className={styles.driverName}>
                              {a.vehicleName}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booking Details */}
                  {(a.pickupDate || a.route) && (
                    <div className={styles.bookingDetails}>
                      {a.pickupDate && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailIcon}>📅</span>
                          <span className={styles.detailValue}>
                            {a.pickupDate}
                          </span>
                        </div>
                      )}
                      {a.route && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailIcon}>📍</span>
                          <span className={styles.detailValue}>{a.route}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Due Info */}
                  {a.amountDue && (
                    <div className={styles.paymentDueBox}>
                      <div className={styles.paymentDueRow}>
                        <span className={styles.paymentLabel}>Amount Due:</span>
                        <span className={styles.paymentAmount}>
                          {a.amountDue}
                        </span>
                      </div>
                      {a.dueDate && (
                        <div className={styles.paymentDueRow}>
                          <span className={styles.paymentLabel}>
                            Pickup Date:
                          </span>
                          <span className={styles.paymentDueDate}>
                            {a.dueDate}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className={styles.actionsRow}>
                    {a.paymentUrl && (
                      <Link
                        className={`primaryBtn ${styles.payBtn}`}
                        href={a.paymentUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Pay Now →
                      </Link>
                    )}
                    {a.href && !a.paymentUrl && (
                      <Link className='primaryBtn' href={a.href}>
                        {a.ctaLabel || "View Details"} →
                      </Link>
                    )}
                    {a.href && a.paymentUrl && (
                      <Link className='backBtn' href={a.href}>
                        View Booking
                      </Link>
                    )}
                  </div>
                </SlideDrawer>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
