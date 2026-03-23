"use client";

import styles from "./AdminIncompleteRides.module.css";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import Modal from "@/components/shared/Modal/Modal";
import { updateBookingStatus } from "../../../../actions/admin/bookings";

export type IncompleteRideItem = {
  id: string;
  status: string;
  pickupAtIso: string;
  durationMinutes: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string | null;
  driverName: string | null;
  totalCents: number;
  currency: string;
  customer: {
    name: string;
    email: string | null;
  };
};

type Props = {
  items: IncompleteRideItem[];
  timeZone: string;
  bookingHrefBase?: string;
};

function formatPickupAt(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function overdueLabel(pickupAtIso: string, durationMinutes: number | null) {
  const pickupAt = new Date(pickupAtIso);
  const duration = durationMinutes ?? 60;
  const expectedEnd = new Date(pickupAt.getTime() + duration * 60 * 1000);
  const overdueMs = Date.now() - expectedEnd.getTime();
  const overdueHours = overdueMs / (1000 * 60 * 60);

  if (overdueHours < 1) {
    const mins = Math.round(overdueMs / (1000 * 60));
    return `${mins}m overdue`;
  }
  if (overdueHours < 24) {
    return `${Math.round(overdueHours)}h overdue`;
  }
  const days = Math.round(overdueHours / 24);
  return `${days}d overdue`;
}

function prettyStatus(s: string) {
  const parts = String(s).split("_").filter(Boolean);
  if (!parts.length) return String(s);
  return parts
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(s: string): "neutral" | "warning" | "danger" {
  if (s === "IN_PROGRESS") return "warning";
  if (s === "EN_ROUTE" || s === "ARRIVED") return "warning";
  return "neutral";
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

export default function AdminIncompleteRides({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(
    () => items.filter((item) => !dismissed.has(item.id)),
    [items, dismissed],
  );

  const confirmingItem = confirmId
    ? (visible.find((i) => i.id === confirmId) ?? null)
    : null;

  function handleMarkComplete(id: string) {
    setConfirmId(id);
  }

  function handleConfirm() {
    if (!confirmId) return;
    const id = confirmId;
    // Optimistic: remove from list immediately
    setDismissed((prev) => new Set([...prev, id]));
    setConfirmId(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.append("bookingId", id);
      fd.append("status", "COMPLETED");
      await updateBookingStatus(fd);
    });
  }

  if (visible.length === 0) return null;

  return (
    <>
      <section
        className={styles.container}
        aria-label='Incomplete rides needing attention'
      >
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h2 className={`cardTitle h4 ${styles.urgentHeading}`}>
              Incomplete rides — not marked complete ({visible.length})
            </h2>

            <p className={styles.earningsNote}>
              <strong>
                Driver earnings are only recorded once a ride is marked
                complete.
              </strong>{" "}
              These rides are past their expected end time but are still in an
              active status. Mark each one complete as soon as the trip has
              finished so earnings are correctly recorded in payroll reports.
            </p>
          </div>
        </header>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Overdue</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Service</th>
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {visible.map((b) => {
                const pickupLabel = formatPickupAt(b.pickupAtIso, timeZone);
                const overdue = overdueLabel(b.pickupAtIso, b.durationMinutes);
                const tone = statusTone(b.status);
                const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;
                const route = `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`;

                return (
                  <tr key={b.id} className={styles.tr}>
                    <td className={styles.td} data-label='Status'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span
                          className={`${styles.badge} ${styles[`badge_${tone}`]}`}
                        >
                          {prettyStatus(b.status)}
                        </span>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Pickup'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
                        <Link href={href} className={styles.rowLink}>
                          {pickupLabel}
                        </Link>
                        <div className={styles.cellSub}>{route}</div>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Overdue'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span className={styles.overduePill}>{overdue}</span>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Client'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div
                        className={`${styles.cellStack} ${styles.cellInner}`}
                      >
                        <span className={styles.rowLink}>
                          {b.customer.name}
                        </span>
                        {b.customer.email && (
                          <span className={styles.cellSub}>
                            {b.customer.email}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={styles.td} data-label='Driver'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span className={styles.rowLink}>
                          {b.driverName ?? (
                            <span className={styles.unassigned}>
                              Unassigned
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Service'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span className={styles.rowLink}>{b.serviceName}</span>
                        {b.vehicleName && (
                          <div className={styles.cellSub}>{b.vehicleName}</div>
                        )}
                      </div>
                    </td>

                    <td
                      className={`${styles.td} ${styles.tdRight}`}
                      data-label='Action'
                    >
                      <div className={styles.actionGroup}>
                        <Link href={href} className='primaryBtn'>
                          Review
                        </Link>
                        <button
                          type='button'
                          className='dangerBtn'
                          onClick={() => handleMarkComplete(b.id)}
                          disabled={isPending}
                        >
                          Mark complete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={confirmId !== null} onClose={() => setConfirmId(null)}>
        <div className={styles.modalContent}>
          <h3 className={` cardTitle h4`}>Mark this ride as complete?</h3>

          {confirmingItem && (
            <div className={styles.modalDetails}>
              <div className={styles.modalDetailRow}>
                <span className={styles.modalDetailLabel}>Client</span>
                <span className={styles.modalDetailValue}>
                  {confirmingItem.customer.name}
                </span>
              </div>
              <div className={styles.modalDetailRow}>
                <span className={styles.modalDetailLabel}>Pickup</span>
                <span className={styles.modalDetailValue}>
                  {formatPickupAt(confirmingItem.pickupAtIso, timeZone)}
                </span>
              </div>
              <div className={styles.modalDetailRow}>
                <span className={styles.modalDetailLabel}>Route</span>
                <span className={styles.modalDetailValue}>
                  {shortAddress(confirmingItem.pickupAddress)} →{" "}
                  {shortAddress(confirmingItem.dropoffAddress)}
                </span>
              </div>
              {confirmingItem.driverName && (
                <div className={styles.modalDetailRow}>
                  <span className={styles.modalDetailLabel}>Driver</span>
                  <span className={styles.modalDetailValue}>
                    {confirmingItem.driverName}
                  </span>
                </div>
              )}
              <div className={styles.modalDetailRow}>
                <span className={styles.modalDetailLabel}>Overdue by</span>
                <span
                  className={`${styles.modalDetailValue} ${styles.overdueValue}`}
                >
                  {overdueLabel(
                    confirmingItem.pickupAtIso,
                    confirmingItem.durationMinutes,
                  )}
                </span>
              </div>
            </div>
          )}

          <p className={styles.modalNote}>
            Marking this complete will record the ride in driver earnings and
            payroll. If a corporate account is linked, an invoice will be
            generated automatically.
          </p>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setConfirmId(null)}
            >
              Cancel
            </button>
            <button
              type='button'
              className='goodBtn'
              onClick={handleConfirm}
              disabled={isPending}
            >
              Yes, mark complete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
