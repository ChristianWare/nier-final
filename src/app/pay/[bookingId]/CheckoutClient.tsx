/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { chargeCardOnFileForCheckout } from "../../../../actions/payments/chargeCardOnFileForCheckout";
import Modal from "@/components/shared/Modal/Modal";

type Stop = {
  id: string;
  stopOrder: number;
  address: string;
};

type Props = {
  bookingId: string;
  timezone: string;
  groupLegs?: Array<{
    legNumber: number;
    pickupAt: string;
    pickupAddress: string;
    dropoffAddress: string;
    serviceName: string;
    totalCents: number;
  }>;
  serviceName: string;
  vehicleName: string;
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  stops: Stop[];
  stopSurchargeCents: number;
  baseFareCents: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  isBalancePayment: boolean;
  amountPaidCents: number;
  totalBookingCents: number;
  depositMode?: boolean;
  depositCents?: number | null;
  depositPercent?: number | null;
  balanceCents?: number | null;
  depositDueDate?: string | null;
  balanceDueDate?: string | null;
  isDepositAlreadyPaid?: boolean;
  savedCard?: {
    hasCard: boolean;
    brand: string | null;
    last4: string | null;
    exp_month: number | null;
    exp_year: number | null;
    isExpired: boolean;
  } | null;
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

function formatDate(isoString: string, tz: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  });
}

function formatTime(isoString: string, tz: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
}

function formatLocalDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function CheckoutForm({
  bookingId,
  totalCents,
  tipCents,
  baseFareCents,
  currency,
  isBalancePayment,
  isDepositPayment,
  depositAmountCents,
}: {
  bookingId: string;
  totalCents: number;
  tipCents: number;
  baseFareCents: number;
  currency: string;
  isBalancePayment: boolean;
  isDepositPayment: boolean;
  depositAmountCents: number | null;
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
        <PaymentElement options={{ layout: "tabs" }} />
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
  timezone,
  groupLegs = [],
  serviceName,
  vehicleName,
  pickupAt,
  pickupAddress,
  dropoffAddress,
  stops,
  stopSurchargeCents,
  baseFareCents,
  currency,
  customerName,
  customerEmail,
  isBalancePayment,
  amountPaidCents,
  totalBookingCents,
  stripePublishableKey,
  savedCard,
  depositMode = false,
  depositCents,
  depositPercent,
  balanceCents,
  depositDueDate,
  balanceDueDate,
  isDepositAlreadyPaid = false,
}: Props & { stripePublishableKey: string }) {
  const stripePromise = useMemo(
    () => loadStripe(stripePublishableKey),
    [stripePublishableKey],
  );

  // Whether to show the deposit choice screen
  const showDepositChoice =
    depositMode && !isDepositAlreadyPaid && (depositCents ?? 0) > 0;

  // null = not chosen yet (choice screen), 'deposit' or 'full' = chosen
  const [depositChoice, setDepositChoice] = useState<"deposit" | "full" | null>(
    showDepositChoice ? null : "full",
  );

  const [selectedTipPercent, setSelectedTipPercent] = useState<number | null>(
    20,
  );
  const [customTipAmount, setCustomTipAmount] = useState<string>("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardOnFileConfirming, setCardOnFileConfirming] = useState(false);
  const [cardOnFileCharging, setCardOnFileCharging] = useState(false);
  const [cardOnFileSuccess, setCardOnFileSuccess] = useState(false);

  const BRAND_LABELS: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };

  async function handleCardOnFileCharge() {
    setCardOnFileCharging(true);
    setCardOnFileConfirming(false);
    try {
      const result = await chargeCardOnFileForCheckout({ bookingId, tipCents });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCardOnFileSuccess(true);
      window.location.href = `/pay/${bookingId}/success`;
    } catch {
      setError("Something went wrong. Please try the card form below.");
    } finally {
      setCardOnFileCharging(false);
    }
  }

  // The amount to charge depends on whether they chose deposit or full
  const isThisDepositPayment = showDepositChoice && depositChoice === "deposit";
  const effectiveBaseFareCents = isThisDepositPayment
    ? (depositCents ?? baseFareCents)
    : baseFareCents;

  // Tip is calculated off the effective base fare
  const tipCents = isCustomTip
    ? Math.round(parseFloat(customTipAmount || "0") * 100)
    : selectedTipPercent !== null
      ? Math.round((effectiveBaseFareCents * selectedTipPercent) / 100)
      : 0;

  const totalCents = effectiveBaseFareCents + tipCents;

  // Create/update PaymentIntent whenever the total or deposit choice changes
  useEffect(() => {
    // Don't create a PaymentIntent while the choice screen is showing
    if (depositChoice === null) return;
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
            isDepositPayment: isThisDepositPayment,
            depositAmountCents: isThisDepositPayment
              ? (depositCents ?? null)
              : null,
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setClientSecret(data.clientSecret);
      } catch {
        setError("Failed to initialize payment. Please refresh and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(createPaymentIntent, 300);
    return () => clearTimeout(debounce);
  }, [
    bookingId,
    totalCents,
    tipCents,
    currency,
    isBalancePayment,
    isThisDepositPayment,
    depositCents,
    depositChoice,
  ]);

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
    const parts = value.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setCustomTipAmount(value);
  }

  // ── Deposit choice screen — shown before checkout form ──────────────────────
  if (showDepositChoice && depositChoice === null) {
    return (
      <section className={styles.container}>
        <LayoutWrapper>
          <div
            className={styles.content}
            style={{ maxWidth: 560, margin: "0 auto" }}
          >
            <div className={styles.header}>
              <h1 className={`${styles.heading} underline`}>
                How would you like to pay?
              </h1>
              <p className={styles.subtitle}>
                A deposit is required to secure your booking. You can also pay
                the full amount today.
              </p>
            </div>
            <div style={{ display: "grid", gap: "1.6rem", marginTop: "2rem" }}>
              {/* Pay deposit */}
              <button
                type='button'
                onClick={() => setDepositChoice("deposit")}
                style={{
                  textAlign: "left",
                  padding: "2rem",
                  borderRadius: 12,
                  border: "2px solid #22c55e",
                  background: "#f0fdf4",
                  cursor: "pointer",
                  display: "grid",
                  gap: "0.8rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                    Pay deposit ({depositPercent}%)
                  </span>
                  <span
                    style={{
                      fontSize: "2.4rem",
                      fontWeight: 800,
                      color: "#15803d",
                    }}
                  >
                    {formatMoney(depositCents ?? 0, currency)}
                  </span>
                </div>
                <span style={{ fontSize: "1.4rem", color: "#166534" }}>
                  Due today
                  {depositDueDate
                    ? ` · by ${formatLocalDate(depositDueDate)}`
                    : ""}
                </span>
                {balanceCents && balanceCents > 0 && (
                  <span style={{ fontSize: "1.3rem", color: "#4b7c60" }}>
                    Remaining balance of {formatMoney(balanceCents, currency)}{" "}
                    due later
                    {balanceDueDate
                      ? ` · by ${formatLocalDate(balanceDueDate)}`
                      : ""}
                  </span>
                )}
              </button>

              {/* Pay in full */}
              <button
                type='button'
                onClick={() => setDepositChoice("full")}
                style={{
                  textAlign: "left",
                  padding: "2rem",
                  borderRadius: 12,
                  border: "2px solid #e2e8f0",
                  background: "#f8fafc",
                  cursor: "pointer",
                  display: "grid",
                  gap: "0.8rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "1.6rem", fontWeight: 700 }}>
                    Pay in full
                  </span>
                  <span style={{ fontSize: "2.4rem", fontWeight: 800 }}>
                    {formatMoney(totalBookingCents, currency)}
                  </span>
                </div>
                <span style={{ fontSize: "1.4rem", color: "#64748b" }}>
                  No balance due — ride fully confirmed today
                </span>
              </button>
            </div>
          </div>
        </LayoutWrapper>
      </section>
    );
  }

  // ── Main checkout UI ─────────────────────────────────────────────────────────
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={`${styles.heading} underline`}>
              Complete Your Payment
            </h1>
            <p className={styles.subtitle}>
              {isThisDepositPayment
                ? `Paying ${depositPercent}% deposit — balance of ${formatMoney(balanceCents ?? 0, currency)} due later`
                : isBalancePayment
                  ? "Pay the remaining balance for your trip"
                  : "Secure payment for your upcoming trip"}
            </p>
            {/* Allow going back to choice screen */}
            {showDepositChoice && depositChoice !== null && (
              <button
                type='button'
                onClick={() => {
                  setDepositChoice(null);
                  setClientSecret(null);
                }}
                style={{
                  marginTop: "0.8rem",
                  fontSize: "1.3rem",
                  color: "#64748b",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                ← Change payment option
              </button>
            )}
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
                        {formatDate(pickupAt, timezone)}
                      </span>
                      <span className={styles.tripValue}>
                        {formatTime(pickupAt, timezone)}
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

                  {stops.length > 0 && (
                    <div className={styles.stopsContainer}>
                      <h2
                        className='cardTitle h5'
                        style={{ marginBottom: "2rem" }}
                      >
                        Additional Stops
                      </h2>
                      {stops.map((stop) => (
                        <div key={stop.id} className={styles.tripRow}>
                          <span className={styles.tripIcon}>
                            <span className={styles.stopBadge}>
                              {stop.stopOrder}
                            </span>
                          </span>
                          <div className={styles.tripInfo}>
                            <span className={styles.tripLabel}>
                              Stop {stop.stopOrder}
                            </span>
                            <span className={styles.tripValue}>
                              {stop.address}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.tripRow}>
                    <span className={styles.tripIcon}>🏁</span>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>Dropoff</span>
                      <span className={styles.tripValue}>{dropoffAddress}</span>
                    </div>
                  </div>

                  {stops.length > 0 && stopSurchargeCents > 0 && (
                    <div className={styles.stopsSurchargeNote}>
                      <span className={styles.stopsSurchargeIcon}>🛑</span>
                      <span>
                        {stops.length} extra stop{stops.length > 1 ? "s" : ""}{" "}
                        included
                      </span>
                      <span className={styles.stopsSurchargeAmount}>
                        +{formatMoney(stopSurchargeCents, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-trip itinerary */}
              {groupLegs.length > 1 && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className='cardTitle h5'>
                      Trip Itinerary ({groupLegs.length} Rides)
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {groupLegs.map((leg) => (
                      <div
                        key={leg.legNumber}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "28px 1fr auto",
                          gap: "10px",
                          alignItems: "start",
                          paddingBottom: 12,
                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "#000",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {leg.legNumber}
                        </div>
                        <div style={{ display: "grid", gap: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: "1.4rem" }}>
                            {leg.serviceName}
                          </span>
                          <span style={{ fontSize: "1.3rem", opacity: 0.6 }}>
                            {formatDate(leg.pickupAt, timezone)} ·{" "}
                            {formatTime(leg.pickupAt, timezone)}
                          </span>
                          <span style={{ fontSize: "1.3rem", opacity: 0.75 }}>
                            {leg.pickupAddress} → {leg.dropoffAddress}
                          </span>
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "1.4rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(leg.totalCents, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tip Selection Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className='cardTitle h5'>Add a tip for your driver</h2>
                  <p className={styles.cardSubtitle}>
                    100% of your tip goes directly to your driver
                  </p>
                </div>

                <div className={styles.tipGrid}>
                  {TIP_PRESETS.map(({ label, percent }) => {
                    const tipAmount = Math.round(
                      (effectiveBaseFareCents * percent) / 100,
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
                  {isBalancePayment && !isThisDepositPayment && (
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Previously Paid</span>
                      <span className={styles.priceValue}>
                        {formatMoney(amountPaidCents, currency)}
                      </span>
                    </div>
                  )}
                  {isThisDepositPayment && (
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>Trip Total</span>
                      <span className={styles.priceValue}>
                        {formatMoney(totalBookingCents, currency)}
                      </span>
                    </div>
                  )}
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>
                      {isThisDepositPayment
                        ? `Deposit (${depositPercent}%)`
                        : isBalancePayment
                          ? "Balance Due"
                          : "Base Fare"}
                    </span>
                    <span className={styles.priceValue}>
                      {formatMoney(effectiveBaseFareCents, currency)}
                    </span>
                  </div>
                  {isThisDepositPayment && balanceCents && balanceCents > 0 && (
                    <div className={styles.priceRow}>
                      <span className={styles.priceLabel}>
                        Balance due later
                        {balanceDueDate
                          ? ` (by ${formatLocalDate(balanceDueDate)})`
                          : ""}
                      </span>
                      <span
                        className={styles.priceValue}
                        style={{ color: "#92400e" }}
                      >
                        {formatMoney(balanceCents, currency)}
                      </span>
                    </div>
                  )}
                  {!isBalancePayment &&
                    !isThisDepositPayment &&
                    stops.length > 0 &&
                    stopSurchargeCents > 0 && (
                      <div className={styles.priceRow}>
                        <span className={styles.priceLabel}>
                          Extra Stops ({stops.length})
                        </span>
                        <span className={styles.priceValueIncluded}>
                          Included
                        </span>
                      </div>
                    )}
                  <div className={styles.priceRow}>
                    <span className={styles.priceLabel}>Driver Tip</span>
                    <span className={styles.priceValue}>
                      {tipCents > 0 ? formatMoney(tipCents, currency) : "—"}
                    </span>
                  </div>
                  <div className={styles.priceDivider} />
                  <div className={`${styles.priceRow} ${styles.priceTotal}`}>
                    <span className={styles.priceTotalLabel}>
                      {isThisDepositPayment ? "Due Today" : "Total"}
                    </span>
                    <span className={styles.priceTotalValue}>
                      {formatMoney(totalCents, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Form */}
            <div className={styles.rightColumn}>
              {/* Card on file option */}
              {savedCard?.hasCard && !savedCard.isExpired && (
                <div
                  className={styles.paymentCard}
                  style={{ marginBottom: "2rem" }}
                >
                  <div className={styles.cardHeader}>
                    <h2 className='cardTitle h5'>Pay with saved card</h2>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1.2rem",
                      padding: "1.2rem 0",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <span style={{ fontSize: "2rem" }}>💳</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "1.4rem" }}>
                          {BRAND_LABELS[savedCard.brand ?? ""] ??
                            savedCard.brand}{" "}
                          •••• {savedCard.last4}
                        </div>
                        <div style={{ fontSize: "1.3rem", opacity: 0.6 }}>
                          Expires {String(savedCard.exp_month).padStart(2, "0")}
                          /{String(savedCard.exp_year).slice(-2)}
                        </div>
                      </div>
                    </div>
                    <button
                      type='button'
                      className='goodBtnii'
                      onClick={() => setCardOnFileConfirming(true)}
                      disabled={cardOnFileCharging || cardOnFileSuccess}
                    >
                      {cardOnFileCharging
                        ? "Charging…"
                        : `Pay ${formatMoney(totalCents, currency)}`}
                    </button>
                  </div>
                  <p style={{ fontSize: "1.2rem", opacity: 0.5, margin: 0 }}>
                    Or use a different card below.
                  </p>

                  <Modal
                    isOpen={cardOnFileConfirming}
                    onClose={() => setCardOnFileConfirming(false)}
                  >
                    <div style={{ display: "grid", gap: 16, padding: 8 }}>
                      <div className='cardTitle h5'>Confirm payment</div>
                      <p className='paragraph'>
                        Charge{" "}
                        <strong>{formatMoney(totalCents, currency)}</strong> to{" "}
                        {BRAND_LABELS[savedCard.brand ?? ""] ?? savedCard.brand}{" "}
                        •••• {savedCard.last4}?
                      </p>
                      {tipCents > 0 && (
                        <p className='miniNote'>
                          Includes {formatMoney(tipCents, currency)} tip for
                          your driver.
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type='button'
                          className='secondaryBtn'
                          onClick={() => setCardOnFileConfirming(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type='button'
                          className='goodBtnii'
                          onClick={handleCardOnFileCharge}
                        >
                          Yes, pay now
                        </button>
                      </div>
                    </div>
                  </Modal>
                </div>
              )}

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
                      baseFareCents={effectiveBaseFareCents}
                      currency={currency}
                      isBalancePayment={isBalancePayment}
                      isDepositPayment={isThisDepositPayment}
                      depositAmountCents={
                        isThisDepositPayment ? (depositCents ?? null) : null
                      }
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
