// src/app/admin/bookings/[id]/AdminManualCardPaymentClient.tsx
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { adminCreateManualPaymentIntent } from "../../../../../actions/bookings/adminCreateManualPaymentIntent";
import Button from "@/components/shared/Button/Button";

function formatMoney(cents: number, currency = "USD") {
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

const stripePromise = (() => {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return pk ? loadStripe(pk) : null;
})();

export default function AdminManualCardPaymentClient({
  bookingId,
  amountCents,
  currency,
  isPaid,
  isApproved,
  amountPaidCents = 0,
}: {
  bookingId: string;
  amountCents: number;
  currency: string;
  isPaid: boolean;
  isApproved: boolean;
  amountPaidCents?: number;
}) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [creating, setCreating] = useState(false);
  // ✅ Track if payment just completed (to hide the form immediately)
  const [justPaid, setJustPaid] = useState(false);

  // Calculate balance due
  const balanceDueCents = amountCents - amountPaidCents;
  const hasBalanceDue = amountPaidCents > 0 && balanceDueCents > 0;
  const isFullyPaid = isPaid && balanceDueCents <= 0;

  if (!stripePromise) {
    return (
      <div className='miniNote' style={{ color: "rgba(180,0,0,0.85)" }}>
        Missing <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Add it to
        enable manual payments.
      </div>
    );
  }

  // ✅ Block payments if booking is not approved
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
          You must approve this booking before taking payment. Go to the
          Approval Status section above to approve it.
        </p>
      </div>
    );
  }

  // ✅ Show success state if fully paid OR just paid (immediate UI feedback)
  if (isFullyPaid || justPaid) {
    return (
      <Button
        disabled
        type='button'
        text='Payment successful'
        btnType='green'
        checkIcon
        onClick={() => {}}
      />
    );
  }

  async function start() {
    if (!bookingId) return;
    setCreating(true);
    try {
      const res = await adminCreateManualPaymentIntent({ bookingId });
      if ((res as any)?.error) {
        toast.error((res as any).error);
        return;
      }
      const secret = String((res as any)?.clientSecret || "");
      if (!secret) {
        toast.error("No clientSecret returned.");
        return;
      }
      setClientSecret(secret);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start manual payment.");
    } finally {
      setCreating(false);
    }
  }

  if (!clientSecret) {
    // Determine button text based on payment state
    let buttonText = "Take card payment";
    if (creating) {
      buttonText = "Starting...";
    } else if (hasBalanceDue) {
      buttonText = `Take balance payment (${formatMoney(balanceDueCents, currency)})`;
    } else if (amountCents > 0) {
      buttonText = `Take card payment (${formatMoney(amountCents, currency)})`;
    }

    return (
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
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
            <strong>Balance Due:</strong>{" "}
            {formatMoney(balanceDueCents, currency)}
            <span
              style={{
                display: "block",
                fontSize: "0.8rem",
                marginTop: 2,
                opacity: 0.85,
              }}
            >
              (Paid: {formatMoney(amountPaidCents, currency)} of{" "}
              {formatMoney(amountCents, currency)})
            </span>
          </div>
        )}

        <Button
          disabled={creating || amountCents <= 0}
          type='button'
          text={buttonText}
          btnType='green'
          arrow
          onClick={start}
        />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        appearance: { theme: "stripe" },
        loader: "auto",
      }}
    >
      <ManualPaymentInner
        clientSecret={clientSecret}
        currency={currency}
        amountToCharge={hasBalanceDue ? balanceDueCents : amountCents}
        isBalancePayment={hasBalanceDue}
        onPaymentSuccess={() => setJustPaid(true)}
      />
    </Elements>
  );
}

function ManualPaymentInner({
  clientSecret,
  currency,
  amountToCharge,
  isBalancePayment,
  onPaymentSuccess,
}: {
  clientSecret: string;
  currency: string;
  amountToCharge: number;
  isBalancePayment: boolean;
  onPaymentSuccess: () => void;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  const btnStyle = useMemo(() => {
    return paidSuccess
      ? {
          background: "rgba(0,160,80,0.95)",
          borderColor: "rgba(0,160,80,0.95)",
        }
      : undefined;
  }, [paidSuccess]);

  function formatMoney(cents: number) {
    const n = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  }

  async function pay() {
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) {
      toast.error("Card input not ready yet.");
      return;
    }

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card } },
      );

      if (error) {
        toast.error(error.message ?? "Payment failed.");
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        setPaidSuccess(true);
        toast.success(
          isBalancePayment
            ? "Balance payment succeeded."
            : "Payment succeeded.",
        );

        // ✅ Notify parent to show success state immediately (hides card form)
        onPaymentSuccess();

        // ✅ Wait for webhook to process, then refresh page data
        // Webhook typically processes within 1-3 seconds
        await new Promise((resolve) => setTimeout(resolve, 2500));
        router.refresh();
        return;
      }

      toast.success(`Payment status: ${paymentIntent?.status ?? "unknown"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Payment error.");
    } finally {
      setSubmitting(false);
    }
  }

  // Determine button text
  let chargeButtonText = `Charge card (${formatMoney(amountToCharge)})`;
  if (paidSuccess) {
    chargeButtonText = "Payment successful";
  } else if (submitting) {
    chargeButtonText = "Processing...";
  } else if (isBalancePayment) {
    chargeButtonText = `Charge balance (${formatMoney(amountToCharge)})`;
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      {/* Show what we're charging */}
      <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
        {isBalancePayment
          ? `Charging balance of ${formatMoney(amountToCharge)}`
          : `Charging ${formatMoney(amountToCharge)}`}
      </div>

      {/* Card-only fields */}
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 10,
          padding: 12,
          background: "white",
        }}
      >
        <CardElement options={{ hidePostalCode: false }} />
      </div>

      <button
        type='button'
        className='primaryBtn'
        onClick={pay}
        disabled={!stripe || !elements || submitting || paidSuccess}
        style={btnStyle}
      >
        {chargeButtonText}
      </button>
    </div>
  );
}
