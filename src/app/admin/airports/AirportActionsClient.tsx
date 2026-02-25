"use client";

import styles from "./AdminAirportsPage.module.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { toggleAirport } from "../../../../actions/admin/airports";
import Button from "@/components/shared/Button/Button";

export default function AirportActionsClient({
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
        await toggleAirport(id);
        toast.success(active ? "Airport disabled" : "Airport enabled");
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
      <div className={styles.cardActions}>
        <Button href={editHref} text='More details' btnType='blackRegSmall' />

        <button
          type='button'
          role='switch'
          aria-checked={active}
          aria-label={active ? "Disable airport" : "Enable airport"}
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
          <div className='cardTitle h5'>Disable this airport?</div>

          <p className='paragraph'>
            This will <strong>not</strong> delete the airport. It will simply
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
