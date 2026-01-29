"use client";

import styles from "./BookingCompletionChecklist.module.css";

type Props = {
  bookingId: string;
  bookingStatus: string;
  // Assignment info
  hasDriver: boolean;
  driverName: string | null;
  hasVehicleUnit: boolean;
  vehicleUnitName: string | null;
  hasVehicleCategory: boolean;
  vehicleCategoryName: string | null;
  // Payment info
  isPaid: boolean;
  isApproved: boolean;
  // Payment link sent
  hasPaymentLinkSent: boolean;
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

// Function to scroll to section and highlight it
function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (!element) return;

  // Scroll to the element with some offset
  const yOffset = -100;
  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({ top: y, behavior: "smooth" });

  // Add highlight class
  element.classList.add("card-highlight");

  // Remove highlight class after 5 seconds with fade
  setTimeout(() => {
    element.classList.add("card-highlight-fade");
  }, 4000);

  setTimeout(() => {
    element.classList.remove("card-highlight", "card-highlight-fade");
  }, 5000);
}

export default function BookingCompletionChecklist({
  bookingStatus,
  hasDriver,
  driverName,
  hasVehicleUnit,
  vehicleUnitName,
  hasVehicleCategory,
  vehicleCategoryName,
  isPaid,
  isApproved,
  hasPaymentLinkSent,
}: Props) {
  // Don't show for terminal statuses
  const terminalStatuses = [
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "NO_SHOW",
    "DECLINED",
  ];
  if (terminalStatuses.includes(bookingStatus)) {
    return null;
  }

  // Don't show if everything is complete
  // Payment link sent OR paid counts as payment complete (admin's job is done)
  const paymentComplete = isPaid || hasPaymentLinkSent;
  const allComplete =
    isApproved && paymentComplete && hasDriver && hasVehicleUnit;
  if (allComplete) {
    return null;
  }

  const checklist: ChecklistItem[] = [
    {
      key: "approved",
      label: "Booking Approved",
      description: "Approve the booking to proceed with payment and assignment",
      isComplete: isApproved,
      value: isApproved ? "Approved" : null,
      priority: "critical",
      sectionId: "approval-section",
    },
    // Payment link - only show if approved and not yet paid
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
    {
      key: "vehicle_category",
      label: "Vehicle Category",
      description: "Select which type of vehicle (SUV, Van, etc.)",
      isComplete: hasVehicleCategory,
      value: vehicleCategoryName,
      priority: "important",
      sectionId: "trip-section",
    },
    {
      key: "driver",
      label: "Driver Assigned",
      description:
        "Driver needs assignment to see this trip in their dashboard",
      isComplete: hasDriver,
      value: driverName,
      priority: "critical",
      sectionId: "assign-section",
    },
    {
      key: "vehicle_unit",
      label: "Vehicle Unit Assigned",
      description:
        "Specific vehicle (e.g., Escalade #1) for dispatch and customer confirmation",
      isComplete: hasVehicleUnit,
      value: vehicleUnitName,
      priority: "important",
      sectionId: "assign-section",
    },
  ];

  const incompleteItems = checklist.filter((item) => !item.isComplete);
  const criticalMissing = incompleteItems.filter(
    (item) => item.priority === "critical",
  );
  const importantMissing = incompleteItems.filter(
    (item) => item.priority === "important",
  );

  // Determine alert level
  const alertLevel = criticalMissing.length > 0 ? "critical" : "warning";

  return (
    <div className={`${styles.container} ${styles[`alert_${alertLevel}`]}`}>
      <div className={styles.header}>
        <span className={styles.icon}>
          {alertLevel === "critical" ? "⚠️" : "📋"}
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>
            {alertLevel === "critical"
              ? "Action Required"
              : "Booking Incomplete"}
          </h3>
          <p className={styles.subtitle}>
            {criticalMissing.length > 0
              ? `${criticalMissing.length} critical item${criticalMissing.length > 1 ? "s" : ""} missing`
              : `${importantMissing.length} item${importantMissing.length > 1 ? "s" : ""} to complete`}
          </p>
        </div>
      </div>

      <div className={styles.checklist}>
        {checklist.map((item) => (
          <div
            key={item.key}
            className={`${styles.checkItem} ${item.isComplete ? styles.complete : styles.incomplete} ${!item.isComplete && item.priority === "critical" ? styles.critical : ""} ${!item.isComplete ? styles.clickable : ""}`}
            onClick={() => !item.isComplete && scrollToSection(item.sectionId)}
            role={!item.isComplete ? "button" : undefined}
            tabIndex={!item.isComplete ? 0 : undefined}
            onKeyDown={(e) => {
              if (!item.isComplete && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                scrollToSection(item.sectionId);
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

      {/* Impact warnings */}
      {!hasDriver && (
        <div className={styles.impactWarning}>
          <strong>🚗 Driver Impact:</strong> The assigned driver cannot see this
          trip in their dashboard until they are assigned.
        </div>
      )}
      {!hasVehicleUnit && hasDriver && (
        <div className={styles.impactWarning}>
          <strong>📧 Customer Impact:</strong> The customer confirmation email
          won&apos;t include specific vehicle details until a vehicle unit is
          assigned.
        </div>
      )}
    </div>
  );
}