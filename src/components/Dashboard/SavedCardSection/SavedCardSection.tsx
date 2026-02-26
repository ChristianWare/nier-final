"use client";

import styles from "./SavedCardSection.module.css";
import { useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  createSetupIntent,
  removeSavedCard,
} from "../../../../actions/user/savedPaymentMethod";
import { useRouter } from "next/navigation";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Button from "@/components/shared/Button/Button";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Props {
  stripePublishableKey: string;
  savedCards: SavedCard[];
}

// ── Brand helpers ──────────────────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
  unknown: "Card",
};

const BRAND_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#007bc1",
  discover: "#ff6600",
  unknown: "#6b7280",
};

function CardBrandIcon({ brand }: { brand: string }) {
  const color = BRAND_COLORS[brand] ?? BRAND_COLORS.unknown;
  return (
    <svg
      width='38'
      height='26'
      viewBox='0 0 38 26'
      fill='none'
      className={styles.brandIcon}
    >
      <rect
        width='38'
        height='26'
        rx='4'
        fill='#f8fafc'
        stroke='#e2e8f0'
        strokeWidth='1'
      />
      <rect
        x='4'
        y='9'
        width='30'
        height='5'
        rx='1'
        fill={color}
        opacity='0.12'
      />
      <rect x='4' y='9' width='11' height='5' rx='1' fill={color} />
      <circle cx='24' cy='15' r='4.5' fill={color} opacity='0.55' />
      <circle cx='28.5' cy='15' r='4.5' fill={color} opacity='0.35' />
    </svg>
  );
}

// ── Card row ───────────────────────────────────────────────────────────────────

function CardRow({
  card,
  onRemove,
  removing,
}: {
  card: SavedCard;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const brandLabel = BRAND_LABELS[card.brand] ?? "Card";
  const expMonth = String(card.exp_month).padStart(2, "0");
  const expYear = String(card.exp_year).slice(-2);

  const now = new Date();
  const expDate = new Date(card.exp_year, card.exp_month - 1, 1);
  const isExpired = expDate < new Date(now.getFullYear(), now.getMonth(), 1);

  return (
    <div
      className={`${styles.cardRow} ${isExpired ? styles.cardRowExpired : ""}`}
    >
      <CardBrandIcon brand={card.brand} />

      <div className={styles.cardInfo}>
        <span className={styles.cardLabel}>
          {brandLabel} •••• {card.last4}
        </span>
        <span
          className={`${styles.cardExpiry} ${isExpired ? styles.expiryExpired : ""}`}
        >
          {isExpired ? "Expired" : "Expires"} {expMonth}/{expYear}
        </span>
      </div>

      <div className={styles.cardRight}>
        {isExpired ? (
          <span className='badge badge_bad'>Expired</span>
        ) : (
          <span className='badge badge_good'>Active</span>
        )}
        <Button
          text={removing ? "Removing…" : "Remove"}
          btnType='redReg'
          onClick={() => onRemove(card.id)}
          disabled={removing}
        />
      </div>
    </div>
  );
}

// ── Add card form (inner — needs Stripe context) ───────────────────────────────
// useDirtyForm lives here because cardComplete state lives here.
// Dirty = user has typed valid card details but hasn't saved yet.

function AddCardForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  useDirtyForm("save-card", cardComplete && !saving, "save-card-section");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError(null);

    try {
      const result = await createSetupIntent();
      if ("error" in result) {
        setError(result.error);
        setSaving(false);
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError("Card element not found.");
        setSaving(false);
        return;
      }

      const { error: stripeError } = await stripe.confirmCardSetup(
        result.clientSecret,
        {
          payment_method: { card: cardElement },
        },
      );

      if (stripeError) {
        setError(stripeError.message ?? "Failed to save card.");
        setSaving(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.addForm}>
      <div className={styles.cardElementWrapper}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "15px",
                color: "#1a1a1a",
                fontFamily: "system-ui, sans-serif",
                "::placeholder": { color: "#9ca3af" },
              },
              invalid: { color: "#dc2626" },
            },
            hidePostalCode: false,
          }}
          onChange={(e) => setCardComplete(e.complete)}
        />
      </div>

      {error && (
        <div className={styles.formError}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div className={styles.formActions}>
        <Button
          text={saving ? "Saving…" : "Save Card"}
          type='submit'
          btnType='blackReg'
          disabled={saving || !stripe || !cardComplete}
        />
        <Button
          text='Cancel'
          type='button'
          btnType='grayReg'
          onClick={onCancel}
          disabled={saving}
        />
      </div>

      <p className={styles.secureNote}>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          className={styles.lockIcon}
        >
          <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
          <path d='M7 11V7a5 5 0 0 1 10 0v4' />
        </svg>
        Your card details are encrypted and stored securely by Stripe. We never
        store your card number.
      </p>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SavedCardSection({
  stripePublishableKey,
  savedCards: initialCards,
}: Props) {
  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>(initialCards);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const stripePromise = useMemo(
    () => loadStripe(stripePublishableKey),
    [stripePublishableKey],
  );

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleRemove(paymentMethodId: string) {
    setRemovingId(paymentMethodId);
    const fd = new FormData();
    fd.append("paymentMethodId", paymentMethodId);

    const result = await removeSavedCard(fd);

    if ("error" in result) {
      showToast("error", result.error);
    } else {
      setCards((prev) => prev.filter((c) => c.id !== paymentMethodId));
      showToast("success", "Card removed successfully.");
    }
    setRemovingId(null);
  }

  function handleAddSuccess() {
    setIsAdding(false);
    showToast("success", "Card saved successfully!");
    router.refresh();
  }

  return (
    <div className={styles.section} id='save-card-section'>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <h2 className='cardTitle h5'>Payment Methods</h2>
          <p className={styles.sectionSubtitle}>
            Save a card for faster checkout and phone bookings
          </p>
        </div>
        {!isAdding && (
          <Button
            text='+ Add Card'
            btnType='blackReg'
            onClick={() => setIsAdding(true)}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.type === "success" ? "✓" : "⚠️"} {toast.msg}
        </div>
      )}

      {/* Existing cards */}
      {cards.length > 0 && (
        <div className={styles.cardList}>
          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onRemove={handleRemove}
              removing={removingId === card.id}
            />
          ))}
        </div>
      )}

      {/* Empty state — no cards, not adding */}
      {cards.length === 0 && !isAdding && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💳</span>
          <div className={styles.emptyText}>
            <span className={styles.emptyTitle}>No card saved yet</span>
            <span className={styles.emptySub}>
              Add a card to speed up checkout and enable phone bookings
            </span>
          </div>
        </div>
      )}

      {/* Add card form */}
      {isAdding && (
        <div className={styles.addFormWrapper}>
          <p className={styles.addFormLabel}>New card</p>
          <Elements stripe={stripePromise}>
            <AddCardForm
              onSuccess={handleAddSuccess}
              onCancel={() => setIsAdding(false)}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
