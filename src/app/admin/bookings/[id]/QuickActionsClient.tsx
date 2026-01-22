"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatus } from "../../../../../actions/admin/bookings";
import styles from "./AdminBookingDetailPage.module.css";

type BookingStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
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
  btnStyle: "default" | "warning" | "danger";
};

const QUICK_ACTIONS: QuickAction[] = [
  { status: "EN_ROUTE", label: "Driver En Route", btnStyle: "default" },
  { status: "ARRIVED", label: "Driver Arrived", btnStyle: "default" },
  { status: "IN_PROGRESS", label: "Start Trip", btnStyle: "default" },
  { status: "COMPLETED", label: "Mark Completed", btnStyle: "default" },
  {
    status: "NO_SHOW",
    label: "No-Show",
    confirm: "Mark this booking as no-show?",
    btnStyle: "warning",
  },
  {
    status: "CANCELLED",
    label: "Cancel Booking",
    confirm: "Are you sure you want to cancel this booking?",
    btnStyle: "danger",
  },
];

function getButtonClass(btnStyle: QuickAction["btnStyle"]) {
  switch (btnStyle) {
    case "warning":
      return "warningBtn";
    case "danger":
      return "dangerBtn";
    default:
      return "primaryBtn";
  }
}

export default function QuickActionsClient({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: BookingStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Don't show actions for finalized bookings
  const finalizedStatuses: BookingStatus[] = [
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ];

  if (finalizedStatuses.includes(currentStatus)) {
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

  // Filter actions based on current status
  const availableActions = QUICK_ACTIONS.filter((action) => {
    // Don't show current status
    if (action.status === currentStatus) return false;

    // Logic for which actions to show based on current status
    if (currentStatus === "DRAFT" || currentStatus === "PENDING_REVIEW") {
      // Only allow cancel
      return action.status === "CANCELLED";
    }

    if (currentStatus === "PENDING_PAYMENT") {
      // Allow cancel or no-show
      return ["CANCELLED", "NO_SHOW"].includes(action.status);
    }

    if (currentStatus === "CONFIRMED" || currentStatus === "ASSIGNED") {
      // Allow all actions
      return true;
    }

    if (currentStatus === "EN_ROUTE") {
      return [
        "ARRIVED",
        "IN_PROGRESS",
        "COMPLETED",
        "NO_SHOW",
        "CANCELLED",
      ].includes(action.status);
    }

    if (currentStatus === "ARRIVED") {
      return ["IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"].includes(
        action.status,
      );
    }

    if (currentStatus === "IN_PROGRESS") {
      return ["COMPLETED", "CANCELLED"].includes(action.status);
    }

    return false;
  });

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

  return (
    <div className={styles.quickActions}>
      <div className={styles.quickActionsRow}>
        {availableActions.map((action) => (
          <button
            key={action.status}
            className={getButtonClass(action.btnStyle)}
            onClick={() => handleAction(action)}
            disabled={isPending}
          >
            {action.label}
          </button>
        ))}
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
