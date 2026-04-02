"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveDepositSettings } from "../../../../actions/admin/saveDepositSettings";
import styles from "./DepositSetupClient.module.css";

const DEPOSIT_OPTIONS = [10, 20, 30, 50, 75, 100] as const;

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(ymd: string) {
  try {
    // Parse YYYY-MM-DD as local date to avoid timezone shifts
    const [y, m, d] = ymd.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(y, m - 1, d));
  } catch {
    return ymd;
  }
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

type Props = {
  bookingId: string;
  totalCents: number;
  currency: string;
  isPaid: boolean;
  initialDepositMode: boolean;
  initialDepositPercent: number | null;
  initialDepositDueDate: string | null; // "YYYY-MM-DD"
  initialBalanceDueDate: string | null;
};

export default function DepositSetupClient({
  bookingId,
  totalCents,
  currency,
  isPaid,
  initialDepositMode,
  initialDepositPercent,
  initialDepositDueDate,
  initialBalanceDueDate,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [enabled, setEnabled] = useState(initialDepositMode);
  const [percent, setPercent] = useState<number>(initialDepositPercent ?? 50);
  const [depositDue, setDepositDue] = useState(
    initialDepositDueDate ?? daysFromNow(3),
  );
  const [balanceDue, setBalanceDue] = useState(
    initialBalanceDueDate ?? daysFromNow(14),
  );

  // ── Read-only view when the booking is already paid ──────────────────────
  if (isPaid) {
    // If no deposit was configured, nothing to show
    if (!initialDepositMode || !initialDepositPercent) return null;

    const paidDepositCents = Math.round(
      (totalCents * initialDepositPercent) / 100,
    );
    const paidBalanceCents = totalCents - paidDepositCents;
    const is100 = initialDepositPercent === 100;

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className='cardTitle h5' style={{ margin: 0 }}>
            Deposit
          </div>
          <span className='badge badge_good' style={{ fontSize: "1.2rem" }}>
            {initialDepositPercent}% deposit
          </span>
        </div>

        <div className={styles.amountPreview}>
          <div className={styles.amountRow}>
            <span className='emptyTitle'>
              {is100 ? "Full payment" : "Deposit charged"}
            </span>
            <span className={styles.amountValue}>
              {formatMoney(paidDepositCents, currency)}
            </span>
          </div>
          {!is100 && (
            <div className={styles.amountRow}>
              <span className='emptyTitle'>Balance</span>
              <span className={styles.amountValue}>
                {formatMoney(paidBalanceCents, currency)}
              </span>
            </div>
          )}
          <div className={`${styles.amountRow} ${styles.amountRowTotal}`}>
            <span className='emptyTitle'>Total</span>
            <span className={styles.amountValueMuted}>
              {formatMoney(totalCents, currency)}
            </span>
          </div>
        </div>

        {(initialDepositDueDate || initialBalanceDueDate) && (
          <div className={styles.dateFields} style={{ marginTop: "1rem" }}>
            {initialDepositDueDate && (
              <div className={styles.field}>
                <span className='emptyTitle'>
                  {is100 ? "Payment due by" : "Deposit due by"}
                </span>
                <p className='subheading' style={{ margin: 0 }}>
                  {formatDate(initialDepositDueDate)}
                </p>
              </div>
            )}
            {!is100 && initialBalanceDueDate && (
              <div className={styles.field}>
                <span className='emptyTitle'>Balance due by</span>
                <p className='subheading' style={{ margin: 0 }}>
                  {formatDate(initialBalanceDueDate)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Editable view when not yet paid ──────────────────────────────────────
  const depositCents = Math.round((totalCents * percent) / 100);
  const balanceCents = totalCents - depositCents;
  const is100 = percent === 100;

  function handleSave() {
    const fd = new FormData();
    fd.append("bookingId", bookingId);
    fd.append("depositMode", String(enabled));
    if (enabled) {
      fd.append("depositPercent", String(percent));
      fd.append("depositDueDate", depositDue);
      if (!is100) fd.append("balanceDueDate", balanceDue);
    }

    startTransition(async () => {
      const result = await saveDepositSettings(fd);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        enabled ? "Deposit settings saved." : "Deposit mode disabled.",
      );
      router.refresh();
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className='cardTitle h5' style={{ margin: 0 }}>
          Deposit
        </div>
        <label className={styles.toggle}>
          <input
            type='checkbox'
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className={styles.toggleInput}
          />
          <span className={styles.toggleSlider} />
          <span className={styles.toggleLabel}>{enabled ? "On" : "Off"}</span>
        </label>
      </div>

      {!enabled && (
        <p className='miniNote' style={{ margin: 0 }}>
          Enable to split payment into a deposit + balance. The customer can
          choose to pay the deposit or pay in full when they receive the link.
        </p>
      )}

      {enabled && (
        <div className={styles.form}>
          {/* Percent selector */}
          <div className={styles.field}>
            <label className='emptyTitle'>Deposit percentage</label>
            <div className={styles.percentOptions}>
              {DEPOSIT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type='button'
                  className={`${styles.percentBtn} ${percent === opt ? styles.percentBtnActive : ""}`}
                  onClick={() => setPercent(opt)}
                >
                  {opt}%
                </button>
              ))}
            </div>
          </div>

          {/* Live amount preview */}
          <div className={styles.amountPreview}>
            <div className={styles.amountRow}>
              <span className='emptyTitle'>
                {is100 ? "Full payment" : "Deposit now"}
              </span>
              <span className={styles.amountValue}>
                {formatMoney(depositCents, currency)}
              </span>
            </div>
            {!is100 && (
              <div className={styles.amountRow}>
                <span className='emptyTitle'>Balance later</span>
                <span className={styles.amountValue}>
                  {formatMoney(balanceCents, currency)}
                </span>
              </div>
            )}
            <div className={`${styles.amountRow} ${styles.amountRowTotal}`}>
              <span className='emptyTitle'>Total</span>
              <span className={styles.amountValueMuted}>
                {formatMoney(totalCents, currency)}
              </span>
            </div>
          </div>

          {/* Due dates */}
          <div className={styles.dateFields}>
            <div className={styles.field}>
              <label className='emptyTitle' htmlFor={`dep-due-${bookingId}`}>
                {is100 ? "Payment due by" : "Deposit due by"}
              </label>
              <input
                id={`dep-due-${bookingId}`}
                type='date'
                value={depositDue}
                onChange={(e) => setDepositDue(e.target.value)}
                className='input emptySmall'
              />
            </div>
            {!is100 && (
              <div className={styles.field}>
                <label className='emptyTitle' htmlFor={`bal-due-${bookingId}`}>
                  Balance due by
                </label>
                <input
                  id={`bal-due-${bookingId}`}
                  type='date'
                  value={balanceDue}
                  onChange={(e) => setBalanceDue(e.target.value)}
                  className='input emptySmall'
                />
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type='button'
        className='goodBtnii'
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending
          ? "Saving..."
          : enabled
            ? "Save deposit settings"
            : "Disable deposit"}
      </button>
    </div>
  );
}
