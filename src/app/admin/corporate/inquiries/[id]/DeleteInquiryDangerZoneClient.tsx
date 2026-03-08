"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateInquiryDetailPage.module.css";
import Modal from "@/components/shared/Modal/Modal";
import { deleteInquiry } from "../../../../../../actions/admin/deleteInquiry";

export default function DeleteInquiryDangerZoneClient({
  inquiryId,
}: {
  inquiryId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText.toUpperCase() === "DELETE";

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteInquiry(inquiryId);
      if (res.ok) {
        toast.success("Inquiry deleted.");
        router.push("/admin/corporate/inquiries");
      } else {
        toast.error(res.error ?? "Failed to delete inquiry.");
      }
    });
  }

  return (
    <>
      <div className={styles.dangerZone}>
        <div className={styles.dangerTop}>
          <div className='cardTitle h4'>Danger Zone</div>
          <p className='subheading'>
            Permanently delete this inquiry. This cannot be undone.
          </p>
        </div>
        <button
          type='button'
          className='dangerBtn'
          style={{ width: "fit-content" }}
          onClick={() => setModalOpen(true)}
          disabled={isPending}
        >
          Delete Inquiry
        </button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setConfirmText("");
        }}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Delete this inquiry?</div>

          <p className='paragraph'>
            This will <strong>permanently delete</strong> this corporate inquiry
            and all associated data. This action cannot be undone.
          </p>

          <div className={styles.dangerImpactBox}>
            <strong>🚨 What gets deleted:</strong>
            <ul className={styles.impactList}>
              <li>All inquiry details and contact information</li>
              <li>Admin notes and review history</li>
              <li>
                If the inquiry was approved, the linked account will{" "}
                <strong>not</strong> be affected
              </li>
            </ul>
          </div>

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
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => {
                setModalOpen(false);
                setConfirmText("");
              }}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='dangerBtn'
              onClick={handleDelete}
              disabled={isPending || !canDelete}
            >
              {isPending ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
