"use client";

// src/app/admin/bookings/[id]/SendBalanceReminderButton.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { sendBalanceReminderEmail } from "../../../../../actions/admin/sendBalanceReminderEmail";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import styles from "./SendBalanceReminderButton.module.css";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Props = {
  bookingId: string;
  customerEmail: string | null;
  outstandingCents: number;
  totalCents: number;
  currency: string;
  pickupAtIso: string;
  timeZone: string;
  reminderSentEvents?: { sentAt: string; recipientEmail: string | null }[];
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function SendBalanceReminderButton({
  bookingId,
  customerEmail,
  outstandingCents,
  totalCents,
  currency,
  pickupAtIso,
  timeZone,
  reminderSentEvents = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const lastSentEvent = reminderSentEvents[0] ?? null;

  const formattedPickup = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(pickupAtIso));

  function sendWith(email?: string) {
    const formData = new FormData();
    formData.append("bookingId", bookingId);
    if (email) {
      formData.append("overrideEmail", email.trim().toLowerCase());
    }

    startTransition(async () => {
      const result = await sendBalanceReminderEmail(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const target = email
        ? email.trim().toLowerCase()
        : (customerEmail?.toLowerCase() ?? "customer");

      toast.success(`Balance reminder sent to ${target}`);
      setJustSent(true);
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

  return (
    <div className={styles.container}>
      <div className={styles.amountBanner}>
        <span className={styles.amountLabel}>Outstanding balance</span>
        <span className={styles.amountValue}>
          {formatMoney(outstandingCents, currency)}
        </span>
        <span className={styles.amountOf}>
          of {formatMoney(totalCents, currency)} total
        </span>
      </div>

      {customerEmail && (
        <div className={styles.emailDisplay}>
          <span className={styles.emailLabel}>Customer email:</span>
          <span className={styles.emailValue}>
            {customerEmail.toLowerCase()}
          </span>
        </div>
      )}

      {lastSentEvent && (
        <div className={styles.lastSentBanner}>
          <span className={styles.lastSentIcon}>📨</span>
          <span className={styles.lastSentText}>
            Last reminder sent{" "}
            <strong>{formatEventDate(lastSentEvent.sentAt)}</strong>
            {lastSentEvent.recipientEmail
              ? ` → ${lastSentEvent.recipientEmail}`
              : ""}
          </span>
        </div>
      )}

      <div className={styles.btnGroup}>
        <Button
          btnType='blackReg'
          text={
            isPending
              ? "Sending..."
              : justSent
                ? "✓ Reminder sent"
                : customerEmail
                  ? "Send reminder to client"
                  : "No email on file"
          }
          disabled={isPending || !customerEmail}
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
          disabled={isPending}
        />
      </div>

      <p className={styles.pickupNote}>
        Pickup scheduled for <strong>{formattedPickup}</strong>. The reminder
        email will include the outstanding amount and a link to complete
        payment.
      </p>

      {reminderSentEvents.length > 0 && (
        <div className={styles.sentHistory}>
          <div className={styles.sentHistoryTitle}>Reminder history</div>
          {reminderSentEvents.map((e, i) => (
            <div key={i} className={styles.sentHistoryRow}>
              <span className={styles.sentHistoryEmail}>
                {e.recipientEmail ?? "unknown"}
              </span>
              <span className={styles.sentHistoryDate}>
                {formatEventDate(e.sentAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Alternate email modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Send reminder to a different email</div>
          <p className='miniNote'>
            The balance reminder will be sent to this address instead of
            {customerEmail
              ? ` ${customerEmail.toLowerCase()}`
              : " the customer's email on file"}
            . The outstanding amount of{" "}
            <strong>{formatMoney(outstandingCents, currency)}</strong> will be
            included.
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
              {isPending ? "Sending..." : "Send reminder"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
