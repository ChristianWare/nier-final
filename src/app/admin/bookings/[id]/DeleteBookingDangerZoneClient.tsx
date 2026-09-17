"use client";

import styles from "./AdminBookingDetailPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import BulkConfirmModal from "@/components/admin/BulkConfirmModal/BulkConfirmModal";
import { trashBookings } from "../../../../../actions/admin/bookingTrash";

/**
 * Danger zone for a live booking: moves it to the Trash (reversible for
 * 7 days). Permanent deletion is only offered from the Trash itself —
 * see TrashBanner — so this renders nothing once the booking is trashed.
 */
export default function DeleteBookingDangerZoneClient({
  bookingId,
  isTrashed = false,
}: {
  bookingId: string;
  isTrashed?: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  if (isTrashed) return null;

  async function runTrash() {
    if (pending) return;
    setPending(true);
    try {
      const res = await trashBookings([bookingId]);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to move booking to the Trash.");
        return;
      }
      toast.success("Booking moved to the Trash.");
      setConfirmOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`${styles.card} ${styles.dangerCard}`}>
      <div className={styles.dangerTop}>
        <div
          className='cardTitle h4'
          style={{ background: "var(--accent100)" }}
        >
          Danger zone
        </div>
        <p className='subheading'>
          Move this booking to the Trash. It disappears from every list,
          calendar, and report, and can be restored for 7 days. After that,
          unpaid bookings are permanently deleted; bookings with a payment on
          file are kept.
        </p>
      </div>

      <div className={styles.dangerActions}>
        <div className={styles.btnContainer}>
          <button
            type='button'
            className='dangerBtn'
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
          >
            Move to Trash
          </button>
        </div>
        <div className='emptySmall fw700 uppercase'>
          Reversible for 7 days from the Trash tab.
        </div>
      </div>

      <BulkConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runTrash}
        pending={pending}
        title='Move this booking to the Trash?'
        body={
          <>
            Booking <strong>{bookingId}</strong> will be hidden everywhere and
            can be restored from the <strong>Trash</strong> tab for 7 days.
          </>
        }
        confirmLabel='Move to Trash'
        pendingLabel='Moving...'
      />
    </div>
  );
}
