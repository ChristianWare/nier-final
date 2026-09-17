"use client";

import { useEffect, useState, type ReactNode } from "react";
import Modal from "@/components/shared/Modal/Modal";
import styles from "./BulkConfirmModal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  title: string;
  body: ReactNode;
  subnote?: string;
  confirmLabel: string;
  pendingLabel: string;
  /**
   * Irreversible actions require typing DELETE and ticking the
   * acknowledgement — the same gate as the booking page's danger zone.
   */
  irreversible?: boolean;
};

export default function BulkConfirmModal({
  open,
  onClose,
  onConfirm,
  pending,
  title,
  body,
  subnote,
  confirmLabel,
  pendingLabel,
  irreversible = false,
}: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [ack, setAck] = useState(false);

  // Reset the gate every time the modal opens
  useEffect(() => {
    if (open) {
      setConfirmText("");
      setAck(false);
    }
  }, [open]);

  const canConfirm =
    !irreversible || (ack && confirmText.trim().toUpperCase() === "DELETE");

  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className={styles.modalContent}>
        <div className='cardTitle h5'>{title}</div>

        <p className='paragraph'>
          {body}
          {subnote && (
            <>
              <br />
              <span className={styles.modalSubnote}>{subnote}</span>
            </>
          )}
        </p>

        {irreversible && (
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
        )}

        <div className={styles.modalActions}>
          <button
            type='button'
            className='primaryBtn'
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </button>

          <button
            type='button'
            className='dangerBtn'
            onClick={onConfirm}
            disabled={pending || !canConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
