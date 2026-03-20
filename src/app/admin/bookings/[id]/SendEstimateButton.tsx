"use client";

// src/app/admin/bookings/[id]/SendEstimateButton.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { sendEstimateEmail } from "../../../../../actions/admin/sendEstimateEmail";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import styles from "./SendEstimateButton.module.css";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Props = {
  bookingId: string;
  customerEmail: string | null;
};

export default function SendEstimateButton({
  bookingId,
  customerEmail,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  function sendWith(email?: string) {
    const formData = new FormData();
    formData.append("bookingId", bookingId);
    if (email) {
      formData.append("overrideEmail", email.trim().toLowerCase());
    }

    startTransition(async () => {
      const result = await sendEstimateEmail(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const target = email
        ? email.trim().toLowerCase()
        : (customerEmail?.toLowerCase() ?? "customer");

      toast.success(`Estimate sent to ${target}`);
      setSent(true);
      setShowModal(false);
      setOverrideEmail("");
      router.refresh();
    });
  }

  function handleSendToClient() {
    sendWith();
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

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/estimate/${bookingId}/download`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate-${bookingId.slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not generate estimate PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className='cardTitle h5' style={{ marginBottom: 12 }}>
        Send Estimate to Customer (optional)
      </div>

      {/* Customer email display */}
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
                ? "✓ Estimate sent"
                : "Email estimate to client"
          }
          disabled={isPending}
          onClick={handleSendToClient}
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

        <Button
          btnType='blueReg'
          text={isDownloading ? "Generating PDF..." : "Download estimate PDF"}
          disabled={isDownloading}
          onClick={handleDownload}
          type='button'
        />
      </div>

      {/* Alternate email modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Send to a different email</div>
          <p className='miniNote'>
            The estimate will be sent to this address instead of
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
              {isPending ? "Sending..." : "Send estimate"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
