"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import styles from "./TrashBanner.module.css";
import Button from "@/components/shared/Button/Button";
import BulkConfirmModal from "@/components/admin/BulkConfirmModal/BulkConfirmModal";
import {
  restoreBookings,
  deleteBookingsForever,
} from "../../../../../../actions/admin/bookingTrash";

const RETENTION_DAYS = 7;

type Props = {
  bookingId: string;
  deletedAtIso: string;
  deletedByLabel: string | null;
  hasPayment: boolean;
  timeZone: string;
};

export default function TrashBanner({
  bookingId,
  deletedAtIso,
  deletedByLabel,
  hasPayment,
  timeZone,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const [modal, setModal] = useState<"restore" | "forever" | null>(null);

  const deletedAt = new Date(deletedAtIso);
  const purgeAt = new Date(
    deletedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const daysLeft = Math.max(
    0,
    Math.ceil((purgeAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  const deletedLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(deletedAt);

  const fate = hasPayment
    ? "It has a payment record, so it will be kept in the Trash indefinitely and never auto-deleted."
    : daysLeft === 0
      ? "It is due to be permanently deleted at the next nightly cleanup."
      : `It will be permanently deleted in ${daysLeft} day${daysLeft === 1 ? "" : "s"} unless restored.`;

  async function runRestore() {
    if (pending) return;
    setPending(true);
    try {
      const res = await restoreBookings([bookingId]);
      if (!res.ok) {
        toast.error(res.error ?? "Restore failed.");
        return;
      }
      toast.success("Booking restored.");
      setModal(null);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  }

  async function runDeleteForever() {
    if (pending) return;
    setPending(true);
    try {
      const res = await deleteBookingsForever([bookingId]);
      if (!res.ok) {
        toast.error(res.error ?? "Permanent delete failed.");
        return;
      }
      toast.success("Booking permanently deleted.");
      setModal(null);
      router.push("/admin/bookings?status=TRASH");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className={styles.banner} role='status'>
        <div className={styles.text}>
          <div className={styles.title}>
            {" "}
            <span className={styles.icon} aria-hidden='true'>
              🗑️
            </span>
            This booking is in the Trash
          </div>
          <div className={styles.meta}>
            Moved to the Trash on {deletedLabel}
            {deletedByLabel ? ` by ${deletedByLabel}` : ""}. <br /> {fate}
          </div>
          <div className={styles.lock}>
            Editing, approvals, payments, driver assignment, and quick actions
            are locked while it&rsquo;s in the Trash. Restore it to make
            changes.
          </div>
        </div>
        <div className={styles.actions}>
          <Button
            text='Restore booking'
            btnType='blackReg'
            onClick={() => setModal("restore")}
            disabled={pending}
          />
          <Button
            text='Delete forever'
            btnType='redReg'
            onClick={() => setModal("forever")}
            disabled={pending}
          />
        </div>
        <Link href='/admin/bookings?status=TRASH' className={styles.backLink}>
          ← Back to Trash
        </Link>
      </div>

      <BulkConfirmModal
        open={modal === "restore"}
        onClose={() => setModal(null)}
        onConfirm={runRestore}
        pending={pending}
        title='Restore this booking?'
        body='It will return to its previous status and reappear in every list, calendar, and report. Editing and actions unlock immediately.'
        confirmLabel='Restore booking'
        pendingLabel='Restoring...'
      />

      <BulkConfirmModal
        open={modal === "forever"}
        onClose={() => setModal(null)}
        onConfirm={runDeleteForever}
        pending={pending}
        irreversible
        title='Permanently delete this booking?'
        body={
          <>
            You are about to permanently delete booking{" "}
            <strong>{bookingId}</strong> and all related records (payment,
            assignment, status events, add-ons).
          </>
        }
        subnote='This can’t be undone.'
        confirmLabel='Confirm delete'
        pendingLabel='Deleting...'
      />
    </>
  );
}
