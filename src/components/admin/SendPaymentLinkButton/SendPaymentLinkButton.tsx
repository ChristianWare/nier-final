"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createPaymentLinkAndEmail } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";

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
  currency: string;
  isApproved?: boolean;
};

export default function SendPaymentLinkButton({
  bookingId,
  totalCents,
  amountPaidCents,
  currency,
  isApproved = true, // Default to true for backward compatibility
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const balanceDueCents = totalCents - amountPaidCents;
  const hasBalanceDue = amountPaidCents > 0 && balanceDueCents > 0;
  const isFullyPaid = amountPaidCents >= totalCents && totalCents > 0;

  // ✅ Block if booking is not approved
  if (!isApproved) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "var(--warning50)",
          border: "1px solid var(--warning200)",
          borderRadius: 8,
          fontSize: "0.9rem",
          color: "var(--warning800)",
        }}
      >
        <strong>⚠️ Booking not approved</strong>
        <p style={{ margin: "6px 0 0", opacity: 0.9 }}>
          You must approve this booking before sending a payment link. Go to the
          Approval Status section above to approve it.
        </p>
      </div>
    );
  }

  if (isFullyPaid) {
    return (
      <Button
        disabled
        type='button'
        text='Fully paid'
        btnType='green'
        checkIcon
        onClick={() => {}}
      />
    );
  }

  async function handleSend(isBalancePayment: boolean) {
    setError(null);

    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("isBalancePayment", isBalancePayment ? "true" : "false");

    startTransition(async () => {
      const result = await createPaymentLinkAndEmail(formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      if (result.success) {
        const msg = isBalancePayment
          ? `Balance payment link sent! (${formatMoney(balanceDueCents, currency)})`
          : "Payment link sent to customer!";
        toast.success(msg);
        router.refresh();
      }
    });
  }

  // Determine button text
  let buttonText = "Send payment link";
  if (isPending) {
    buttonText = "Sending...";
  } else if (hasBalanceDue) {
    buttonText = `Send balance link (${formatMoney(balanceDueCents, currency)})`;
  } else if (totalCents > 0) {
    buttonText = `Send payment link (${formatMoney(totalCents, currency)})`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Show balance info if applicable */}
      {hasBalanceDue && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.9rem",
            color: "#92400e",
          }}
        >
          <strong>Balance Due:</strong> {formatMoney(balanceDueCents, currency)}
          <span
            style={{
              display: "block",
              fontSize: "0.8rem",
              marginTop: 2,
              opacity: 0.85,
            }}
          >
            (Paid: {formatMoney(amountPaidCents, currency)} of{" "}
            {formatMoney(totalCents, currency)})
          </span>
        </div>
      )}

      <Button
        disabled={isPending || totalCents <= 0}
        type='button'
        text={buttonText}
        btnType='primary'
        // emailIcon
        onClick={() => handleSend(hasBalanceDue)}
      />

      {error && (
        <p style={{ color: "#c00", fontSize: "0.9rem", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
