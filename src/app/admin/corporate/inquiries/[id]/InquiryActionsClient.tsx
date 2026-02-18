"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateInquiryDetailPage.module.css";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import {
  updateInquiryStatus,
  updateInquiryNotes,
  approveInquiryAndCreateAccount,
} from "../../../../../../actions/corporate/corporateAdminActions";

type Props = {
  inquiryId: string;
  currentStatus: string;
  currentNotes: string;
};

export default function InquiryActionsClient({
  inquiryId,
  currentStatus,
  currentNotes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Notes lock/unlock state
  const [notes, setNotes] = useState(currentNotes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Modal open states
  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [contactedOpen, setContactedOpen] = useState(false);

  // Approve form state
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [paymentMethod, setPaymentMethod] = useState("INVOICE");
  const [paymentTerms, setPaymentTerms] = useState("NET_30");
  const [discount, setDiscount] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const isTerminal =
    currentStatus === "APPROVED" || currentStatus === "DECLINED";

  /* ── Notes card class ── */
  const notesCardClass = notesSaved
    ? `${styles.card} ${styles.cardSaved}`
    : isEditingNotes
      ? `${styles.card} ${styles.cardEditing}`
      : styles.card;

  function handleSaveNotes() {
    startTransition(async () => {
      const res = await updateInquiryNotes(inquiryId, notes);
      if (res.ok) {
        toast.success("Notes saved.");
        setNotesSaved(true);
        setTimeout(() => {
          setNotesSaved(false);
          setIsEditingNotes(false);
        }, 2000);
      } else {
        toast.error(res.error ?? "Failed to save notes.");
      }
    });
  }

  function handleCancelNotes() {
    setNotes(currentNotes);
    setIsEditingNotes(false);
  }

  const renderNotesActions = () => {
    if (notesSaved) {
      return (
        <div className={styles.notesActions}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditingNotes) {
      return (
        <div className={styles.notesActions}>
          <Button
            btnType='greenReg'
            type='button'
            onClick={handleSaveNotes}
            disabled={isPending}
            text={isPending ? "Saving..." : "Save Notes"}
          />
          {!isPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleCancelNotes}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.notesActions}>
        <Button
          text='Edit Notes'
          btnType='grayReg'
          type='button'
          onClick={() => setIsEditingNotes(true)}
        />
      </div>
    );
  };

  function handleMarkContactedConfirm() {
    startTransition(async () => {
      const res = await updateInquiryStatus(inquiryId, "CONTACTED");
      if (res.ok) {
        toast.success("Marked as contacted.");
        setContactedOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  function handleDeclineConfirm() {
    startTransition(async () => {
      const res = await updateInquiryStatus(inquiryId, "DECLINED");
      if (res.ok) {
        toast.success("Inquiry declined.");
        setDeclineOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed.");
      }
    });
  }

  function handleApproveSubmit() {
    startTransition(async () => {
      const res = await approveInquiryAndCreateAccount(inquiryId, {
        billingCycle: billingCycle as "MONTHLY" | "WEEKLY" | "PER_RIDE",
        paymentMethod: paymentMethod as "INVOICE" | "CHECK" | "CARD_ON_FILE",
        paymentTerms: paymentTerms as
          | "NET_15"
          | "NET_30"
          | "NET_45"
          | "DUE_ON_RECEIPT",
        discountPercent: discount ? parseFloat(discount) : null,
        monthlyLimitCents: monthlyLimit
          ? Math.round(parseFloat(monthlyLimit) * 100)
          : null,
      });
      if (res.ok) {
        toast.success("Account created!");
        setApproveOpen(false);
        router.push(`/admin/corporate/${res.accountId}`);
      } else {
        toast.error(res.error ?? "Failed to create account.");
      }
    });
  }

  return (
    <>
      {/* Admin Notes */}
      <div className={notesCardClass}>
        <div className={styles.cardTop}>
          <div className='cardTitle h4'>Admin Notes</div>
        </div>
        <textarea
          className={styles.textarea}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='Internal notes about this inquiry...'
          disabled={!isEditingNotes || isPending}
        />
        {renderNotesActions()}
      </div>

      {/* Action Buttons */}
      {!isTerminal && (
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <div className='cardTitle h4'>Actions</div>
          </div>
          <div className={styles.actionsRow}>
            {currentStatus === "PENDING" && (
              <button
                className='warningBtn'
                onClick={() => setContactedOpen(true)}
                disabled={isPending}
              >
                Mark as Contacted
              </button>
            )}
            <button
              className='goodBtnii'
              onClick={() => setApproveOpen(true)}
              disabled={isPending}
            >
              Approve & Create Account
            </button>
            <button
              className='dangerBtn'
              onClick={() => setDeclineOpen(true)}
              disabled={isPending}
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Mark as Contacted Modal */}
      {contactedOpen && (
        <Modal isOpen={contactedOpen} onClose={() => setContactedOpen(false)}>
          <div className={styles.modalContent}>
            <h3 className='h4'>Mark as Contacted</h3>
            <p className='subheading'>
              Confirm that your team has reached out to this company. The
              inquiry status will update to Contacted.
            </p>
            <div className={styles.modalActions}>
              <button
                className='warningBtn'
                onClick={handleMarkContactedConfirm}
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Yes, Mark as Contacted"}
              </button>
              <button
                className='neutralBtn'
                onClick={() => setContactedOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Decline Modal */}
      {declineOpen && (
        <Modal isOpen={declineOpen} onClose={() => setDeclineOpen(false)}>
          <div className={styles.modalContent}>
            <h3 className='h4'>Decline Inquiry</h3>
            <p className='subheading'>
              Are you sure you want to decline this inquiry? This action cannot
              be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                className='dangerBtn'
                onClick={handleDeclineConfirm}
                disabled={isPending}
              >
                {isPending ? "Declining..." : "Yes, Decline"}
              </button>
              <button
                className='neutralBtn'
                onClick={() => setDeclineOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Modal */}
      {approveOpen && (
        <Modal isOpen={approveOpen} onClose={() => setApproveOpen(false)}>
          <div className={styles.modalContent}>
            <h3 className='h4'>Create Corporate Account</h3>
            <p className='subheading'>
              Set the payment terms for this account. The account will be
              created immediately.
            </p>

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Billing Cycle</label>
                <select
                  className='selectBorder emptySmall'
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                >
                  <option value='MONTHLY'>Monthly</option>
                  <option value='WEEKLY'>Weekly</option>
                  <option value='PER_RIDE'>Per Ride</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Payment Method</label>
                <select
                  className='selectBorder emptySmall'
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value='INVOICE'>Invoice</option>
                  <option value='CHECK'>Check</option>
                  <option value='CARD_ON_FILE'>Card on File</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Payment Terms</label>
                <select
                  className='selectBorder emptySmall'
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                >
                  <option value='NET_15'>NET 15</option>
                  <option value='NET_30'>NET 30</option>
                  <option value='NET_45'>NET 45</option>
                  <option value='DUE_ON_RECEIPT'>Due on Receipt</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Discount %</label>
                <input
                  type='number'
                  className='inputBorder'
                  placeholder='e.g. 10'
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min='0'
                  max='100'
                  step='0.5'
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Monthly Spending Limit ($)
                </label>
                <input
                  type='number'
                  className='inputBorder'
                  placeholder='Leave blank for no limit'
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  min='0'
                  step='100'
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className='goodBtnii'
                onClick={handleApproveSubmit}
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create Account"}
              </button>
              <button
                className='neutralBtn'
                onClick={() => setApproveOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
