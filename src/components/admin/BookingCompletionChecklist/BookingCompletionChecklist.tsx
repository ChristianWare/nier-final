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
};

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
  value: string | null;
  priority: "critical" | "important" | "optional";
};

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
  const allComplete = isApproved && isPaid && hasDriver && hasVehicleUnit;
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
    },
    {
      key: "paid",
      label: "Payment Received",
      description: "Customer has paid for the booking",
      isComplete: isPaid,
      value: isPaid ? "Paid" : null,
      priority: "critical",
    },
    {
      key: "vehicle_category",
      label: "Vehicle Category",
      description: "Select which type of vehicle (SUV, Van, etc.)",
      isComplete: hasVehicleCategory,
      value: vehicleCategoryName,
      priority: "important",
    },
    {
      key: "driver",
      label: "Driver Assigned",
      description:
        "Driver needs assignment to see this trip in their dashboard",
      isComplete: hasDriver,
      value: driverName,
      priority: "critical",
    },
    {
      key: "vehicle_unit",
      label: "Vehicle Unit Assigned",
      description:
        "Specific vehicle (e.g., Escalade #1) for dispatch and customer confirmation",
      isComplete: hasVehicleUnit,
      value: vehicleUnitName,
      priority: "important",
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
            className={`${styles.checkItem} ${item.isComplete ? styles.complete : styles.incomplete} ${!item.isComplete && item.priority === "critical" ? styles.critical : ""}`}
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
