"use client";

import styles from "./BookingCompletionChecklist.module.css";
import {
  useBookingTabs,
  SECTION_TO_TAB,
  SECTION_STACKED_REDIRECT,
} from "@/components/admin/BookingDetailTabs/BookingDetailTabsContext";

type Props = {
  bookingId: string;
  bookingStatus: string;
  // Trip / Route
  isRouteApproved: boolean;
  serviceName: string | null;
  distanceMiles: number | null;
  // Pricing
  isPriceApproved: boolean;
  // Assignment info (combined)
  hasDriver: boolean;
  driverName: string | null;
  hasVehicleUnit: boolean;
  vehicleUnitName: string | null;
  hasVehicleCategory: boolean;
  vehicleCategoryName: string | null;
  // Driver Pay
  hasDriverPay: boolean;
  driverPayDisplay: string | null;
  // Payment info
  isPaid: boolean;
  isApproved: boolean;
  // Payment link sent
  hasPaymentLinkSent: boolean;
  // Corporate
  isCorporateBooking?: boolean;
  corporateAccountName?: string | null;
};

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
  value: string | null;
  priority: "critical" | "important" | "optional";
  sectionId: string;
};

export default function BookingCompletionChecklist({
  bookingStatus,
  isRouteApproved,
  serviceName,
  distanceMiles,
  isPriceApproved,
  hasDriver,
  driverName,
  hasVehicleUnit,
  vehicleUnitName,
  hasDriverPay,
  driverPayDisplay,
  isPaid,
  isApproved,
  hasPaymentLinkSent,
  isCorporateBooking = false,
  corporateAccountName = null,
}: Props) {
  // ── Context: knows whether tabs are enabled and can switch active tab ──────
  const { setActiveTabId, tabsEnabled } = useBookingTabs();

  function handleSectionClick(sectionId: string) {
    if (tabsEnabled) {
      // Switch to the matching tab
      const tabId = SECTION_TO_TAB[sectionId];
      if (tabId) {
        setActiveTabId(tabId);
        // Scroll to the tabs wrapper with a slight delay for state to update
        setTimeout(() => {
          const el = document.getElementById("booking-detail-tabs");
          if (el) {
            const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }, 50);
        return;
      }
    }

    // Stacked / non-tab mode: scroll to the actual section element
    // Some merged sectionIds redirect to their combined wrapper
    const targetId = SECTION_STACKED_REDIRECT[sectionId] ?? sectionId;
    const element = document.getElementById(targetId);
    if (!element) return;

    const y = element.getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({ top: y, behavior: "smooth" });

    element.classList.add("card-highlight");
    setTimeout(() => element.classList.add("card-highlight-fade"), 4000);
    setTimeout(
      () => element.classList.remove("card-highlight", "card-highlight-fade"),
      5000,
    );
  }

  // ── Status guards ──────────────────────────────────────────────────────────
  const isBookingCompleted = bookingStatus === "COMPLETED";
  const hideStatuses = [
    "CANCELLED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "NO_SHOW",
    "DECLINED",
  ];
  if (hideStatuses.includes(bookingStatus)) return null;

  if (isBookingCompleted) {
    return (
      <div className={`${styles.container} ${styles.alert_complete}`}>
        <div className={styles.header}>
          <span className={styles.icon}>🎉</span>
          <div className={styles.headerText}>
            <h3 className={styles.title}>Booking Complete</h3>
            <p className={styles.subtitle}>
              This trip has been completed successfully
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Checklist computation ──────────────────────────────────────────────────
  const distanceDisplay =
    distanceMiles != null ? `${Number(distanceMiles).toFixed(1)} mi` : "—";
  const tripValue = isRouteApproved
    ? `${serviceName ?? "—"} • ${distanceDisplay}`
    : null;

  const paymentComplete = isCorporateBooking || isPaid || hasPaymentLinkSent;
  const driverVehicleComplete = hasDriver && hasVehicleUnit;

  const allComplete =
    isRouteApproved &&
    isPriceApproved &&
    driverVehicleComplete &&
    hasDriverPay &&
    isApproved &&
    paymentComplete;

  const checklist: ChecklistItem[] = [
    {
      key: "trip_details",
      label: "Trip Details",
      description:
        "Review the route, service type, and trip details, then approve",
      isComplete: isRouteApproved,
      value: tripValue,
      priority: "critical",
      sectionId: "trip-section",
    },
    {
      key: "pricing",
      label: "Pricing",
      description: "Review and approve the booking price",
      isComplete: isPriceApproved,
      value: isPriceApproved ? "Price approved" : null,
      priority: "critical",
      sectionId: "price-section",
    },
    {
      key: "driver_vehicle",
      label: "Driver + Vehicle Assignment",
      description: "Assign a driver and vehicle unit for this trip",
      isComplete: driverVehicleComplete,
      value: driverVehicleComplete
        ? `${driverName ?? "—"} • ${vehicleUnitName ?? "—"}`
        : hasDriver
          ? `${driverName ?? "—"} (no vehicle)`
          : hasVehicleUnit
            ? `(no driver) • ${vehicleUnitName ?? "—"}`
            : null,
      priority: "critical",
      sectionId: "assign-section",
    },
    {
      key: "driver_pay",
      label: "Driver Pay",
      description: "Set the driver payment amount for this trip",
      isComplete: hasDriverPay,
      value: driverPayDisplay,
      priority: "important",
      sectionId: "driver-pay-section",
    },
    {
      key: "approved",
      label: "Booking Approved",
      description: "Approve the booking to proceed with payment and assignment",
      isComplete: isApproved,
      value: isApproved ? "Approved" : null,
      priority: "critical",
      sectionId: "approval-section",
    },
    ...(isCorporateBooking
      ? [
          {
            key: "payment_corporate",
            label: "Corporate Billing",
            description: "Billed to corporate account",
            isComplete: true,
            value: `Billed to ${corporateAccountName ?? "corporate account"}`,
            priority: "critical" as const,
            sectionId: "payment-section",
          },
        ]
      : [
          ...(isApproved && !isPaid
            ? [
                {
                  key: "payment_link",
                  label: "Payment Link Sent",
                  description:
                    "Send payment link to customer or take manual payment",
                  isComplete: hasPaymentLinkSent,
                  value: hasPaymentLinkSent ? "Sent" : null,
                  priority: "critical" as const,
                  sectionId: "payment-section",
                },
              ]
            : []),
          ...(isPaid
            ? [
                {
                  key: "payment_received",
                  label: "Payment Received",
                  description: "Customer has completed payment",
                  isComplete: true,
                  value: "Paid",
                  priority: "critical" as const,
                  sectionId: "payment-section",
                },
              ]
            : []),
        ]),
  ];

  const incompleteItems = checklist.filter((item) => !item.isComplete);
  const criticalMissing = incompleteItems.filter(
    (item) => item.priority === "critical",
  );
  const importantMissing = incompleteItems.filter(
    (item) => item.priority === "important",
  );

  const alertLevel = allComplete
    ? "complete"
    : criticalMissing.length > 0
      ? "critical"
      : "warning";

  return (
    <div className={`${styles.container} ${styles[`alert_${alertLevel}`]}`}>
      <div className={styles.header}>
        <span className={styles.icon}>
          {allComplete ? "✅" : alertLevel === "critical" ? "⚠️" : "📋"}
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>
            {allComplete
              ? "Booking Ready"
              : alertLevel === "critical"
                ? "Action Required"
                : "Booking Incomplete"}
          </h3>
          <p className={styles.subtitle}>
            {allComplete
              ? "All steps completed – booking is ready for service"
              : criticalMissing.length > 0
                ? `${criticalMissing.length} critical item${criticalMissing.length > 1 ? "s" : ""} missing`
                : `${importantMissing.length} item${importantMissing.length > 1 ? "s" : ""} to complete`}
          </p>
        </div>
      </div>

      <div className={styles.checklist}>
        {checklist.map((item) => (
          <div
            key={item.key}
            className={`${styles.checkItem} ${item.isComplete ? styles.complete : styles.incomplete} ${!item.isComplete && item.priority === "critical" ? styles.critical : ""} ${styles.clickable}`}
            onClick={() => handleSectionClick(item.sectionId)}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSectionClick(item.sectionId);
              }
            }}
          >
            <div className={styles.checkIcon}>
              {item.isComplete ? "✓" : item.priority === "critical" ? "!" : "○"}
            </div>
            <div className={styles.checkContent}>
              <div className={styles.checkLabel}>
                {item.label}
                {!item.isComplete && item.priority === "critical" && (
                  <span className={styles.criticalBadge}>Required</span>
                )}
              </div>
              {item.isComplete ? (
                <div className={styles.checkValue}>{item.value}</div>
              ) : (
                <div className={styles.checkDescription}>
                  {item.description}
                </div>
              )}
            </div>
            {!item.isComplete && <div className={styles.goToArrow}>→</div>}
          </div>
        ))}
      </div>

      {!allComplete && (
        <>
          {!hasDriver && (
            <div className={styles.impactWarning}>
              <strong>🚗 Driver Impact:</strong> The assigned driver cannot see
              this trip in their dashboard until they are assigned.
            </div>
          )}
          {!hasVehicleUnit && hasDriver && (
            <div className={styles.impactWarning}>
              <strong>📧 Customer Impact:</strong> The customer confirmation
              email won&apos;t include specific vehicle details until a vehicle
              unit is assigned.
            </div>
          )}
        </>
      )}
    </div>
  );
}
