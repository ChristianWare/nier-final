"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { recordCashPayment } from "../../../../actions/admin/bookings";

type Props = {
  bookingId: string;
  amountCents: number;
  currency: string;
  isPaid: boolean;
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function AdminCashPaymentButton({
  bookingId,
  amountCents,
  currency,
  isPaid,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (isPaid) {
    return (
      <button
        disabled
        className='primaryBtn'
        style={{ opacity: 0.5, cursor: "not-allowed" }}
      >
        ✓ Cash payment recorded
      </button>
    );
  }

  if (!confirming) {
    return (
      <button
        type='button'
        className='secondaryBtn'
        onClick={() => setConfirming(true)}
        disabled={amountCents <= 0}
      >
        💵 Mark as paid (cash)
      </button>
    );
  }

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: 8,
        display: "grid",
        gap: 12,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "1.4rem",
          fontWeight: 600,
          color: "#166534",
        }}
      >
        Confirm cash payment of {formatMoney(amountCents, currency)}?
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "1.4rem",
          color: "#166534",
          opacity: 0.85,
        }}
      >
        This will mark the booking as confirmed and paid. This cannot be undone
        without issuing a refund.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type='button'
          className='primaryBtn'
          disabled={isPending}
          onClick={() => {
            const fd = new FormData();
            fd.append("bookingId", bookingId);
            startTransition(async () => {
              const result = await recordCashPayment(fd);
              if (result.error) {
                toast.error(result.error);
                setConfirming(false);
                return;
              }
              toast.success("Cash payment recorded!");
              router.refresh();
            });
          }}
        >
          {isPending ? "Recording..." : "✓ Confirm cash payment"}
        </button>
        <button
          type='button'
          className='secondaryBtn'
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
