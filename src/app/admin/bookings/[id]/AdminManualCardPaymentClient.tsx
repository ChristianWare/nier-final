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

// function centsToUsd(cents: number) {
//   return (cents / 100).toFixed(2);
// }

const stripePromise = (() => {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return pk ? loadStripe(pk) : null;
})();

export default function AdminManualCardPaymentClient({
  bookingId,
  // amountCents,
  currency,
  isPaid,
}: {
  bookingId: string;
  amountCents: number;
  currency: string;
  isPaid: boolean;
}) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [creating, setCreating] = useState(false);

  if (!stripePromise) {
    return (
      <div className='miniNote' style={{ color: "rgba(180,0,0,0.85)" }}>
        Missing <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Add it to
        enable manual payments.
      </div>
    );
  }

  if (isPaid) {
    return (
      // <button
      //   type='button'
      //   className='primaryBtn'
      //   disabled
      //   style={{
      //     background: "rgba(0,160,80,0.95)",
      //     borderColor: "rgba(0,160,80,0.95)",
      //   }}
      // >
      //   Payment successful
      // </button>
      <Button
        disabled
        type='button'
        text='Payment successful'
        btnType='green'
        checkIcon
        onClick={start}
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
    return (
      // <div className={styles.btnContainer}>
      //   <button
      //     type='button'
      //     className='goodBtnii'
      //     onClick={start}
      //     disabled={creating}
      //   >
      //     {creating ? "Starting..." : `Take card payment`}
      //   </button>
      // </div>
      <Button
        disabled={creating}
        type='button'
        text={creating ? "Starting..." : "Take card payment"}
        btnType='green'
        arrow
        onClick={start}
      />
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
      <ManualPaymentInner clientSecret={clientSecret} currency={currency} />
    </Elements>
  );
}

function ManualPaymentInner({
  clientSecret,
}: {
  clientSecret: string;
  currency: string;
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
        toast.success("Payment succeeded.");
        router.refresh(); // ✅ updates Payment status on the server page
        return;
      }

      toast.success(`Payment status: ${paymentIntent?.status ?? "unknown"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Payment error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      {/* ✅ Card-only fields (no Affirm / Klarna / etc) */}
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
        {paidSuccess
          ? "Payment successful"
          : submitting
            ? "Processing..."
            : "Charge card"}
      </button>
    </div>
  );
}
