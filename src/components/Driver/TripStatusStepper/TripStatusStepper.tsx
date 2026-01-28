/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import toast from "react-hot-toast";
import styles from "./TripStatusStepper.module.css";
import { driverUpdateTripStatus } from "../../../../actions/driver-dashboard/driverUpdateTripStatus"; 
// Status order for the stepper
const STATUS_ORDER: BookingStatus[] = [
  BookingStatus.ASSIGNED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

// Terminal statuses
const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
];

// Statuses that should show the stepper (driver flow)
// CONFIRMED is included because a driver might be assigned before status changes to ASSIGNED
const DRIVER_FLOW_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.ASSIGNED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

// Labels for each status
const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.ASSIGNED]: "Assigned",
  [BookingStatus.EN_ROUTE]: "En Route",
  [BookingStatus.ARRIVED]: "Arrived",
  [BookingStatus.IN_PROGRESS]: "Picked Up",
  [BookingStatus.COMPLETED]: "Completed",
  [BookingStatus.NO_SHOW]: "No-Show",
  [BookingStatus.CANCELLED]: "Cancelled",
  [BookingStatus.PENDING_REVIEW]: "Pending Review",
  [BookingStatus.PENDING_PAYMENT]: "Pending Payment",
  [BookingStatus.CONFIRMED]: "Confirmed",
  [BookingStatus.DECLINED]: "Declined",
  [BookingStatus.DRAFT]: "Draft",
  [BookingStatus.REFUNDED]: "Refunded",
  [BookingStatus.PARTIALLY_REFUNDED]: "Partially Refunded",
};

// Button labels for advancing to next status
const NEXT_ACTION_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.ASSIGNED]: "I'm On My Way",
  [BookingStatus.EN_ROUTE]: "I've Arrived",
  [BookingStatus.ARRIVED]: "Passenger Picked Up",
  [BookingStatus.IN_PROGRESS]: "Complete Trip",
  [BookingStatus.COMPLETED]: "",
  [BookingStatus.NO_SHOW]: "",
  [BookingStatus.CANCELLED]: "",
  [BookingStatus.PENDING_REVIEW]: "",
  [BookingStatus.PENDING_PAYMENT]: "",
  [BookingStatus.CONFIRMED]: "Start Trip",
  [BookingStatus.DECLINED]: "",
  [BookingStatus.DRAFT]: "",
  [BookingStatus.REFUNDED]: "",
  [BookingStatus.PARTIALLY_REFUNDED]: "",
};

// Icons for each status
const STATUS_ICONS: Record<BookingStatus, string> = {
  [BookingStatus.ASSIGNED]: "📋",
  [BookingStatus.EN_ROUTE]: "🚗",
  [BookingStatus.ARRIVED]: "📍",
  [BookingStatus.IN_PROGRESS]: "👥",
  [BookingStatus.COMPLETED]: "✅",
  [BookingStatus.NO_SHOW]: "❌",
  [BookingStatus.CANCELLED]: "🚫",
  [BookingStatus.PENDING_REVIEW]: "⏳",
  [BookingStatus.PENDING_PAYMENT]: "💳",
  [BookingStatus.CONFIRMED]: "✓",
  [BookingStatus.DECLINED]: "✗",
  [BookingStatus.DRAFT]: "📝",
  [BookingStatus.REFUNDED]: "💰",
  [BookingStatus.PARTIALLY_REFUNDED]: "💰",
};

type TripStatusStepperProps = {
  bookingId: string;
  currentStatus: BookingStatus;
  arrivedAt?: Date | string | null; // When driver arrived (for no-show timer)
  initialWaitMinutes?: number; // Pre-calculated on server
  pickupAt: Date | string; // Pickup time to check if trip is today
};

export default function TripStatusStepper({
  bookingId,
  currentStatus,
  arrivedAt,
  initialWaitMinutes = 15,
  pickupAt,
}: TripStatusStepperProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showGoBackModal, setShowGoBackModal] = useState(false);
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [reason, setReason] = useState("");

  // Check if terminal state
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);

  // Check if in driver flow (includes CONFIRMED since driver might be assigned)
  const isInDriverFlow = DRIVER_FLOW_STATUSES.includes(currentStatus);

  // For display purposes, treat CONFIRMED as ASSIGNED (index 0)
  const displayStatus =
    currentStatus === BookingStatus.CONFIRMED
      ? BookingStatus.ASSIGNED
      : currentStatus;

  // Check if trip is today or in the past (eligible for status updates)
  const pickupDate = new Date(pickupAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pickupDay = new Date(
    pickupDate.getFullYear(),
    pickupDate.getMonth(),
    pickupDate.getDate(),
  );
  const isTodayOrPast = pickupDay <= today;

  // Get current step index based on display status
  const currentIndex = STATUS_ORDER.indexOf(displayStatus);
  const isInMainFlow = currentIndex >= 0 || isInDriverFlow;

  // Get next status
  const nextStatus =
    isInMainFlow && currentIndex < STATUS_ORDER.length - 1
      ? STATUS_ORDER[currentIndex + 1]
      : null;

  // Get previous status (for go back)
  const prevStatus =
    isInMainFlow && currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;

  // Check if no-show is available (only at ARRIVED status)
  const canMarkNoShow = currentStatus === BookingStatus.ARRIVED;

  // Track countdown state - initialize with server-calculated value
  const [noShowWaitRemaining, setNoShowWaitRemaining] =
    useState(initialWaitMinutes);

  // Set up interval to update countdown every minute
  useEffect(() => {
    if (!canMarkNoShow || !arrivedAt || noShowWaitRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setNoShowWaitRemaining((prev) => Math.max(0, prev - 1));
    }, 60000);

    return () => clearInterval(interval);
  }, [canMarkNoShow, arrivedAt, noShowWaitRemaining]);

  async function handleAdvance() {
    if (!nextStatus || isPending) return;

    startTransition(async () => {
      const result = await driverUpdateTripStatus({
        bookingId,
        newStatus: nextStatus,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Status updated to ${STATUS_LABELS[nextStatus]}`);
      router.refresh();
    });
  }

  async function handleGoBack() {
    if (!prevStatus || isPending || !reason.trim()) return;

    startTransition(async () => {
      const result = await driverUpdateTripStatus({
        bookingId,
        newStatus: prevStatus,
        reason: reason.trim(),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`Status reverted to ${STATUS_LABELS[prevStatus]}`);
      setShowGoBackModal(false);
      setReason("");
      router.refresh();
    });
  }

  async function handleNoShow() {
    if (!canMarkNoShow || isPending || !reason.trim()) return;

    startTransition(async () => {
      const result = await driverUpdateTripStatus({
        bookingId,
        newStatus: BookingStatus.NO_SHOW,
        reason: reason.trim(),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Trip marked as no-show");
      setShowNoShowModal(false);
      setReason("");
      router.refresh();
    });
  }

  // Render for non-main-flow statuses or future trips
  if (!isInMainFlow && !isTerminal) {
    // This shouldn't happen for drivers - they only see ASSIGNED trips
    // But just in case, show a sensible message
    return (
      <div className={styles.container}>
        <div className={styles.statusBanner}>
          <span className={styles.statusIcon}>
            {STATUS_ICONS[currentStatus]}
          </span>
          <span className={styles.statusText}>
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>
        <p className={styles.waitingMessage}>
          This trip is being prepared. You&apos;ll be notified when it&apos;s
          ready.
        </p>
      </div>
    );
  }

  // Show message for future trips (not today)
  if (!isTodayOrPast && !isTerminal) {
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(pickupDate);

    return (
      <div className={styles.container}>
        <div className={styles.stepper}>
          {STATUS_ORDER.map((status, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={status} className={styles.stepWrapper}>
                <div className={styles.step}>
                  <div
                    className={`${styles.stepCircle} ${
                      isCompleted ? styles.completed : ""
                    } ${isCurrent ? styles.current : ""}`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  <span className={styles.stepLabel}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                {index < STATUS_ORDER.length - 1 && (
                  <div
                    className={`${styles.connector} ${
                      isCompleted ? styles.connectorCompleted : ""
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.futureTripBanner}>
          <span className={styles.futureIcon}>📅</span>
          <div className={styles.futureText}>
            <strong>Scheduled for {formattedDate}</strong>
            <p>Trip controls will be available on the day of your trip.</p>
          </div>
        </div>
      </div>
    );
  }

  // Terminal state display
  if (isTerminal) {
    return (
      <div className={styles.container}>
        <div className={styles.stepper}>
          {STATUS_ORDER.map((status, index) => {
            const isCompleted =
              currentStatus === BookingStatus.COMPLETED
                ? true
                : index < currentIndex;
            const isCurrent =
              status === currentStatus ||
              (currentStatus === BookingStatus.NO_SHOW &&
                status === BookingStatus.ARRIVED);

            return (
              <div key={status} className={styles.stepWrapper}>
                <div className={styles.step}>
                  <div
                    className={`${styles.stepCircle} ${
                      isCompleted ? styles.completed : ""
                    } ${isCurrent ? styles.current : ""} ${
                      currentStatus === BookingStatus.NO_SHOW &&
                      status === BookingStatus.ARRIVED
                        ? styles.noShow
                        : ""
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  <span className={styles.stepLabel}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                {index < STATUS_ORDER.length - 1 && (
                  <div
                    className={`${styles.connector} ${
                      isCompleted ? styles.connectorCompleted : ""
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div
          className={`${styles.completedBanner} ${
            currentStatus === BookingStatus.NO_SHOW ? styles.noShowBanner : ""
          }`}
        >
          <span className={styles.completedIcon}>
            {currentStatus === BookingStatus.COMPLETED ? "✅" : "❌"}
          </span>
          <span className={styles.completedText}>
            {currentStatus === BookingStatus.COMPLETED
              ? "Trip Completed Successfully!"
              : currentStatus === BookingStatus.NO_SHOW
                ? "Marked as No-Show"
                : STATUS_LABELS[currentStatus]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Desktop Progress Stepper */}
      <div className={styles.stepper}>
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={status} className={styles.stepWrapper}>
              <div className={styles.step}>
                <div
                  className={`${styles.stepCircle} ${
                    isCompleted ? styles.completed : ""
                  } ${isCurrent ? styles.current : ""}`}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>
                <span
                  className={`${styles.stepLabel} ${
                    isCurrent ? styles.stepLabelCurrent : ""
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              {index < STATUS_ORDER.length - 1 && (
                <div
                  className={`${styles.connector} ${
                    isCompleted ? styles.connectorCompleted : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stacked Steps */}
      <div className={styles.mobileSteps}>
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          const stepClass = isCompleted
            ? styles.mobileStepCompleted
            : isCurrent
              ? styles.mobileStepCurrent
              : styles.mobileStepUpcoming;

          return (
            <div key={status} className={`${styles.mobileStep} ${stepClass}`}>
              <div className={styles.mobileStepNumber}>
                {isCompleted ? "✓" : index + 1}
              </div>
              <div className={styles.mobileStepContent}>
                <span className={styles.mobileStepLabel}>
                  {STATUS_LABELS[status]}
                </span>
                <span className={styles.mobileStepStatus}>
                  {isCompleted
                    ? "Completed"
                    : isCurrent
                      ? "Current Step"
                      : "Upcoming"}
                </span>
                {/* Show action button inside current step */}
                {isCurrent && nextStatus && (
                  <button
                    className={styles.mobileStepAction}
                    onClick={handleAdvance}
                    disabled={isPending}
                  >
                    {isPending
                      ? "Updating..."
                      : NEXT_ACTION_LABELS[currentStatus]}
                  </button>
                )}
              </div>
              <span className={styles.mobileStepIcon}>
                {STATUS_ICONS[status]}
              </span>
            </div>
          );
        })}

        {/* Mobile Secondary Actions */}
        {(prevStatus || canMarkNoShow) && (
          <div className={styles.mobileSecondaryActions}>
            {prevStatus && (
              <button
                className={styles.goBackButton}
                onClick={() => setShowGoBackModal(true)}
                disabled={isPending}
              >
                ← Go Back
              </button>
            )}
            {canMarkNoShow && (
              <button
                className={styles.noShowButton}
                onClick={() => setShowNoShowModal(true)}
                disabled={isPending || noShowWaitRemaining > 0}
              >
                {noShowWaitRemaining > 0
                  ? `No-Show (${noShowWaitRemaining}m)`
                  : "Mark No-Show"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Current Status Display */}
      <div className={styles.currentStatusCard}>
        <div className={styles.currentStatusHeader}>
          <span className={styles.currentStatusIcon}>
            {STATUS_ICONS[currentStatus]}
          </span>
          <span className={styles.currentStatusLabel}>
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>

        {/* Main Action Button */}
        {nextStatus && (
          <button
            className={styles.advanceButton}
            onClick={handleAdvance}
            disabled={isPending}
          >
            {isPending ? "Updating..." : NEXT_ACTION_LABELS[currentStatus]}
          </button>
        )}

        {/* Secondary Actions */}
        <div className={styles.secondaryActions}>
          {/* Go Back Button */}
          {prevStatus && (
            <button
              className={styles.goBackButton}
              onClick={() => setShowGoBackModal(true)}
              disabled={isPending}
            >
              ← Go Back
            </button>
          )}

          {/* No-Show Button (only at ARRIVED) */}
          {canMarkNoShow && (
            <button
              className={styles.noShowButton}
              onClick={() => setShowNoShowModal(true)}
              disabled={isPending || noShowWaitRemaining > 0}
              title={
                noShowWaitRemaining > 0
                  ? `Wait ${noShowWaitRemaining} more minutes`
                  : "Mark passenger as no-show"
              }
            >
              {noShowWaitRemaining > 0
                ? `No-Show (wait ${noShowWaitRemaining}m)`
                : "Mark No-Show"}
            </button>
          )}
        </div>
      </div>

      {/* Go Back Modal */}
      {showGoBackModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowGoBackModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              Go Back to {STATUS_LABELS[prevStatus!]}
            </h3>
            <p className={styles.modalDescription}>
              Please provide a reason for reverting the status:
            </p>
            <textarea
              className={styles.reasonInput}
              placeholder="e.g., I accidentally marked arrived but I'm still 5 min away"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowGoBackModal(false);
                  setReason("");
                }}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleGoBack}
                disabled={isPending || !reason.trim()}
              >
                {isPending ? "Updating..." : "Confirm Go Back"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No-Show Modal */}
      {showNoShowModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowNoShowModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Mark as No-Show</h3>
            <p className={styles.modalDescription}>
              Please confirm the passenger did not show up and provide details:
            </p>
            <textarea
              className={styles.reasonInput}
              placeholder='e.g., Waited 20 minutes, called twice, no response'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowNoShowModal(false);
                  setReason("");
                }}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                className={styles.noShowConfirmButton}
                onClick={handleNoShow}
                disabled={isPending || !reason.trim()}
              >
                {isPending ? "Processing..." : "Confirm No-Show"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
