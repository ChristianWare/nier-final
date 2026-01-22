"use client";

import styles from "./UserDetailPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { deleteUser } from "../../../../../actions/admin/users/users/deleteUser";

export default function DeleteUserDangerZoneClient({
  userId,
  userName,
  userEmail,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
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
      const res = await deleteUser(userId);

      if (!res?.ok) {
        toast.error(res?.error ?? "Failed to delete user.");
        return;
      }

      toast.success("User deleted.");
      setConfirmOpen(false);
      router.push("/admin/users");
      router.refresh();
    });
  }

  const displayName = userName?.trim() || userEmail;

  return (
    <div className={`${styles.card} ${styles.dangerCard}`}>
      <div className={styles.dangerTop}>
        <div className='cardTitle h4'>Danger zone</div>
        <p className='subheading'>
          Permanently delete this user and all related records (accounts,
          sessions, notification settings).{" "}
          <strong>This can&apos;t be undone.</strong>
        </p>
        <p className='miniNote'>
          Note: Users with existing bookings or driver assignments cannot be
          deleted. You must first reassign or delete their bookings/assignments.
        </p>
      </div>

      <div className={styles.dangerActions}>
        <div className={styles.btnContainer}>
          <button type='button' className='dangerBtn' onClick={open}>
            Delete user
          </button>
        </div>
        <div className='emptySmall colorRed fw700 uppercase'>
          This is permanent. There is no recovery after deletion.
        </div>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Delete this user?</div>

          <p className='paragraph'>
            You are about to permanently delete user{" "}
            <strong>{displayName}</strong>.
            <br />
            <span className={styles.modalSubnote}>
              This can&apos;t be undone.
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
    </div>
  );
}
