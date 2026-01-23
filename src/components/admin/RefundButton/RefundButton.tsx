"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { issueRefund } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import styles from "./RefundButton.module.css";

function formatMoney(cents: number, currency = "USD") {
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

type Props = {
  bookingId: string;
  totalCents: number;
  amountPaidCents: number;
  amountRefundedCents: number;
  currency: string;
  stripePaymentIntentId: string | null;
};

export default function RefundButton({
  bookingId,
  totalCents,
  amountPaidCents,
  amountRefundedCents,
  currency,
  stripePaymentIntentId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refundAmount, setRefundAmount] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Calculate net paid (paid minus already refunded)
  const netPaidCents = amountPaidCents - amountRefundedCents;

  // Calculate refund due (overpayment) - if price was lowered after payment
  const refundDueCents = Math.max(0, netPaidCents - totalCents);
  const hasRefundDue = refundDueCents > 0;

  // Check if payment has been received
  const hasPayment = amountPaidCents > 0;

  // Check if there's anything left to refund
  const hasRefundableAmount = netPaidCents > 0;

  // Parse the refund amount input
  const parsedAmountCents = Math.round(
    parseFloat(refundAmount.replace(/[$,]/g, "") || "0") * 100,
  );

  // Validation
  const isValidAmount =
    parsedAmountCents > 0 && parsedAmountCents <= netPaidCents;

  // Calculate percentage amounts
  const percentageAmounts = [
    { label: "10%", cents: Math.round(netPaidCents * 0.1) },
    { label: "20%", cents: Math.round(netPaidCents * 0.2) },
    { label: "50%", cents: Math.round(netPaidCents * 0.5) },
    { label: "100%", cents: netPaidCents },
  ];

  function setAmountFromCents(cents: number) {
    setRefundAmount((cents / 100).toFixed(2));
  }

  async function handleRefund() {
    if (!isValidAmount) {
      toast.error("Please enter a valid refund amount.");
      return;
    }

    if (!stripePaymentIntentId) {
      toast.error(
        "No Stripe payment intent found. Cannot process refund through Stripe.",
      );
      return;
    }

    const fd = new FormData();
    fd.set("bookingId", bookingId);
    fd.set("amountCents", String(parsedAmountCents));

    startTransition(async () => {
      const result = await issueRefund(fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Refund of ${formatMoney(parsedAmountCents, currency)} processed successfully.`,
        );
        setRefundAmount("");
        setShowConfirm(false);
        router.refresh();
      }
    });
  }

  // If no payment has been received, show disabled state
  if (!hasPayment) {
    return (
      <div className={styles.container}>
        <div className={styles.disabledState}>
          <div className={styles.disabledMessage}>
            <span className={styles.disabledIcon}>🔒</span>
            <span>Refunds are available after payment has been received.</span>
          </div>
        </div>
      </div>
    );
  }

  // If everything has already been refunded
  if (!hasRefundableAmount) {
    return (
      <div className={styles.container}>
        <div className={styles.fullyRefundedState}>
          <span className={styles.checkIcon}>✓</span>
          <span>
            Fully refunded ({formatMoney(amountRefundedCents, currency)})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Refund Due Alert - when customer overpaid */}
      {hasRefundDue && (
        <div className={styles.refundDueAlert}>
          <div className={styles.refundDueContent}>
            <strong>💰 Refund Due:</strong>{" "}
            {formatMoney(refundDueCents, currency)}
            <span className={styles.refundDetail}>
              Customer paid {formatMoney(amountPaidCents, currency)}, but
              current total is {formatMoney(totalCents, currency)}
            </span>
          </div>
          <button
            type='button'
            className={styles.applyRefundDueBtn}
            onClick={() => setAmountFromCents(refundDueCents)}
          >
            Apply
          </button>
        </div>
      )}

      {/* Already Refunded Info */}
      {amountRefundedCents > 0 && (
        <div className={styles.refundedInfo}>
          <span>
            Previously refunded: {formatMoney(amountRefundedCents, currency)}
          </span>
          <span className={styles.remainingInfo}>
            Remaining refundable: {formatMoney(netPaidCents, currency)}
          </span>
        </div>
      )}

      {/* Refund Amount Input - Always visible when payment exists */}
      <div className={styles.refundForm}>
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>Refund Amount</label>
          <div className={styles.inputWrapper}>
            <span className={styles.currencySymbol}>$</span>
            <input
              type='text'
              value={refundAmount}
              onChange={(e) => {
                // Allow only numbers and decimal
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setRefundAmount(val);
              }}
              placeholder='0.00'
              className={styles.input}
              disabled={isPending}
            />
          </div>
          <span className={styles.maxNote}>
            Max refundable: {formatMoney(netPaidCents, currency)}
          </span>
        </div>

        {/* Percentage Quick Buttons */}
        <div className={styles.percentageSection}>
          <label className={styles.inputLabel}>Quick Select</label>
          <div className={styles.percentageButtons}>
            {percentageAmounts.map(({ label, cents }) => (
              <button
                key={label}
                type='button'
                className={`${styles.percentBtn} ${
                  parsedAmountCents === cents ? styles.percentBtnActive : ""
                }`}
                onClick={() => setAmountFromCents(cents)}
                disabled={isPending || cents === 0}
              >
                {label}
                <span className={styles.percentAmount}>
                  {formatMoney(cents, currency)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Warning for no Stripe intent */}
      {!stripePaymentIntentId && (
        <div className={styles.warningMessage}>
          ⚠️ No Stripe payment intent linked. Refund will need to be processed
          manually outside of this system.
        </div>
      )}

      {/* Action Buttons */}
      {!showConfirm ? (
        <div className={styles.actionSection}>
          <Button
            text={`Issue Refund${isValidAmount ? ` (${formatMoney(parsedAmountCents, currency)})` : ""}`}
            btnType='black'
            refundIcon
            onClick={() => setShowConfirm(true)}
            disabled={isPending || !isValidAmount}
          />
        </div>
      ) : (
        <div className={styles.confirmSection}>
          <div className={styles.confirmMessage}>
            <strong>⚠️ Confirm Refund</strong>
            <p>
              You are about to refund{" "}
              <strong>{formatMoney(parsedAmountCents, currency)}</strong> to the
              customer. This action cannot be undone.
            </p>
          </div>
          <div className={styles.confirmActions}>
            <Button
              text={isPending ? "Processing..." : "Yes, Issue Refund"}
              btnType='black'
              onClick={handleRefund}
              disabled={isPending}
            />
            <Button
              text='Cancel'
              btnType='gray'
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
