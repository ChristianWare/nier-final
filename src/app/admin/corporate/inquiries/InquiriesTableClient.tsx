"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateInquiriesPage.module.css";
import Modal from "@/components/shared/Modal/Modal";
import { bulkDeleteInquiries } from "../../../../../actions/admin/bulkDeleteInquiries";

type Inquiry = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  estimatedMonthlyRides: string | null;
  status: string;
  formattedDate: string;
};

function statusBadgeTone(status: string) {
  if (status === "PENDING") return "warn";
  if (status === "CONTACTED") return "accent";
  if (status === "APPROVED") return "good";
  if (status === "DECLINED") return "bad";
  return "neutral";
}

export default function InquiriesTableClient({
  inquiries,
}: {
  inquiries: Inquiry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  const allSelected =
    inquiries.length > 0 && selected.size === inquiries.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(inquiries.map((i) => i.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const res = await bulkDeleteInquiries(Array.from(selected));
      if (res.ok) {
        toast.success(
          `${res.deletedCount} inquir${res.deletedCount === 1 ? "y" : "ies"} deleted.`,
        );
        setSelected(new Set());
        setModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to delete inquiries.");
      }
    });
  }

  const selectedInquiries = inquiries.filter((i) => selected.has(i.id));

  return (
    <>
      {selected.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selected.size} selected</span>
          <button
            type='button'
            className='dangerBtn'
            onClick={() => setModalOpen(true)}
            disabled={isPending}
          >
            Delete {selected.size} Inquir{selected.size === 1 ? "y" : "ies"}
          </button>
          <button
            type='button'
            className='secondaryBtn'
            onClick={() => setSelected(new Set())}
            disabled={isPending}
          >
            Clear Selection
          </button>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={styles.thCheck}>
                  <input
                    type='checkbox'
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label='Select all'
                    className={styles.checkbox}
                  />
                </th>
                <th className={styles.th}>Company</th>
                <th className={styles.th}>Contact</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Est. Monthly Rides</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => {
                const href = `/admin/corporate/inquiries/${inq.id}`;
                const isSelected = selected.has(inq.id);
                return (
                  <tr
                    key={inq.id}
                    className={`${styles.tr} ${isSelected ? styles.trSelected : ""}`}
                  >
                    {/* Checkbox cell — never navigates */}
                    <td className={styles.tdCheck}>
                      <input
                        type='checkbox'
                        checked={isSelected}
                        onChange={() => toggleOne(inq.id)}
                        aria-label={`Select ${inq.companyName}`}
                        className={styles.checkbox}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Company — stretched link lives here only */}
                    <td className={styles.td} style={{ position: "relative" }}>
                      {!isSelected && (
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-label={`Open ${inq.companyName}`}
                        />
                      )}
                      <div className={styles.cellStrong}>
                        <Link href={href} className={styles.rowLink}>
                          {inq.companyName}
                        </Link>
                      </div>
                    </td>

                    <td className={styles.td} style={{ position: "relative" }}>
                      {!isSelected && (
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                      )}
                      {inq.contactName}
                    </td>

                    <td className={styles.td} style={{ position: "relative" }}>
                      {!isSelected && (
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                      )}
                      <div className={styles.cellSub}>{inq.email}</div>
                    </td>

                    <td className={styles.td} style={{ position: "relative" }}>
                      {!isSelected && (
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                      )}
                      {inq.estimatedMonthlyRides || "—"}
                    </td>

                    <td className={styles.td} style={{ position: "relative" }}>
                      {!isSelected && (
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                      )}
                      <span
                        className={`badge badge_${statusBadgeTone(inq.status)}`}
                      >
                        {inq.status}
                      </span>
                    </td>

                    <td className={styles.td} style={{ position: "relative" }}>
                      {!isSelected && (
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden
                          tabIndex={-1}
                        />
                      )}
                      {inq.formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
      >
        <div className={styles.modalContent}>
          <h2 className={`${styles.modalTitle} h5 cardTitle`}>
            Delete {selected.size} Inquir{selected.size === 1 ? "y" : "ies"}?
          </h2>

          <p className={styles.modalBody}>
            The following will be <strong>permanently deleted</strong>. This
            cannot be undone.
          </p>

          <div className={styles.deleteList}>
            {selectedInquiries.map((inq) => (
              <div key={inq.id} className={styles.deleteListItem}>
                <div className={styles.deleteListCompany}>
                  {inq.companyName}
                </div>
                <div className={styles.deleteListMeta}>
                  {inq.contactName}
                  <span className={styles.deleteListSep}>·</span>
                  {inq.email}
                  <span
                    className={`badge badge_${statusBadgeTone(inq.status)}`}
                    style={{ marginLeft: "0.8rem" }}
                  >
                    {inq.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='secondaryBtn'
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='dangerBtn'
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending
                ? "Deleting..."
                : `Yes, Delete ${selected.size === 1 ? "Inquiry" : `${selected.size} Inquiries`}`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
