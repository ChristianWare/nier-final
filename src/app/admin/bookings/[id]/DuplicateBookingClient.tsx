"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateBooking } from "../../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import styles from "./AdminBookingDetailPage.module.css";

export default function DuplicateBookingClient({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDuplicate() {
    setError(null);

    if (!window.confirm("Create a duplicate of this booking?")) {
      return;
    }

    const formData = new FormData();
    formData.append("bookingId", bookingId);

    startTransition(async () => {
      const result = await duplicateBooking(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.newBookingId) {
        router.push(`/admin/bookings/${result.newBookingId}`);
      }
    });
  }

  return (
    <div className={styles.duplicateSection}>
      <Button
        text={isPending ? "Creating..." : "Duplicate Booking"}
        btnType='greenReg'
        onClick={handleDuplicate}
        disabled={isPending}
      />
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
