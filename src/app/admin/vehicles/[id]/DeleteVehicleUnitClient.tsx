"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { deleteVehicleUnit } from "../../../../../actions/admin/deleteVehicleUnit";
import styles from "./VehicleUnitDetailPage.module.css";

interface Props {
  unitId: string;
  unitName: string;
  assignmentCount: number;
}

export default function DeleteVehicleUnitClient({
  unitId,
  unitName,
  assignmentCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const hasAssignments = assignmentCount > 0;
  const confirmMatch = confirmText.trim() === "DELETE";

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteVehicleUnit(unitId);
      if (res.ok) {
        toast.success("Vehicle unit deleted.");
        router.push("/admin/vehicles");
      } else {
        toast.error(res.error ?? "Failed to delete vehicle unit.");
        setModalOpen(false);
      }
    });
  }

  return (
    <>
      <div className={styles.dangerZone}>
        <div className={styles.dangerTop}>
          <h2 className='cardTitle h4' style={{ color: "var(--darkRed, #dc2626)" }}>
            Danger Zone
          </h2>
          <p className={styles.dangerDesc}>
            Permanently delete this vehicle unit. This action cannot be undone.
          </p>

          {hasAssignments && (
            <div className={styles.dangerImpactBox}>
              <strong>Before you can delete this vehicle:</strong>
              <ul className={styles.impactList}>
                <li>
                  {assignmentCount} assignment{assignmentCount !== 1 ? "s" : ""}{" "}
                  must be reassigned or removed first.
                </li>
              </ul>
            </div>
          )}
        </div>

        <button
          type='button'
          className='dangerBtn'
          style={{ width: "fit-content" }}
          onClick={() => setModalOpen(true)}
          disabled={hasAssignments}
        >
          Delete Vehicle
        </button>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
      >
        <div className={styles.modalContent}>
          <h2 className={`${styles.modalTitle} cardTitle h5`}>
            Delete &ldquo;{unitName}&rdquo;?
          </h2>

          <p className={styles.modalBody}>
            This will <strong>permanently delete</strong> the vehicle unit{" "}
            <strong>{unitName}</strong>. This cannot be undone.
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
              {isPending ? "Deleting..." : "Yes, Delete Vehicle"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
