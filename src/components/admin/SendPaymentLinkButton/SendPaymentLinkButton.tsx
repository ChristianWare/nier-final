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

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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
  isApproved = true,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const balanceDueCents = totalCents - amountPaidCents;
  const hasBalanceDue = amountPaidCents > 0 && balanceDueCents > 0;
  const isFullyPaid = amountPaidCents >= totalCents && totalCents > 0;

  if (!isApproved) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "var(--warning50)",
          border: "1px solid var(--warning200)",
          borderRadius: 8,
          fontSize: "1.4rem",
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Button
          disabled
          type='button'
          text='✓ Fully paid'
          btnType='greenReg'
          onClick={() => {}}
        />
        <a
          href={`/pay/${bookingId}/success?already_paid=1`}
          target='_blank'
          rel='noopener noreferrer'
          className='backBtn'
          style={{ display: "inline-block", fontSize: "1.4rem" }}
        >
          View payment success page →
        </a>
      </div>
    );
  }

  async function handleSend(isBalancePayment: boolean) {
    setError(null);
    setOverrideError(null);

    if (showOverride) {
      if (!overrideEmail.trim()) {
        setOverrideError("Please enter an email address.");
        return;
      }
      if (!isValidEmail(overrideEmail.trim())) {
        setOverrideError("Please enter a valid email address.");
        return;
      }
    }

    const formData = new FormData();
    formData.append("bookingId", bookingId);
    formData.append("isBalancePayment", isBalancePayment ? "true" : "false");
    if (showOverride && overrideEmail.trim()) {
      formData.append("overrideEmail", overrideEmail.trim());
    }

    startTransition(async () => {
      const result = await createPaymentLinkAndEmail(formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      if (result.success) {
        const target =
          showOverride && overrideEmail.trim() ? overrideEmail.trim() : null;
        const msg = isBalancePayment
          ? `Balance link sent${target ? ` to ${target}` : ""}! (${formatMoney(balanceDueCents, currency)})`
          : `Payment link sent${target ? ` to ${target}` : " to customer"}!`;
        toast.success(msg);
        if (showOverride) {
          setShowOverride(false);
          setOverrideEmail("");
        }
        router.refresh();
      }
    });
  }

  let buttonText = "Email payment link";
  if (isPending) {
    buttonText = "Sending...";
  } else if (hasBalanceDue) {
    buttonText = `Email balance link (${formatMoney(balanceDueCents, currency)})`;
  } else if (totalCents > 0) {
    buttonText = `Email payment link (${formatMoney(totalCents, currency)})`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Balance due banner */}
      {hasBalanceDue && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "1.4rem",
            color: "#92400e",
          }}
        >
          <strong>Balance Due:</strong> {formatMoney(balanceDueCents, currency)}
          <span
            style={{
              display: "block",
              fontSize: "1.4rem",
              marginTop: 2,
              opacity: 0.85,
            }}
          >
            (Paid: {formatMoney(amountPaidCents, currency)} of{" "}
            {formatMoney(totalCents, currency)})
          </span>
        </div>
      )}

      {/* Primary send button */}
      <Button
        disabled={isPending || totalCents <= 0}
        type='button'
        text={buttonText}
        btnType='greenReg'
        onClick={() => handleSend(hasBalanceDue)}
      />

      {/* Override toggle button */}
      <button
        type='button'
        className='secondaryBtn'
        onClick={() => {
          setShowOverride((prev) => !prev);
          setOverrideEmail("");
          setOverrideError(null);
        }}
      >
        {showOverride
          ? "✕ Cancel — use original email"
          : "📧 Send to a different email"}
      </button>

      {/* Override email input — only shown when toggle is open */}
      {showOverride && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            type='email'
            value={overrideEmail}
            onChange={(e) => {
              setOverrideEmail(e.target.value);
              setOverrideError(null);
            }}
            placeholder='Enter alternate email address...'
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
          <p
            style={{
              fontSize: "1.3rem",
              color: "var(--paragraph, #676767)",
              margin: 0,
              opacity: 0.85,
            }}
          >
            The payment link will be sent to this address instead of the
            customer&apos;s email on file. Then click the green button above to
            send.
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: "#c00", fontSize: "1.4rem", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
