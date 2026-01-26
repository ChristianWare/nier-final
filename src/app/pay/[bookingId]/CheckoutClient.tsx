/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import styles from "./Checkout.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type Props = {
  bookingId: string;
  serviceName: string;
  vehicleName: string;
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  baseFareCents: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  isBalancePayment: boolean;
  amountPaidCents: number;
  totalBookingCents: number;
};

const TIP_PRESETS = [
  { label: "15%", percent: 15 },
  { label: "20%", percent: 20 },
  { label: "25%", percent: 25 },
  { label: "30%", percent: 30 },
];

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function CheckoutForm({
  bookingId,
  totalCents,
  tipCents,
  baseFareCents,
  currency,
  isBalancePayment,
}: {
  bookingId: string;
  totalCents: number;
  tipCents: number;
  baseFareCents: number;
  currency: string;
  isBalancePayment: boolean;
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
        return_url: `${window.location.origin}/pay/${bookingId}/success`,
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
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {errorMessage && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          {errorMessage}
        </div>
      )}

      <Button
        text={
          isProcessing
            ? "Submitting..."
            : `Pay ${formatMoney(totalCents, currency)}`
        }
        type='submit'
        disabled={isProcessing || !stripe}
        btnType='blackReg'
      />

      <div className={styles.secureNote}>
        <svg
          className={styles.lockIcon}
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
          <path d='M7 11V7a5 5 0 0 1 10 0v4' />
        </svg>
        Secured by Stripe
      </div>
    </form>
  );
}

export default function CheckoutClient({
  bookingId,
  serviceName,
  vehicleName,
  pickupAt,
  pickupAddress,
  dropoffAddress,
  baseFareCents,
  currency,
  customerName,
  customerEmail,
  isBalancePayment,
  amountPaidCents,
  totalBookingCents,
}: Props) {
  const [selectedTipPercent, setSelectedTipPercent] = useState<number | null>(
    20,
  );
  const [customTipAmount, setCustomTipAmount] = useState<string>("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate tip amount
  const tipCents = isCustomTip
    ? Math.round(parseFloat(customTipAmount || "0") * 100)
    : selectedTipPercent !== null
      ? Math.round((baseFareCents * selectedTipPercent) / 100)
      : 0;

  const totalCents = baseFareCents + tipCents;

  // Create PaymentIntent when total changes
  useEffect(() => {
    if (totalCents <= 0) return;

    const createPaymentIntent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/checkout/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            amountCents: totalCents,
            tipCents,
            currency,
            isBalancePayment,
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        setError("Failed to initialize payment. Please refresh and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(createPaymentIntent, 300);
    return () => clearTimeout(debounce);
  }, [bookingId, totalCents, tipCents, currency, isBalancePayment]);

  function handleTipPresetClick(percent: number) {
    setIsCustomTip(false);
    setSelectedTipPercent(percent);
    setCustomTipAmount("");
  }

  function handleNoTipClick() {
    setIsCustomTip(false);
    setSelectedTipPercent(null);
    setCustomTipAmount("");
  }

  function handleCustomTipClick() {
    setIsCustomTip(true);
    setSelectedTipPercent(null);
  }

  function handleCustomTipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    // Only allow one decimal point
    const parts = value.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setCustomTipAmount(value);
  }

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={`${styles.heading} underline`}>
              Complete Your Payment
            </h1>
            <p className={styles.subtitle}>
              {isBalancePayment
                ? "Pay the remaining balance for your trip"
                : "Secure payment for your upcoming trip"}
            </p>
          </div>

          <div className={styles.grid}>
            {/* Left Column - Trip Summary & Tip Selection */}
            <div className={styles.leftColumn}>
              {/* Trip Summary Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className='cardTitle h5'>Trip Summary</h2>
                </div>
                <div className={styles.tripDetails}>
                  <div className={styles.tripRow}>
                    <span className={styles.tripIcon}>🚗</span>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>{serviceName}</span>
                      <span className={styles.tripValue}>{vehicleName}</span>
                    </div>
                  </div>
                  <div className={styles.tripRow}>
                    <span className={styles.tripIcon}>📅</span>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>
                        {formatDate(pickupAt)}
                      </span>
                      <span className={styles.tripValue}>
                        {formatTime(pickupAt)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.tripRow}>
                    <span className={styles.tripIcon}>📍</span>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>Pickup</span>
                      <span className={styles.tripValue}>{pickupAddress}</span>
                    </div>
                  </div>
                  <div className={styles.tripRow}>
                    <span className={styles.tripIcon}>🏁</span>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>Dropoff</span>
                      <span className={styles.tripValue}>{dropoffAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip Selection Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className='cardTitle h5'> Add a tip for your driver</h2>
                  <p className={styles.cardSubtitle}>
                    100% of your tip goes directly to your driver
                  </p>
                </div>

                <div className={styles.tipGrid}>
                  {TIP_PRESETS.map(({ label, percent }) => {
                    const tipAmount = Math.round(
                      (baseFareCents * percent) / 100,
                    );
                    const isSelected =
                      !isCustomTip && selectedTipPercent === percent;
                    return (
                      <button
                        key={percent}
                        type='button'
                        onClick={() => handleTipPresetClick(percent)}
                        className={`${styles.tipButton} ${isSelected ? styles.tipButtonSelected : ""}`}
                      >
                        <span className={styles.tipPercent}>{label}</span>
                        <span className={styles.tipAmount}>
                          {formatMoney(tipAmount, currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.tipActions}>
                  <button
                    type='button'
                    onClick={handleCustomTipClick}
                    className={`${styles.tipActionButton} ${isCustomTip ? styles.tipActionButtonSelected : ""}`}
                  >
                    Custom
                  </button>
                  <button
                    type='button'
                    onClick={handleNoTipClick}
                    className={`${styles.tipActionButton} ${!isCustomTip && selectedTipPercent === null ? styles.tipActionButtonSelected : ""}`}
                  >
                    No tip
                  </button>
                </div>

                {isCustomTip && (
                  <div className={styles.customTipWrapper}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      type='text'
                      inputMode='decimal'
                      placeholder='0.00'
                      value={customTipAmount}
                      onChange={handleCustomTipChange}
                      className={styles.customTipInput}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className={styles.card}>
                <div className={styles.priceBreakdown}>
                  {isBalancePayment && (
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Previously Paid</span>
                      <span className={styles.priceValue}>
                        {formatMoney(amountPaidCents, currency)}
                      </span>
                    </div>
                  )}
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>
                      {isBalancePayment ? "Balance Due" : "Base Fare"}
                    </span>
                    <span className={styles.priceValue}>
                      {formatMoney(baseFareCents, currency)}
                    </span>
                  </div>
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>Driver Tip</span>
                    <span className={styles.priceValue}>
                      {tipCents > 0 ? formatMoney(tipCents, currency) : "—"}
                    </span>
                  </div>
                  <div className={styles.priceDivider} />
                  <div className={`${styles.priceRow} ${styles.priceTotal}`}>
                    <span className={styles.priceTotalLabel}>Total</span>
                    <span className={styles.priceTotalValue}>
                      {formatMoney(totalCents, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Form */}
            <div className={styles.rightColumn}>
              <div className={styles.paymentCard}>
                <div className={styles.cardHeader}>
                  <h2 className='cardTitle h5'>Payment Details</h2>
                </div>

                {error && (
                  <div className={styles.errorBanner}>
                    <span className={styles.errorIcon}>⚠️</span>
                    {error}
                  </div>
                )}

                {isLoading && !clientSecret && (
                  <div className={styles.loadingState}>
                    <span className={styles.spinner} />
                    <span>Preparing payment...</span>
                  </div>
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
                        rules: {
                          ".Input": {
                            border: "1px solid #e5e5e5",
                            boxShadow: "none",
                          },
                          ".Input:focus": {
                            border: "1px solid #000000",
                            boxShadow: "0 0 0 1px #000000",
                          },
                          ".Label": {
                            fontWeight: "500",
                            color: "#1a1a1a",
                          },
                        },
                      },
                    }}
                  >
                    <CheckoutForm
                      bookingId={bookingId}
                      totalCents={totalCents}
                      tipCents={tipCents}
                      baseFareCents={baseFareCents}
                      currency={currency}
                      isBalancePayment={isBalancePayment}
                    />
                  </Elements>
                )}
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
