"use client";

import { useState, useTransition } from "react";
import { pdf } from "@react-pdf/renderer";
import toast from "react-hot-toast";
import InvoicePreview from "@/components/Dashboard/InvoicePreview/InvoicePreview";
import InvoicePDF from "@/lib/invoice/InvoicePDF";
import type { InvoiceData } from "@/lib/invoice/types";
import { sendInvoiceEmail } from "../../../../../actions/admin/sendInvoiceEmail";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import styles from "./InvoiceSection.module.css";

type Props = {
  invoice: InvoiceData;
  bookingId: string;
  customerEmail?: string | null;
  isAdmin?: boolean;
  invoiceSentEvents?: { sentAt: string; recipientEmail: string | null }[];
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function InvoiceSection({
  invoice,
  bookingId,
  customerEmail,
  isAdmin = false,
  invoiceSentEvents = [],
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      let resolvedInvoice = invoice;
      if (invoice.logoUrl) {
        try {
          const imgRes = await fetch(invoice.logoUrl);
          const imgBlob = await imgRes.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imgBlob);
          });
          resolvedInvoice = { ...invoice, logoUrl: base64 };
        } catch {
          resolvedInvoice = { ...invoice, logoUrl: undefined };
        }
      }
      const blob = await pdf(<InvoicePDF invoice={resolvedInvoice} />).toBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Invoice PDF generation error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate invoice",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  function sendWith(email?: string) {
    const fd = new FormData();
    fd.append("bookingId", bookingId);
    if (email) fd.append("overrideEmail", email.trim().toLowerCase());
    startTransition(async () => {
      const result = await sendInvoiceEmail(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const target = email ?? customerEmail ?? "customer";
      toast.success(`Invoice sent to ${target}`);
      setSent(true);
      setShowModal(false);
      setOverrideEmail("");
    });
  }

  function handleModalSend() {
    setOverrideError(null);
    if (!overrideEmail.trim()) {
      setOverrideError("Please enter an email address.");
      return;
    }
    if (!isValidEmail(overrideEmail.trim())) {
      setOverrideError("Please enter a valid email address.");
      return;
    }
    sendWith(overrideEmail.trim());
  }

  return (
    <>
      <InvoicePreview
        invoice={invoice}
        onDownload={handleDownload}
        isDownloading={isDownloading}
      />

      {isAdmin && (
        <div className={styles.container}>
          <div className='cardTitle h5'>Email Invoice to Customer</div>

          {customerEmail && (
            <div className={styles.emailDisplay}>
              <span className={styles.emailLabel}>Customer email:</span>
              <span className={styles.emailValue}>
                {customerEmail.toLowerCase()}
              </span>
            </div>
          )}

          <div className={styles.btnGroup}>
            <Button
              btnType='blackReg'
              text={
                isPending
                  ? "Sending..."
                  : sent
                    ? "✓ Invoice sent"
                    : "Email invoice to client"
              }
              disabled={isPending}
              onClick={() => sendWith()}
              type='button'
            />
            <Button
              btnType='greenReg'
              text='Send to a different email'
              onClick={() => {
                setOverrideEmail("");
                setOverrideError(null);
                setShowModal(true);
              }}
              type='button'
            />
          </div>

          {invoiceSentEvents.length > 0 && (
            <div className={styles.sentHistory}>
              <div className={styles.sentHistoryTitle}>
                Invoice send history
              </div>
              {invoiceSentEvents.map((e, i) => (
                <div key={i} className={styles.sentHistoryRow}>
                  <span className={styles.sentHistoryEmail}>
                    {e.recipientEmail ?? "unknown"}
                  </span>
                  <span className={styles.sentHistoryDate}>
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(e.sentAt))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Send invoice to a different email</div>
          <p className='miniNote'>
            The invoice will be sent to this address instead of
            {customerEmail
              ? ` ${customerEmail.toLowerCase()}`
              : " the customer's email on file"}
            .
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type='email'
              value={overrideEmail}
              onChange={(e) => {
                setOverrideEmail(e.target.value);
                setOverrideError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleModalSend();
              }}
              placeholder='Enter email address...'
              className='input emptySmall'
              autoFocus
              style={{
                borderColor: overrideError ? "rgba(180,0,0,0.6)" : undefined,
              }}
            />
            {overrideError && (
              <p style={{ color: "#c00", fontSize: "1.4rem", margin: 0 }}>
                {overrideError}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type='button'
              className='secondaryBtn'
              onClick={() => setShowModal(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='goodBtnii'
              onClick={handleModalSend}
              disabled={isPending}
            >
              {isPending ? "Sending..." : "Send invoice"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
