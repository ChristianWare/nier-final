"use client";

import styles from "./AdminSaveCardForUser.module.css";
import { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Modal from "@/components/shared/Modal/Modal";
import {
  adminCreateSetupIntentForUser,
  adminRemoveCardForUser,
} from "../../../../actions/admin/adminManageUserCard";

// ── Types ────────────────────────────────────────────────────────────────────

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Props {
  userId: string;
  stripePublishableKey: string;
  initialCards: SavedCard[];
}

// ── Brand helpers ─────────────────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

const BRAND_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#007bc1",
  discover: "#ff6600",
};

function CardIcon({ brand }: { brand: string }) {
  const color = BRAND_COLORS[brand] ?? "#6b7280";
  return (
    <svg
      width='36'
      height='24'
      viewBox='0 0 36 24'
      fill='none'
      style={{ borderRadius: 4, border: "1px solid #e5e7eb", flexShrink: 0 }}
    >
      <rect width='36' height='24' rx='4' fill='#f9fafb' />
      <rect
        x='4'
        y='8'
        width='28'
        height='4'
        rx='1'
        fill={color}
        opacity='0.15'
      />
      <rect x='4' y='8' width='10' height='4' rx='1' fill={color} />
      <circle cx='22' cy='14' r='4' fill={color} opacity='0.6' />
      <circle cx='26' cy='14' r='4' fill={color} opacity='0.4' />
    </svg>
  );
}

function isExpired(exp_month: number, exp_year: number): boolean {
  const now = new Date();
  return (
    new Date(exp_year, exp_month - 1, 1) <
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
}

// ── Add card inner form (needs Stripe context) ────────────────────────────────

function AddCardForm({
  userId,
  onSaved,
  onCancel,
}: {
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  useDirtyForm(
    "admin-save-card-for-user",
    cardComplete && !saving,
    "admin-save-card-section",
  );

  async function handleSave() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setSaving(true);
    try {
      const result = await adminCreateSetupIntentForUser({ userId });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const { error: stripeError } = await stripe.confirmCardSetup(
        result.clientSecret,
        { payment_method: { card } },
      );

      if (stripeError) {
        toast.error(stripeError.message ?? "Failed to save card.");
        return;
      }

      toast.success("Card saved successfully.");
      onSaved();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.addCardForm} id='admin-save-card-section'>
      <div className={styles.stripeField}>
        <CardElement
          options={{ hidePostalCode: false }}
          onChange={(e) => setCardComplete(e.complete)}
        />
      </div>
      <div className={styles.formActions}>
        <button
          type='button'
          className='secondaryBtn'
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type='button'
          className='primaryBtn'
          onClick={handleSave}
          disabled={!stripe || !elements || !cardComplete || saving}
        >
          {saving ? "Saving…" : "Save card"}
        </button>
      </div>
      <p className={styles.adminNote}>
        This card will be saved to the customer&apos;s Stripe account and can be
        charged off-session.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminSaveCardForUser({
  userId,
  stripePublishableKey,
  initialCards,
}: Props) {
  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>(initialCards);
  const [showAddForm, setShowAddForm] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SavedCard | null>(null);
  const [removing, setRemoving] = useState(false);

  const [stripePromise] = useState(() =>
    stripePublishableKey ? loadStripe(stripePublishableKey) : null,
  );

  const handleSaved = useCallback(() => {
    setShowAddForm(false);
    router.refresh();
  }, [router]);

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const result = await adminRemoveCardForUser({
        userId,
        paymentMethodId: removeTarget.id,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setCards((prev) => prev.filter((c) => c.id !== removeTarget.id));
      setRemoveTarget(null);
      toast.success("Card removed.");
      router.refresh();
    } catch {
      toast.error("Failed to remove card.");
    } finally {
      setRemoving(false);
    }
  }

  if (!stripePromise) {
    return (
      <p className='miniNote' style={{ color: "rgba(180,0,0,0.85)" }}>
        Missing <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.
      </p>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Existing cards */}
      {cards.length === 0 && !showAddForm && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💳</span>
          <div className={styles.emptyText}>
            <span className={styles.emptyTitle}>No card on file</span>
            <span className={styles.emptyNote}>
              Add a card on behalf of this customer
            </span>
          </div>
        </div>
      )}

      {cards.length > 0 && (
        <div className={styles.cardList}>
          {cards.map((card) => {
            const expired = isExpired(card.exp_month, card.exp_year);
            const brandLabel = BRAND_LABELS[card.brand] ?? "Card";
            const expMonth = String(card.exp_month).padStart(2, "0");
            const expYear = String(card.exp_year).slice(-2);

            return (
              <div key={card.id} className={styles.cardRow}>
                <CardIcon brand={card.brand} />
                <div className={styles.cardInfo}>
                  <span className={styles.cardLabel}>
                    {brandLabel} •••• {card.last4}
                  </span>
                  <span
                    className={`${styles.cardExpiry} ${expired ? styles.expired : ""}`}
                  >
                    {expired ? "Expired" : "Expires"} {expMonth}/{expYear}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  {expired ? (
                    <span className='badge badge_bad'>Expired</span>
                  ) : (
                    <span className='badge badge_good'>Active</span>
                  )}
                  <button
                    type='button'
                    className='redBtn'
                    onClick={() => setRemoveTarget(card)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add card form */}
      {showAddForm ? (
        <Elements
          stripe={stripePromise}
          options={{ appearance: { theme: "stripe" }, loader: "auto" }}
        >
          <AddCardForm
            userId={userId}
            onSaved={handleSaved}
            onCancel={() => setShowAddForm(false)}
          />
        </Elements>
      ) : (
        <button
          type='button'
          className='primaryBtn'
          onClick={() => setShowAddForm(true)}
          style={{ marginTop: cards.length > 0 ? 12 : 0 }}
        >
          {cards.length > 0 ? "Add another card" : "Add card"}
        </button>
      )}

      {/* Remove confirmation modal */}
      <Modal
        isOpen={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
      >
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Remove card?</div>
          <p className='paragraph'>
            Are you sure you want to remove{" "}
            <strong>
              {BRAND_LABELS[removeTarget?.brand ?? ""] ?? "Card"} ••••{" "}
              {removeTarget?.last4}
            </strong>{" "}
            from this customer&apos;s account? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type='button'
              className='secondaryBtn'
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
            >
              Cancel
            </button>
            <button
              type='button'
              className='primaryBtn'
              style={{ background: "rgba(180,0,0,0.85)" }}
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "Removing…" : "Yes, remove card"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
