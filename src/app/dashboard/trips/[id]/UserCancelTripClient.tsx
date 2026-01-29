"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { userCancelBooking } from "../../../../../actions/admin/bookings";
import styles from "./UserTripDetailPage.module.css";

type Props = {
  bookingId: string;
};

export default function UserCancelTripClient({ bookingId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);

    const formData = new FormData();
    formData.append("bookingId", bookingId);

    startTransition(async () => {
      const result = await userCancelBooking(formData);
      if (result.error) {
        setError(result.error);
        setShowConfirm(false);
      } else {
        router.refresh();
      }
    });
  }

  if (showConfirm) {
    return (
      <div className={styles.cancelConfirm}>
        <p className={styles.cancelConfirmText}>
          Are you sure you want to cancel this trip?
        </p>
        <div className={styles.cancelConfirmActions}>
          <button
            type='button'
            className={styles.cancelConfirmYes}
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? "Cancelling..." : "Yes, Cancel Trip"}
          </button>
          <button
            type='button'
            className={styles.cancelConfirmNo}
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
          >
            No, Keep It
          </button>
        </div>
        {error && <p className={styles.cancelError}>{error}</p>}
      </div>
    );
  }

  return (
    <div className={styles.cancelSection}>
      <button
        type='button'
        className={styles.cancelButton}
        onClick={() => setShowConfirm(true)}
      >
        Cancel Trip
      </button>
      {error && <p className={styles.cancelError}>{error}</p>}
    </div>
  );
}
