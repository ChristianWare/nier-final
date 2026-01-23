/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import {
  approveBooking,
  unapproveBooking,
} from "../../../../../actions/admin/bookings";
import styles from "./Approvaltoggleclient.module.css";

type Props = {
  bookingId: string;
  isApproved: boolean;
  isPaid: boolean;
  bookingStatus: string;
};

export default function ApprovalToggleClient({
  bookingId,
  isApproved,
  isPaid,
  bookingStatus,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showUnapproveModal, setShowUnapproveModal] = useState(false);

  // Can't unapprove if already paid
  const canUnapprove = !isPaid;

  // Determine status label
  const statusLabel = isApproved
    ? isPaid
      ? "Approved & Paid"
      : "Approved (awaiting payment)"
    : "Pending Approval";

  function handleToggle(checked: boolean) {
    if (checked) {
      // Approving - do it directly
      handleApprove();
    } else {
      // Unapproving - show modal first
      if (canUnapprove) {
        setShowUnapproveModal(true);
      } else {
        toast.error("Cannot unapprove a booking that has already been paid.");
      }
    }
  }

  function handleApprove() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);

      const res = await approveBooking(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Booking approved! Payment link can now be sent.");
      router.refresh();
    });
  }

  function handleUnapprove() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);

      const res = await unapproveBooking(fd);
      if (res?.error) {
        toast.error(res.error);
        setShowUnapproveModal(false);
        return;
      }

      toast.success(
        "Booking approval reversed. Status set back to pending review.",
      );
      setShowUnapproveModal(false);
      router.refresh();
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className='cardTitle h5'>Approval Status</div>
      </div>

      <div className={styles.content}>
        <label className={styles.checkboxRow}>
          <input
            type='checkbox'
            checked={isApproved}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={isPending || (isApproved && !canUnapprove)}
            className={styles.checkbox}
          />
          <span className={styles.checkboxLabel}>
            {isApproved ? "Booking Approved" : "Approve this booking"}
          </span>
        </label>

        <div
          className={`${styles.statusBadge} ${
            isApproved ? styles.statusApproved : styles.statusPending
          }`}
        >
          {statusLabel}
        </div>

        {!isApproved && (
          <p className={styles.hint}>
            Check this box to approve the booking. Once approved, you can send
            the payment link to the client.
          </p>
        )}

        {isApproved && isPaid && (
          <p className={styles.hintLocked}>
            This booking has been paid and cannot be unapproved.
          </p>
        )}
      </div>

      {/* Unapprove Confirmation Modal */}
      <Modal
        isOpen={showUnapproveModal}
        onClose={() => setShowUnapproveModal(false)}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Reverse Approval?</div>

          <p className='paragraph'>
            You are about to <strong>reverse the approval</strong> for this
            booking.
            <br />
            <span className={styles.modalSubnote}>
              The booking status will be set back to &quot;Pending Review&quot;.
            </span>
          </p>

          <div className={styles.warningBox}>
            <strong>⚠️ Please note:</strong>
            <ul className={styles.warningList}>
              <li>Any existing payment links will no longer be valid</li>
              <li>
                The client will not be able to pay until you approve again
              </li>
              <li>You may need to communicate this change to the client</li>
            </ul>
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setShowUnapproveModal(false)}
              disabled={isPending}
            >
              Cancel
            </button>

            <button
              type='button'
              className='dangerBtn'
              onClick={handleUnapprove}
              disabled={isPending}
            >
              {isPending ? "Reversing..." : "Yes, Reverse Approval"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
