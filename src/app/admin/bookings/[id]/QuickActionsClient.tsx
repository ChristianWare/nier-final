"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "../../../../../actions/admin/bookings";
import styles from "./AdminBookingDetailPage.module.css";

type BookingStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "DECLINED"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "NO_SHOW";

type QuickAction = {
  status:
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW"
    | "EN_ROUTE"
    | "ARRIVED"
    | "IN_PROGRESS";
  label: string;
  confirm?: string;
};

const TRIP_ACTIONS: QuickAction[] = [
  { status: "EN_ROUTE", label: "Driver En Route" },
  { status: "ARRIVED", label: "Driver Arrived" },
  { status: "IN_PROGRESS", label: "Start Trip" },
  { status: "COMPLETED", label: "Mark Completed" },
  {
    status: "NO_SHOW",
    label: "No-Show",
    confirm: "Mark this booking as no-show?",
  },
];

const CANCEL_ACTION: QuickAction = {
  status: "CANCELLED",
  label: "Cancel Booking",
  confirm: "Are you sure you want to cancel this booking?",
};

// Check if today is the day of the booking (or after)
function isBookingDay(pickupAt: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const bookingDay = new Date(
    pickupAt.getFullYear(),
    pickupAt.getMonth(),
    pickupAt.getDate(),
  );
  return today >= bookingDay;
}

// Check if the booking day has passed (day after or later)
function isAfterBookingDay(pickupAt: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayAfterBooking = new Date(
    pickupAt.getFullYear(),
    pickupAt.getMonth(),
    pickupAt.getDate() + 1,
  );
  return today >= dayAfterBooking;
}

export default function QuickActionsClient({
  bookingId,
  currentStatus,
  pickupAt,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
  pickupAt: string; // ISO string
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pickupDate = new Date(pickupAt);
  const isTodayOrAfter = isBookingDay(pickupDate);
  const isDayAfterOrLater = isAfterBookingDay(pickupDate);

  // Finalized statuses - no actions available
  const finalizedStatuses: BookingStatus[] = [
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ];

  const isFinalized = finalizedStatuses.includes(currentStatus);

  // Filter trip actions based on current status
  const availableTripActions = TRIP_ACTIONS.filter((action) => {
    if (action.status === currentStatus) return false;

    // No trip actions for draft, pending review, or declined
    if (
      currentStatus === "DRAFT" ||
      currentStatus === "PENDING_REVIEW" ||
      currentStatus === "DECLINED"
    ) {
      return false;
    }

    if (currentStatus === "PENDING_PAYMENT") {
      return action.status === "NO_SHOW"; // Only no-show allowed
    }

    if (currentStatus === "CONFIRMED" || currentStatus === "ASSIGNED") {
      return true; // All trip actions available
    }

    if (currentStatus === "EN_ROUTE") {
      return ["ARRIVED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"].includes(
        action.status,
      );
    }

    if (currentStatus === "ARRIVED") {
      return ["IN_PROGRESS", "COMPLETED", "NO_SHOW"].includes(action.status);
    }

    if (currentStatus === "IN_PROGRESS") {
      return action.status === "COMPLETED";
    }

    return false;
  });

  // Show cancel button unless already finalized or declined
  const showCancelButton =
    !isFinalized &&
    currentStatus !== "DECLINED" &&
    (currentStatus !== "DRAFT" && currentStatus !== "PENDING_REVIEW"
      ? true
      : currentStatus === "DRAFT" || currentStatus === "PENDING_REVIEW");

  // Cancel button is disabled after booking is completed or day after pickup
  const isCancelDisabled = isFinalized || isDayAfterOrLater;

  async function handleAction(action: QuickAction) {
    setError(null);

    if (action.confirm && !window.confirm(action.confirm)) {
      return;
    }

    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("status", action.status);

    startTransition(async () => {
      const result = await updateBookingStatus(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  // If finalized, show message
  if (isFinalized) {
    return (
      <div className={styles.quickActionsFinalized}>
        <p className={styles.muted}>
          This booking is{" "}
          <strong>{currentStatus.toLowerCase().replace("_", " ")}</strong> — no
          further actions available.
        </p>
      </div>
    );
  }

  // If declined, show message
  if (currentStatus === "DECLINED") {
    return (
      <div className={styles.quickActionsFinalized}>
        <p className={styles.muted}>
          This booking is <strong>declined</strong> — use the Approval Status
          section above to reopen or approve it.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.quickActions}>
      {/* Trip action buttons - each on its own line */}
      <div className={styles.quickActionsColumn}>
        {availableTripActions.map((action) => {
          const isDisabled = isPending || !isTodayOrAfter;

          return (
            <button
              key={action.status}
              className={`neutralBtn ${isDisabled ? styles.btnDisabled : ""}`}
              onClick={() => handleAction(action)}
              disabled={isDisabled}
              title={
                !isTodayOrAfter
                  ? "Available on the day of the booking"
                  : undefined
              }
            >
              {action.label}
            </button>
          );
        })}
      </div>
      {!isTodayOrAfter && availableTripActions.length > 0 && (
        <p className={styles.disabledNote}>
          Trip actions will be available on the day of the booking.
        </p>
      )}

      {/* Cancel button - separate row */}
      {showCancelButton && (
        <div className={styles.cancelActionRow}>
          <button
            className={`dangerBtn ${isCancelDisabled ? styles.btnDisabled : ""}`}
            onClick={() => handleAction(CANCEL_ACTION)}
            disabled={isPending || isCancelDisabled}
            title={
              isCancelDisabled
                ? "Cannot cancel after the booking day"
                : undefined
            }
          >
            {CANCEL_ACTION.label}
          </button>
        </div>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
