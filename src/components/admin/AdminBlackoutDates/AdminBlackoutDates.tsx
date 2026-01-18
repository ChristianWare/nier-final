"use client";

import styles from "./AdminBlackoutDates.module.css";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import { addBlackoutDate } from "../../../../actions/admin/blackouts/addBlackoutDate";
import { removeBlackoutDate } from "../../../../actions/admin/blackouts/removeBlackoutDate";

export type BlackoutItem = {
  id: string;
  ymd: string;
  reason: string | null;
};

export default function AdminBlackoutDates({
  items,
}: {
  items: BlackoutItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [ymd, setYmd] = useState("");
  const [reason, setReason] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<BlackoutItem | null>(null);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => (a.ymd < b.ymd ? -1 : a.ymd > b.ymd ? 1 : 0)),
    [items],
  );

  function openRemoveModal(item: BlackoutItem) {
    setPendingRemove(item);
    setConfirmOpen(true);
  }

  function closeRemoveModal() {
    setConfirmOpen(false);
    setPendingRemove(null);
  }

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData();
    fd.set("ymd", ymd);
    fd.set("reason", reason);

    startTransition(async () => {
      const res = await addBlackoutDate(fd);

      if (!res?.ok) {
        toast.error(res?.error || "Could not save blackout date");
        return;
      }

      toast.success("Blackout date saved");
      setYmd("");
      setReason("");
      router.refresh();
    });
  }

  function onConfirmRemove() {
    if (!pendingRemove) return;

    const fd = new FormData();
    fd.set("id", pendingRemove.id);

    startTransition(async () => {
      const res = await removeBlackoutDate(fd);

      if (!res?.ok) {
        toast.error(res?.error || "Could not remove blackout date");
        return;
      }

      toast.success("Blackout date removed");
      closeRemoveModal();
      router.refresh();
    });
  }

  return (
    <>
      <section className={styles.container} aria-label='Blackout dates'>
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 className='cardTitle h4'>Blackout dates</h2>
            <div className='miniNote'>Users cannot book on these dates</div>
          </div>
        </header>

        <form className={styles.form} onSubmit={onAdd}>
          <input
            className={styles.input}
            type='date'
            value={ymd}
            onChange={(e) => setYmd(e.target.value)}
            required
            aria-label='Blackout date'
          />

          <input
            className={styles.input}
            type='text'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Reason (optional)'
            aria-label='Reason'
          />

          <button
            className={`${styles.btn} ${styles.primary}`}
            type='submit'
            disabled={isPending}
          >
            Add
          </button>
        </form>

        {sorted.length === 0 ? (
          <div className={styles.empty}>
            <div className='miniNote'>No blackout dates yet.</div>
          </div>
        ) : (
          <div className={styles.list}>
            {sorted.map((x) => (
              <div key={x.id} className={styles.row}>
                <div className={styles.left}>
                  <div className={styles.ymd}>{x.ymd}</div>
                  <div className='miniNote'>{x.reason ?? "—"}</div>
                </div>

                <button
                  className={styles.btn}
                  type='button'
                  onClick={() => openRemoveModal(x)}
                  disabled={isPending}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={confirmOpen} onClose={closeRemoveModal}>
        <div className={styles.modalTitle}>Remove blackout date?</div>

        <div className={styles.modalBody}>
          {pendingRemove ? (
            <>
              <div className='miniNote'>
                You are about to remove{" "}
                <span className={styles.modalStrong}>{pendingRemove.ymd}</span>.
              </div>
              <div className='miniNote'>
                Reason:{" "}
                <span className={styles.modalStrong}>
                  {pendingRemove.reason ?? "—"}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div className={styles.modalActions}>
          <button
            type='button'
            className={styles.btn}
            onClick={closeRemoveModal}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            type='button'
            className={`${styles.btn} ${styles.primary}`}
            onClick={onConfirmRemove}
            disabled={isPending || !pendingRemove}
          >
            Yes, remove
          </button>
        </div>
      </Modal>
    </>
  );
}
