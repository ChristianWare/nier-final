/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./AdminAlerts.module.css";
import Link from "next/link";
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";

export type AlertDetailRow = {
  id: string;
  href: string;
  cells: { label: string; value: string; highlight?: boolean }[];
  badge?: { label: string; tone: "neutral" | "warning" | "danger" | "good" };
};

export type AlertItem = {
  id: string;
  severity: "danger" | "warning" | "info";
  message: string;
  href?: string;
  ctaLabel?: string;
  // Fields for expanded details
  details?: string;
  detailRows?: AlertDetailRow[];
  timestamp?: string;
};

type Props = {
  alerts: AlertItem[];
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

export default function AdminAlerts({ alerts }: Props) {
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

  return (
    <section className={styles.container} aria-label='Alerts'>
      <header className={styles.header}>
        <h2 className={`cardTitle h4${count > 0 ? " redBorder" : ""}`}>
          Alerts
        </h2>

        <div className='miniNote'>
          {count === 0 ? null : (
            <BadgeCount value={count} max={99} hideIfZero />
          )}
        </div>
      </header>

      {count === 0 ? (
        <div className='emptySmall'>No alerts right now.</div>
      ) : (
        <ul className={styles.list}>
          {alerts.map((a) => {
            const isExpanded = expandedIds.has(a.id);
            const hasDetails =
              a.details || (a.detailRows && a.detailRows.length > 0) || a.href;

            return (
              <li key={a.id} className={`${styles.row} ${styles[a.severity]}`}>
                <div className={styles.alertContent}>
                  {/* Main Row */}
                  <div className={styles.mainRow}>
                    <div className={styles.left}>
                      <div className='emptyTitle'>
                        {labelSeverity(a.severity)}
                      </div>
                      <p className='emptySmall'>{a.message}</p>
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
                          {isExpanded ? "Hide Details" : "More Details"}
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
                    {a.details && (
                      <p className={styles.detailsText}>{a.details}</p>
                    )}

                    {/* Table-style detail rows */}
                    {a.detailRows && a.detailRows.length > 0 && (
                      <div className={styles.detailsTableCard}>
                        <table className={styles.detailsTable}>
                          <thead className={styles.detailsThead}>
                            <tr>
                              {a.detailRows[0]?.badge && (
                                <th className={styles.detailsTh}>Status</th>
                              )}
                              {a.detailRows[0]?.cells.map((cell, idx) => (
                                <th key={idx} className={styles.detailsTh}>
                                  {cell.label}
                                </th>
                              ))}
                              <th
                                className={`${styles.detailsTh} ${styles.detailsThRight}`}
                              ></th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.detailRows.map((row) => (
                              <tr key={row.id} className={styles.detailsTr}>
                                {row.badge && (
                                  <td
                                    className={styles.detailsTd}
                                    data-label='Status'
                                  >
                                    <Link
                                      href={row.href}
                                      className={styles.rowStretchedLink}
                                      aria-hidden='true'
                                      tabIndex={-1}
                                    />
                                    <div className={styles.cellInner}>
                                      <span
                                        className={`${styles.badge} ${styles[`badge_${row.badge.tone}`]}`}
                                      >
                                        {row.badge.label}
                                      </span>
                                    </div>
                                  </td>
                                )}
                                {row.cells.map((cell, idx) => (
                                  <td
                                    key={idx}
                                    className={`${styles.detailsTd} ${cell.highlight ? styles.highlightCell : ""}`}
                                    data-label={cell.label}
                                  >
                                    <Link
                                      href={row.href}
                                      className={styles.rowStretchedLink}
                                      aria-hidden='true'
                                      tabIndex={-1}
                                    />
                                    <div className={styles.cellInner}>
                                      <span className={styles.cellValue}>
                                        {cell.value}
                                      </span>
                                    </div>
                                  </td>
                                ))}
                                <td
                                  className={`${styles.detailsTd} ${styles.detailsTdRight}`}
                                  data-label='Action'
                                >
                                  <Link className='primaryBtn' href={row.href}>
                                    View
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Fallback View All button if no detail rows but has href */}
                    {(!a.detailRows || a.detailRows.length === 0) && a.href && (
                      <div className={styles.detailsActions}>
                        <Link className='primaryBtn' href={a.href}>
                          {a.ctaLabel || "View All"} →
                        </Link>
                      </div>
                    )}

                    {/* View All link at bottom if there are detail rows */}
                    {a.detailRows && a.detailRows.length > 0 && a.href && (
                      <div className={styles.detailsFooter}>
                        <Link className='backBtn' href={a.href}>
                          {a.ctaLabel || "View All"} →
                        </Link>
                      </div>
                    )}
                  </SlideDrawer>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function labelSeverity(sev: AlertItem["severity"]) {
  if (sev === "danger") return "Critical";
  if (sev === "warning") return "Warning";
  return "Info";
}
