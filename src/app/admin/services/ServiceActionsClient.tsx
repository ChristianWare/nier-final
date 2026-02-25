"use client";

import styles from "./ServicesPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { toggleService } from "../../../../actions/admin/services";
import Button from "@/components/shared/Button/Button";

export default function ServiceActionsClient({
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

  function runToggle() {
    startTransition(async () => {
      try {
        await toggleService(id);
        toast.success(active ? "Service disabled" : "Service enabled");
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
    runToggle();
  }

  return (
    <>
      <div className={styles.actions}>
        <Button href={editHref} text='More details' btnType='blackRegSmall' />

        <button
          type='button'
          role='switch'
          aria-checked={active}
          aria-label={active ? "Disable service" : "Enable service"}
          className={`${styles.toggle} ${active ? styles.toggleOn : styles.toggleOff}`}
          onClick={onToggleClick}
          disabled={isPending}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Disable this service?</div>

          <p className='paragraph'>
            This will <strong>not</strong> permanently delete the service. It
            will simply disable it until you reactivate it.
          </p>

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
              onClick={runToggle}
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
