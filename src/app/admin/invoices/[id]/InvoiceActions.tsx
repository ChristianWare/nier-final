"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import styles from "./InvoiceDetail.module.css";
import {
  adminSendInvoice,
  adminVoidInvoice,
  adminMarkInvoicePaid,
  adminDeleteInvoice,
} from "../../../../../actions/admin/invoices/invoiceActions";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Props = {
  invoiceId: string;
  status: string;
  customerEmail: string | null;
  payPath: string;
  balanceDueCents: number;
  receiptUrl: string | null;
};

export default function InvoiceActions({
  invoiceId,
  status,
  customerEmail,
  payPath,
  balanceDueCents,
  receiptUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showSendModal, setShowSendModal] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidNote, setPaidNote] = useState("");

  const isPaid = status === "PAID" || balanceDueCents <= 0;
  const isVoid = status === "VOID";

  function copyLink() {
    const url = `${window.location.origin}${payPath}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Pay link copied"),
      () => toast.error("Couldn't copy — copy it manually"),
    );
  }

  function send(email?: string) {
    startTransition(async () => {
      const res = await adminSendInvoice({
        invoiceId,
        overrideEmail: email ?? null,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Invoice sent to ${res.recipient}`);
      setShowSendModal(false);
      setOverrideEmail("");
      router.refresh();
    });
  }

  function handleSendDefault() {
    if (!customerEmail) {
      setShowSendModal(true);
      return;
    }
    send();
  }

  function handleModalSend() {
    setOverrideError(null);
    const email = overrideEmail.trim();
    if (!email || !isValidEmail(email)) {
      setOverrideError("Enter a valid email address.");
      return;
    }
    send(email);
  }

  function markPaid() {
    startTransition(async () => {
      const res = await adminMarkInvoicePaid({
        invoiceId,
        note: paidNote.trim() || null,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Invoice marked paid");
      setShowPaidModal(false);
      setPaidNote("");
      router.refresh();
    });
  }

  function voidInvoice() {
    if (
      !window.confirm(
        "Void this invoice? The customer will no longer be able to pay it. This can't be undone.",
      )
    )
      return;
    startTransition(async () => {
      const res = await adminVoidInvoice({ invoiceId });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Invoice voided");
      router.refresh();
    });
  }

  function deleteDraft() {
    if (!window.confirm("Delete this draft invoice? This can't be undone."))
      return;
    startTransition(async () => {
      const res = await adminDeleteInvoice({ invoiceId });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Draft deleted");
      router.push("/admin/invoices");
    });
  }

  // ── Voided ──
  if (isVoid) {
    return (
      <div className={styles.actionsCol}>
        <div className={styles.voidBanner}>This invoice was voided.</div>
        <button
          type="button"
          className={styles.ghostBtn}
          onClick={copyLink}
          disabled
        >
          Pay link disabled
        </button>
      </div>
    );
  }

  // ── Paid ──
  if (isPaid) {
    return (
      <div className={styles.actionsCol}>
        <div className={styles.paidBanner}>✓ Paid in full</div>
        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ghostBtn}
          >
            View Stripe receipt →
          </a>
        )}
        <button type="button" className={styles.ghostBtn} onClick={copyLink}>
          Copy pay link
        </button>
      </div>
    );
  }

  // ── Unpaid (draft / sent / partially paid) ──
  return (
    <div className={styles.actionsCol}>
      {customerEmail && (
        <div className={styles.emailChip}>
          Sending to <strong>{customerEmail.toLowerCase()}</strong>
        </div>
      )}

      <Button
        btnType="greenReg"
        text={
          isPending
            ? "Working…"
            : status === "DRAFT"
              ? "Send invoice to customer"
              : "Resend invoice"
        }
        onClick={handleSendDefault}
        disabled={isPending}
        type="button"
        email
      />

      <button
        type="button"
        className={styles.ghostBtn}
        onClick={() => setShowSendModal(true)}
        disabled={isPending}
      >
        Send to a different email
      </button>

      <button type="button" className={styles.ghostBtn} onClick={copyLink}>
        Copy pay link
      </button>

      <div className={styles.divider} />

      <button
        type="button"
        className={styles.ghostBtn}
        onClick={() => setShowPaidModal(true)}
        disabled={isPending}
      >
        Mark as paid (offline)
      </button>

      <button
        type="button"
        className={styles.dangerBtn}
        onClick={voidInvoice}
        disabled={isPending}
      >
        Void invoice
      </button>

      {status === "DRAFT" && (
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={deleteDraft}
          disabled={isPending}
        >
          Delete draft
        </button>
      )}

      {/* Send-to-different-email modal */}
      <Modal isOpen={showSendModal} onClose={() => setShowSendModal(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className="cardTitle h5">Send invoice</div>
          <p className="miniNote">
            Enter the email address to send this invoice to.
          </p>
          <input
            type="email"
            value={overrideEmail}
            onChange={(e) => {
              setOverrideEmail(e.target.value);
              setOverrideError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleModalSend();
            }}
            placeholder="name@example.com"
            className="input emptySmall"
            autoFocus
          />
          {overrideError && (
            <p style={{ color: "#c00", fontSize: "1.4rem", margin: 0 }}>
              {overrideError}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="secondaryBtn"
              onClick={() => setShowSendModal(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="goodBtnii"
              onClick={handleModalSend}
              disabled={isPending}
            >
              {isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Mark-paid modal */}
      <Modal isOpen={showPaidModal} onClose={() => setShowPaidModal(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className="cardTitle h5">Mark as paid</div>
          <p className="miniNote">
            Record an offline payment (cash, check, Zelle, etc.). This marks the
            invoice paid but does <strong>not</strong> charge a card or email a
            receipt.
          </p>
          <input
            type="text"
            value={paidNote}
            onChange={(e) => setPaidNote(e.target.value)}
            placeholder="Note (optional) — e.g. Check #1042"
            className="input emptySmall"
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="secondaryBtn"
              onClick={() => setShowPaidModal(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="goodBtnii"
              onClick={markPaid}
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Mark paid"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}