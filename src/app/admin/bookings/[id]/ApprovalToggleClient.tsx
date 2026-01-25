/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./Approvaltoggleclient.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import {
  approveBooking,
  unapproveBooking,
  declineBooking,
  reopenBooking,
} from "../../../../../actions/admin/bookings";

type Props = {
  bookingId: string;
  isApproved: boolean;
  isDeclined: boolean;
  isPaid: boolean;
  bookingStatus: string;
  declineReason?: string | null;
};

export default function ApprovalToggleClient({
  bookingId,
  isApproved,
  isDeclined,
  isPaid,
  bookingStatus,
  declineReason,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showUnapproveModal, setShowUnapproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReasonInput, setDeclineReasonInput] = useState("");

  // Can't unapprove or decline if already paid
  const canModify = !isPaid;

  // Determine status label
  const getStatusLabel = () => {
    if (isDeclined) return "Declined";
    if (isApproved) {
      return isPaid ? "Approved & Paid" : "Approved (awaiting payment)";
    }
    return "Pending Approval";
  };

  // Determine status style
  const getStatusStyle = () => {
    if (isDeclined) return styles.statusDeclined;
    if (isApproved) return styles.statusApproved;
    return styles.statusPending;
  };

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

  function handleDecline() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);
      fd.set("reason", declineReasonInput);

      const res = await declineBooking(fd);
      if (res?.error) {
        toast.error(res.error);
        setShowDeclineModal(false);
        return;
      }

      toast.success("Booking declined.");
      setShowDeclineModal(false);
      setDeclineReasonInput("");
      router.refresh();
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);

      const res = await reopenBooking(fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Booking reopened for review.");
      router.refresh();
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className='cardTitle h5'>Approval Status</div>
      </div>

      <div className={styles.content}>
        {/* Status Badge */}
        <div className={`${styles.statusBadge} ${getStatusStyle()}`}>
          {getStatusLabel()}
        </div>

        {/* Show decline reason if declined */}
        {isDeclined && declineReason && (
          <div className={styles.declineReasonDisplay}>
            <strong>Reason:</strong> {declineReason}
          </div>
        )}

        {/* Actions based on current state */}
        {!isDeclined && !isApproved && (
          <>
            <p className={styles.hint}>
              Review this booking request and approve or decline it.
            </p>
            <div className={styles.actionButtons}>
              <Button
                type='button'
                text={isPending ? "Approving..." : "Approve"}
                btnType='green'
                checkIcon
                onClick={handleApprove}
                disabled={isPending}
              />
              <Button
                type='button'
                text='Decline'
                btnType='red'
                closeIcon
                onClick={() => setShowDeclineModal(true)}
                disabled={isPending}
              />
            </div>
          </>
        )}

        {isApproved && !isPaid && (
          <>
            <p className={styles.hint}>
              This booking is approved. You can now send a payment link to the
              client.
            </p>
            <div className={styles.actionButtons}>
              <Button
                type='button'
                text='Reverse Approval'
                btnType='gray'
                onClick={() => setShowUnapproveModal(true)}
                disabled={isPending}
              />
              <Button
                type='button'
                text='Decline Instead'
                btnType='red'
                closeIcon
                onClick={() => setShowDeclineModal(true)}
                disabled={isPending}
              />
            </div>
          </>
        )}

        {isApproved && isPaid && (
          <p className={`${styles.hintLocked} miniNote`}>
            This booking has been paid and cannot be modified.
          </p>
        )}

        {isDeclined && (
          <>
            <p className={styles.hint}>
              This booking was declined. You can reopen it for review or approve
              it directly.
            </p>
            <div className={styles.actionButtons}>
              <Button
                type='button'
                text={isPending ? "Reopening..." : "Reopen for Review"}
                btnType='gray'
                onClick={handleReopen}
                disabled={isPending}
              />
              <Button
                type='button'
                text={isPending ? "Approving..." : "Approve Now"}
                btnType='green'
                checkIcon
                onClick={handleApprove}
                disabled={isPending}
              />
            </div>
          </>
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
            <Button
              type='button'
              text='Cancel'
              btnType='gray'
              onClick={() => setShowUnapproveModal(false)}
              disabled={isPending}
            />
            <Button
              type='button'
              text={isPending ? "Reversing..." : "Yes, Reverse Approval"}
              btnType='red'
              onClick={handleUnapprove}
              disabled={isPending}
            />
          </div>
        </div>
      </Modal>

      {/* Decline Confirmation Modal */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Decline Booking?</div>

          <p className='paragraph'>
            You are about to <strong>decline</strong> this booking request.
          </p>

          <div className={styles.formGroup}>
            <label className='cardTitle h6'>
              Reason for declining (optional)
            </label>
            <textarea
              className={styles.reasonTextarea}
              placeholder='e.g., Service not available for this date, outside service area, etc.'
              value={declineReasonInput}
              onChange={(e) => setDeclineReasonInput(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.warningBox}>
            <strong>⚠️ Please note:</strong>
            <ul className={styles.warningList}>
              <li>The client will not be able to pay for this booking</li>
              <li>You can reopen or approve the booking later if needed</li>
              <li>Consider notifying the client about the decline</li>
            </ul>
          </div>

          <div className={styles.modalActions}>
            <Button
              type='button'
              text='Cancel'
              btnType='gray'
              onClick={() => {
                setShowDeclineModal(false);
                setDeclineReasonInput("");
              }}
              disabled={isPending}
            />
            <Button
              type='button'
              text={isPending ? "Declining..." : "Decline Booking"}
              btnType='red'
              closeIcon
              onClick={handleDecline}
              disabled={isPending}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
