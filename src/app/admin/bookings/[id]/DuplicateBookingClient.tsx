"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateBooking } from "../../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import styles from "./AdminBookingDetailPage.module.css";

export default function DuplicateBookingClient({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleConfirm() {
    setError(null);

    const formData = new FormData();
    formData.append("bookingId", bookingId);

    startTransition(async () => {
      const result = await duplicateBooking(formData);
      if (result.error) {
        setError(result.error);
        setModalOpen(false);
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
        onClick={() => setModalOpen(true)}
        disabled={isPending}
      />
      {error && <p className={styles.errorText}>{error}</p>}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className={styles.modalContent}>
          <h3 className='h4'>Duplicate Booking</h3>
          <p className='subheading'>
            This will create an exact copy of this booking in a pending state.
            Are you sure you want to continue?
          </p>
          <div className={styles.modalActions}>
            <button
              className='goodBtnii'
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Yes, Duplicate"}
            </button>
            <button
              className='neutralBtn'
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
