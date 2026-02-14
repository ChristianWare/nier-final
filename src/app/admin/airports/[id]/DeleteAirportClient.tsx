/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./EditAirportPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";

export default function DeleteAirportClient({
  airportId,
  airportName,
  onDelete,
}: {
  airportId: string;
  airportName: string;
  onDelete: () => Promise<{ ok?: boolean; error?: string }>;
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
      const res = await onDelete();

      if (!res?.ok) {
        toast.error(res?.error ?? "Failed to delete airport.");
        return;
      }

      toast.success("Airport deleted.");
      setConfirmOpen(false);
      router.push("/admin/airports");
      router.refresh();
    });
  }

  return (
    <>
      <div className={`${styles.section} ${styles.dangerSection}`}>
        <div className={styles.sectionHeader}>
          <h2 className='h4'>Danger Zone</h2>
          <p className='miniNote'>Irreversible actions for this airport</p>
        </div>
        <div className={styles.dangerCard}>
          <div className={styles.dangerTop}>
            <div className='emptyTitle'>Delete Airport</div>
            <p className='miniNote'>
              Permanently delete <strong>{airportName}</strong> and remove it
              from all service dropdowns.{" "}
              <strong>This can&apos;t be undone.</strong>
            </p>
          </div>
          <div className={styles.btnContainer}>
            <button type='button' className='dangerBtn' onClick={open}>
              Delete airport
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (isPending) return;
          setConfirmOpen(false);
        }}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Delete this airport?</div>

          <p className='paragraph'>
            You are about to permanently delete <strong>{airportName}</strong>.
            <br />
            <span className={styles.modalSubnote}>
              This will remove it from admin lists and all service type
              dropdowns. This can&apos;t be undone.
            </span>
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
    </>
  );
}
