"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./BulkSelect.module.css";
import BulkConfirmModal from "@/components/admin/BulkConfirmModal/BulkConfirmModal";
import {
  trashBookings,
  restoreBookings,
  deleteBookingsForever,
} from "../../../../actions/admin/bookingTrash";

type Ctx = {
  selected: Set<string>;
  hidden: Set<string>;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
  clear: () => void;
  hide: (ids: string[]) => void;
};

const BulkSelectContext = createContext<Ctx | null>(null);

function useBulkSelect(): Ctx {
  const ctx = useContext(BulkSelectContext);
  if (!ctx) throw new Error("BulkSelect components must be inside provider");
  return ctx;
}

export function BulkSelectProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Rows removed optimistically after a successful action, so they vanish
  // immediately instead of waiting for the server refresh to land.
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const value = useMemo<Ctx>(
    () => ({
      selected,
      hidden,
      toggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      setMany: (ids, on) =>
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) {
            if (on) next.add(id);
            else next.delete(id);
          }
          return next;
        }),
      clear: () => setSelected(new Set()),
      hide: (ids) =>
        setHidden((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.add(id);
          return next;
        }),
    }),
    [selected, hidden],
  );

  return (
    <BulkSelectContext.Provider value={value}>
      {children}
    </BulkSelectContext.Provider>
  );
}

export function RowCheckbox({ id }: { id: string }) {
  const { selected, toggle, hidden } = useBulkSelect();
  const isHidden = hidden.has(id);
  return (
    <input
      type='checkbox'
      className={`${styles.checkbox} ${isHidden ? styles.rowHidden : ""}`}
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      onClick={(e) => e.stopPropagation()}
      aria-label='Select booking'
    />
  );
}

export function SelectAllCheckbox({ ids: allIds }: { ids: string[] }) {
  const { selected, setMany, hidden } = useBulkSelect();
  const ids = allIds.filter((id) => !hidden.has(id));
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
  return (
    <input
      type='checkbox'
      className={styles.checkbox}
      checked={allOn}
      onChange={() => setMany(ids, !allOn)}
      onClick={(e) => e.stopPropagation()}
      aria-label='Select all bookings on this page'
    />
  );
}

type BulkAction = "trash" | "restore" | "forever";

export function BulkActionBar({ inTrash }: { inTrash: boolean }) {
  const { selected, clear, hide } = useBulkSelect();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const [action, setAction] = useState<BulkAction | null>(null);
  const router = useRouter();
  const n = selected.size;

  if (n === 0 && !action) return null;

  const plural = n === 1 ? "booking" : "bookings";

  async function runAction() {
    if (!action || pending) return;
    const ids = [...selected];
    const current = action;

    setPending(true);
    try {
      const res =
        current === "trash"
          ? await trashBookings(ids)
          : current === "restore"
            ? await restoreBookings(ids)
            : await deleteBookingsForever(ids);

      if (!res.ok) {
        toast.error(res.error ?? "Action failed.");
        return;
      }

      toast.success(
        current === "trash"
          ? `Moved ${res.count ?? n} ${plural} to the Trash.`
          : current === "restore"
            ? `Restored ${res.count ?? n} ${plural}.`
            : `Permanently deleted ${res.count ?? n} ${plural}.`,
      );

      // 1) Optimistic: rows disappear right now.
      hide(ids);
      setAction(null);
      clear();
      // 2) Server truth: re-render the page in its own transition.
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {n > 0 && (
        <div className={styles.bar}>
          <span className={styles.count}>{n} selected</span>
          {inTrash ? (
            <>
              <button
                type='button'
                className={styles.btn}
                disabled={pending}
                onClick={() => setAction("restore")}
              >
                Restore
              </button>
              <button
                type='button'
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={pending}
                onClick={() => setAction("forever")}
              >
                Delete forever
              </button>
            </>
          ) : (
            <button
              type='button'
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={pending}
              onClick={() => setAction("trash")}
            >
              Move to Trash
            </button>
          )}
          <button
            type='button'
            className={styles.btnGhost}
            disabled={pending}
            onClick={clear}
          >
            Clear
          </button>
        </div>
      )}

      <BulkConfirmModal
        open={action === "trash"}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        pending={pending}
        title={`Move ${n} ${plural} to the Trash?`}
        body={
          <>
            They will disappear from every list, calendar, and report, and can
            be restored from the <strong>Trash</strong> tab for 7 days. After
            that, unpaid bookings are permanently deleted; bookings with a
            payment on file are kept.
          </>
        }
        confirmLabel='Move to Trash'
        pendingLabel='Moving...'
      />

      <BulkConfirmModal
        open={action === "restore"}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        pending={pending}
        title={`Restore ${n} ${plural}?`}
        body='They will return to their previous status and reappear in every list, calendar, and report.'
        confirmLabel='Restore'
        pendingLabel='Restoring...'
      />

      <BulkConfirmModal
        open={action === "forever"}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        pending={pending}
        irreversible
        title={`Permanently delete ${n} ${plural}?`}
        body={
          <>
            You are about to permanently delete{" "}
            <strong>
              {n} {plural}
            </strong>{" "}
            and all related records (payment, assignment, status events,
            add-ons).
          </>
        }
        subnote='This can’t be undone.'
        confirmLabel='Confirm delete'
        pendingLabel='Deleting...'
      />
    </>
  );
}
