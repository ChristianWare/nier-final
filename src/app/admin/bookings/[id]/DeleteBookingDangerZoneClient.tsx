"use client";

import styles from "./AdminBookingDetailPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { deleteBooking } from "../../../../../actions/bookings/deleteBooking";

export default function DeleteBookingDangerZoneClient({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [ack, setAck] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canDelete = ack && confirmText.trim().toUpperCase() === "DELETE";

  function open() {
    setConfirmText("");
    setAck(false);
    setConfirmOpen(true);
  }

  function runDelete() {
    if (!canDelete || isPending) return;

    startTransition(async () => {
      const res = await deleteBooking(bookingId);

      if (!res?.ok) {
        toast.error(res?.error ?? "Failed to delete booking.");
        return;
      }

      toast.success("Booking deleted.");
      setConfirmOpen(false);
      router.push("/admin/bookings");
      router.refresh();
    });
  }

  return (
    <div className={`${styles.card} ${styles.dangerCard}`}>
      <div className={styles.dangerTop}>
        <div className='cardTitle h4'>Danger zone</div>
        <p className={styles.dangerCopy}>
          Permanently delete this booking and all related records (payment,
          assignment, status events, add-ons).{" "}
          <strong>This can’t be undone.</strong>
        </p>
      </div>

      <div className={styles.dangerActions}>
        <div className={styles.btnContainer}>
          <button type='button' className='dangerBtn' onClick={open}>
            Delete booking
          </button>
        </div>
        <div className={styles.dangerNote}>
          This is permanent. There is no recovery after deletion.
        </div>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Delete this booking?</div>

          <p className='paragraph'>
            You are about to permanently delete booking{" "}
            <strong>{bookingId}</strong>.
            <br />
            <span className={styles.modalSubnote}>This can’t be undone.</span>
          </p>

          <div className={styles.confirmBlock}>
            <label className={styles.confirmLabel}>
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              className='inputBorder'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type DELETE'
              autoComplete='off'
            />

            <label className={styles.confirmCheckboxRow}>
              <input
                type='checkbox'
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span>I understand this action cannot be undone.</span>
            </label>
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>

            <button
              type='button'
              className='dangerBtn'
              onClick={runDelete}
              disabled={isPending || !canDelete}
            >
              {isPending ? "Deleting..." : "Confirm delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
