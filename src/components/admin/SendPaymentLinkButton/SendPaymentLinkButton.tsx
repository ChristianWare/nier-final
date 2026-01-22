"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaymentLinkAndEmail } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";

type Props = {
  bookingId: string;
  totalCents?: number;
  amountPaidCents?: number;
  currency?: string;
};

function formatMoney(cents: number, currency = "USD") {
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function SendPaymentLinkButton({
  bookingId,
  totalCents = 0,
  amountPaidCents = 0,
  currency = "USD",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const balanceDue = totalCents - amountPaidCents;
  const hasBalanceDue = amountPaidCents > 0 && balanceDue > 0;
  const isFullyPaid = amountPaidCents > 0 && balanceDue <= 0;

  async function handleSendPaymentLink(isBalancePayment: boolean) {
    setError(null);
    setSuccess(null);

    const fd = new FormData();
    fd.append("bookingId", bookingId);
    fd.append("isBalancePayment", isBalancePayment ? "true" : "false");

    startTransition(async () => {
      const result = await createPaymentLinkAndEmail(fd);

      if (result.error) {
        setError(result.error);
        if (result.checkoutUrl) {
          setSuccess(`Checkout URL: ${result.checkoutUrl}`);
        }
      } else if (result.success) {
        const amount = result.isBalancePayment
          ? formatMoney(result.amountCharged ?? balanceDue, currency)
          : formatMoney(totalCents, currency);

        setSuccess(
          result.isBalancePayment
            ? `Balance payment link (${amount}) sent successfully!`
            : result.reused
              ? "Payment link resent successfully!"
              : "Payment link sent successfully!",
        );
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Show balance info if partially paid */}
      {hasBalanceDue && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: "0.95rem",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            ⚠️ Balance Due: {formatMoney(balanceDue, currency)}
          </div>
          <div style={{ opacity: 0.8 }}>
            Customer has paid {formatMoney(amountPaidCents, currency)} of{" "}
            {formatMoney(totalCents, currency)}.
          </div>
        </div>
      )}

      {/* Fully paid notice */}
      {isFullyPaid && (
        <div
          style={{
            background: "#d1fae5",
            border: "1px solid #10b981",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: "0.95rem",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            ✓ Fully Paid: {formatMoney(amountPaidCents, currency)}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {/* Full payment link - only show if not fully paid */}
        {!isFullyPaid && (
          <Button
            text={
              isPending
                ? "Sending..."
                : `Send Payment Link (${formatMoney(totalCents, currency)})`
            }
            btnType='gray'
            email
            onClick={() => handleSendPaymentLink(false)}
            disabled={isPending || totalCents <= 0}
          />
        )}

        {/* Balance payment link - only show if there's a balance */}
        {hasBalanceDue && (
          <Button
            text={
              isPending
                ? "Sending..."
                : `Send Balance Link (${formatMoney(balanceDue, currency)})`
            }
            btnType='secondary'
            onClick={() => handleSendPaymentLink(true)}
            disabled={isPending}
          />
        )}
      </div>

      {/* Error/Success messages */}
      {error && (
        <div
          style={{
            color: "#c00",
            fontSize: "0.9rem",
            padding: "8px 0",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            color: "#080",
            fontSize: "0.9rem",
            padding: "8px 0",
            wordBreak: "break-all",
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
}
