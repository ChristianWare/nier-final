"use client";

import styles from "./AdminVehiclesPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { toggleVehicleUnit } from "../../../../actions/admin/vehicleUnits";
import Button from "@/components/shared/Button/Button";

export default function VehicleUnitActionsClient({
  id,
  active,
  editHref,
}: {
  id: string;
  active: boolean;
  editHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function runToggle(nextActive: boolean) {
    startTransition(async () => {
      try {
        await toggleVehicleUnit(id, nextActive);
        toast.success(nextActive ? "Vehicle enabled" : "Vehicle disabled");
        setConfirmOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  }

  function onToggleClick() {
    if (active) {
      setConfirmOpen(true);
      return;
    }
    runToggle(true);
  }

  return (
    <>
      <div className={styles.actions}>
        <Button href={editHref} text='More details' btnType='blackRegSmall' />

        <button
          type='button'
          role='switch'
          aria-checked={active}
          aria-label={active ? "Disable vehicle" : "Enable vehicle"}
          className={`${styles.toggle} ${active ? styles.toggleOn : styles.toggleOff}`}
          onClick={onToggleClick}
          disabled={isPending}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (isPending) return;
          setConfirmOpen(false);
        }}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Disable this vehicle?</div>

          <p className='paragraph'>
            This will <strong>not</strong> delete the vehicle. It will simply
            disable it until you reactivate it.
          </p>

          <div className='miniNote'>This action cannot be undone.</div>

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
              onClick={() => runToggle(false)}
              disabled={isPending}
            >
              {isPending ? "Disabling..." : "Confirm disable"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
