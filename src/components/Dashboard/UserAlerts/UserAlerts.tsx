"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./UserAlerts.module.css";
import Link from "next/link";

export type UserAlertItem = {
  id: string;
  severity: "danger" | "warning" | "info";
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
  // Booking info
  bookingId?: string;
  pickupDate?: string;
  route?: string;
  timestamp?: string;
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
            a.declineReason || a.amountDue || a.pickupDate || a.route || a.href;

          return (
            <li key={a.id} className={`${styles.row} ${styles[a.severity]}`}>
              <div className={styles.alertContent}>
                {/* Main Row */}
                <div className={styles.mainRow}>
                  <div className={styles.left}>
                    <div className={styles.alertHeader}>
                      <span className={styles.severityIcon}>
                        {a.severity === "danger"
                          ? "🚨"
                          : a.severity === "warning"
                            ? "⚠️"
                            : "ℹ️"}
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
