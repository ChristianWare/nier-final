"use client";

import { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import styles from "./InvoiceCheckout.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
};

type Props = {
  stripePublishableKey: string;
  invoiceId: string;
  invoiceNumber: string;
  memo: string | null;
  companyName: string;
  currency: string;
  lineItems: LineItem[];
  subtotalCents: number;
  balanceDueCents: number;
  amountPaidCents: number;
  allowTip: boolean;
  customerName: string;
  customerEmail: string;
};

const TIP_PRESETS = [15, 18, 20];

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    minimumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

/* ── Inner form (needs Elements context) ── */
function PaymentForm({
  invoiceId,
  totalCents,
  currency,
}: {
  invoiceId: string;
  totalCents: number;
  currency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/invoice/${invoiceId}/success`,
      },
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.paymentForm}>
      <div className={styles.paymentElementWrapper}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {errorMessage && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          {errorMessage}
        </div>
      )}

      <Button
        text={isProcessing ? "Submitting…" : `Pay ${fmt(totalCents, currency)}`}
        type="submit"
        disabled={isProcessing || !stripe}
        btnType="blackReg"
      />

      <div className={styles.secureNote}>
        <svg
          className={styles.lockIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by Stripe
      </div>
    </form>
  );
}

export default function InvoiceCheckoutClient({
  stripePublishableKey,
  invoiceId,
  invoiceNumber,
  memo,
  companyName,
  currency,
  lineItems,
  subtotalCents,
  balanceDueCents,
  amountPaidCents,
  allowTip,
  customerName,
  customerEmail,
}: Props) {
  const stripePromise = useMemo(
    () => loadStripe(stripePublishableKey),
    [stripePublishableKey],
  );

  const [selectedTipPercent, setSelectedTipPercent] = useState<number | null>(
    null,
  );
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const tipCents = isCustomTip
    ? Math.max(0, Math.round(parseFloat(customTipAmount || "0") * 100))
    : selectedTipPercent !== null
      ? Math.round((balanceDueCents * selectedTipPercent) / 100)
      : 0;

  const totalCents = balanceDueCents + tipCents;

  // Create / update the PaymentIntent whenever the tip changes
  useEffect(() => {
    let alive = true;
    const createIntent = async () => {
      try {
        setLoadError(null);
        const res = await fetch("/api/checkout/create-invoice-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId, tipCents }),
        });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setLoadError(data?.error ?? "Could not start payment.");
          setIsLoading(false);
          return;
        }
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      } catch {
        if (!alive) return;
        setLoadError("Could not start payment. Please refresh and try again.");
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(createIntent, 300);
    return () => {
      alive = false;
      clearTimeout(debounce);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, tipCents]);

  function handleTipPreset(percent: number) {
    setIsCustomTip(false);
    setSelectedTipPercent(percent);
    setCustomTipAmount("");
  }
  function handleNoTip() {
    setIsCustomTip(false);
    setSelectedTipPercent(null);
    setCustomTipAmount("");
  }
  function handleCustomTip() {
    setIsCustomTip(true);
    setSelectedTipPercent(null);
  }

  const firstName = (customerName ?? "there").split(" ")[0] || "there";

  return (
    <LayoutWrapper>
      <div className={styles.wrap}>
        {/* ── Summary ── */}
        <section className={styles.summary}>
          <div className={styles.summaryHead}>
            <span className={styles.eyebrow}>{companyName}</span>
            <h1 className={styles.invNo}>Invoice {invoiceNumber}</h1>
            <p className={styles.greeting}>
              Hi {firstName}, here&apos;s what&apos;s due.
            </p>
          </div>

          <ul className={styles.items}>
            {lineItems.map((li) => (
              <li key={li.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemDesc}>{li.description}</span>
                  {li.quantity > 1 && (
                    <span className={styles.itemQty}>
                      {li.quantity} × {fmt(li.unitAmountCents, currency)}
                    </span>
                  )}
                </div>
                <span className={styles.itemAmt}>
                  {fmt(li.quantity * li.unitAmountCents, currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{fmt(subtotalCents, currency)}</span>
            </div>
            {amountPaidCents > 0 && (
              <div className={styles.totalRow}>
                <span>Already paid</span>
                <span>−{fmt(amountPaidCents, currency)}</span>
              </div>
            )}
            {tipCents > 0 && (
              <div className={styles.totalRow}>
                <span>Tip</span>
                <span>{fmt(tipCents, currency)}</span>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <span>Total due</span>
              <span>{fmt(totalCents, currency)}</span>
            </div>
          </div>

          {memo && <p className={styles.memo}>{memo}</p>}
        </section>

        {/* ── Payment ── */}
        <section className={styles.payPanel}>
          {allowTip && (
            <div className={styles.tipBlock}>
              <span className={styles.tipLabel}>Add a tip?</span>
              <div className={styles.tipOptions}>
                {TIP_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.tipBtn} ${
                      !isCustomTip && selectedTipPercent === p
                        ? styles.tipBtnActive
                        : ""
                    }`}
                    onClick={() => handleTipPreset(p)}
                  >
                    {p}%
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.tipBtn} ${
                    isCustomTip ? styles.tipBtnActive : ""
                  }`}
                  onClick={handleCustomTip}
                >
                  Custom
                </button>
                <button
                  type="button"
                  className={`${styles.tipBtn} ${
                    !isCustomTip && selectedTipPercent === null
                      ? styles.tipBtnActive
                      : ""
                  }`}
                  onClick={handleNoTip}
                >
                  No tip
                </button>
              </div>
              {isCustomTip && (
                <div className={styles.customTipWrap}>
                  <span className={styles.dollar}>$</span>
                  <input
                    className={styles.customTipInput}
                    inputMode="decimal"
                    value={customTipAmount}
                    onChange={(e) => setCustomTipAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          )}

          {loadError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {loadError}
            </div>
          )}

          {isLoading && !clientSecret && (
            <div className={styles.loading}>Preparing secure checkout…</div>
          )}

          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#000000",
                    colorBackground: "#ffffff",
                    colorText: "#1a1a1a",
                    colorDanger: "#dc2626",
                    fontFamily: "system-ui, sans-serif",
                    spacingUnit: "4px",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <PaymentForm
                invoiceId={invoiceId}
                totalCents={totalCents}
                currency={currency}
              />
            </Elements>
          )}
        </section>
      </div>
    </LayoutWrapper>
  );
}