"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { deleteVehicleCategory } from "../../../../../actions/admin/deleteVehicleCategory";
import styles from "./EditVehicleCategoryPage.module.css";

interface Props {
  categoryId: string;
  categoryName: string;
  bookingCount: number;
  unitCount: number;
}

export default function DeleteVehicleCategoryClient({
  categoryId,
  categoryName,
  bookingCount,
  unitCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const hasBookings = bookingCount > 0;
  const confirmMatch = confirmText.trim() === "DELETE";

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteVehicleCategory(categoryId);
      if (res.ok) {
        toast.success("Vehicle category deleted.");
        router.push("/admin/vehicle-categories");
      } else {
        toast.error(res.error ?? "Failed to delete category.");
        setModalOpen(false);
      }
    });
  }

  return (
    <>
      <div className={styles.dangerZone}>
        <div className={styles.dangerTop}>
          <p className={styles.dangerDesc}>
            Permanently delete this vehicle category. This action cannot be
            undone.
          </p>

          {(hasBookings || unitCount > 0) && (
            <div className={styles.dangerImpactBox}>
              <strong>Before you can delete this category:</strong>
              <ul className={styles.impactList}>
                {hasBookings && (
                  <li>
                    {bookingCount} booking{bookingCount !== 1 ? "s" : ""} must
                    be reassigned or deleted first.
                  </li>
                )}
                {unitCount > 0 && (
                  <li>
                    {unitCount} fleet unit{unitCount !== 1 ? "s" : ""} will also
                    be removed.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <button
          type='button'
          className='dangerBtn'
          style={{ width: "fit-content" }}
          onClick={() => setModalOpen(true)}
          disabled={hasBookings}
        >
          Delete Category
        </button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
      >
        <div className={styles.modalContent}>
          <h2 className={`${styles.modalTitle} cardTitle h5`}>
            Delete &ldquo;{categoryName}&rdquo;?
          </h2>

          <p className={styles.modalBody}>
            This will <strong>permanently delete</strong> the{" "}
            <strong>{categoryName}</strong> vehicle category
            {unitCount > 0
              ? ` and its ${unitCount} fleet unit${unitCount !== 1 ? "s" : ""}`
              : ""}
            . This cannot be undone.
          </p>

          <div className={styles.confirmBlock}>
            <label className={styles.confirmLabel}>
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              type='text'
              className='input'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='DELETE'
              disabled={isPending}
              autoComplete='off'
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='secondaryBtn'
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
              disabled={!confirmMatch || isPending}
            >
              {isPending ? "Deleting..." : "Yes, Delete Category"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
