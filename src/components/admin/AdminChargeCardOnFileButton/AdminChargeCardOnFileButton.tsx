"use client";

import styles from "./AdminChargeCardOnFileButton.module.css";
import { useEffect, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import toast from "react-hot-toast";
import {
  adminGetCardOnFile,
  adminChargeCardOnFile,
} from "../../../../actions/admin/chargeCardOnFile";

interface Props {
  bookingId: string;
  userId: string;
  amountCents: number;
  currency: string;
  onSuccess?: () => void | Promise<void>;
}

function centsToUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export default function AdminChargeCardOnFileButton({
  bookingId,
  userId,
  amountCents,
  currency,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [cardInfo, setCardInfo] = useState<Awaited<
    ReturnType<typeof adminGetCardOnFile>
  > | null>(null);
  const [charging, setCharging] = useState(false);
  const [charged, setCharged] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    adminGetCardOnFile(userId)
      .then(setCardInfo)
      .catch(() => setCardInfo(null))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleCharge() {
    setCharging(true);
    setConfirming(false);
    try {
      const result = await adminChargeCardOnFile({ bookingId });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setCharged(true);
      toast.success(
        `Card charged successfully — •••• ${result.last4} · $${centsToUsd(result.amountCents)}`,
      );
      if (onSuccess) await onSuccess();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCharging(false);
    }
  }

  if (loading) {
    return <p className='miniNote'>Checking for card on file…</p>;
  }

  if (!userId) {
    return (
      <p className='miniNote'>
        No user account linked to this booking. Card on file not available.
      </p>
    );
  }

  if (!cardInfo || !cardInfo.hasCard) {
    return (
      <p className='miniNote'>
        This customer has no card on file. They can save one from their{" "}
        <strong>Payments</strong> page in their dashboard.
      </p>
    );
  }

  if (cardInfo.isExpired) {
    return (
      <p className='miniNote' style={{ color: "#dc2626" }}>
        Card on file ({BRAND_LABELS[cardInfo.brand ?? ""] ?? cardInfo.brand}{" "}
        •••• {cardInfo.last4}) is expired. Ask the customer to update their
        card.
      </p>
    );
  }

  const brandLabel =
    BRAND_LABELS[cardInfo.brand ?? ""] ?? cardInfo.brand ?? "Card";
  const expMonth = String(cardInfo.exp_month ?? "").padStart(2, "0");
  const expYear = String(cardInfo.exp_year ?? "").slice(-2);

  if (charged) {
    return (
      <div className={styles.successState}>
        <span className={styles.successIcon}>✓</span>
        <div>
          <div className={styles.successTitle}>Payment successful</div>
          <div className={styles.successSub}>
            {brandLabel} •••• {cardInfo.last4} was charged $
            {centsToUsd(amountCents)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Card preview */}
      <div className={styles.cardPreview}>
        <div className={styles.cardPreviewLeft}>
          <span className={styles.cardIcon}>💳</span>
          <div>
            <div className={styles.cardLabel}>
              {brandLabel} •••• {cardInfo.last4}
            </div>
            <div className={styles.cardExpiry}>
              Expires {expMonth}/{expYear}
            </div>
          </div>
        </div>
        <span className='badge badge_good'>Active</span>
      </div>

      {/* Confirm step */}
      <button
        type='button'
        className='goodBtnii'
        onClick={() => setConfirming(true)}
        disabled={charging}
      >
        Charge {brandLabel} •••• {cardInfo.last4} · ${centsToUsd(amountCents)}
      </button>

      <Modal isOpen={confirming} onClose={() => setConfirming(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Confirm charge</div>
          <p className='paragraph'>
            Are you sure you want to charge{" "}
            <strong>
              ${centsToUsd(amountCents)} {currency.toUpperCase()}
            </strong>{" "}
            to {brandLabel} •••• {cardInfo.last4}?
          </p>
          <p className='miniNote'>
            This is an off-session charge and cannot be undone. If the card
            requires authentication it will fail — use the payment link instead.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type='button'
              className='secondaryBtn'
              onClick={() => setConfirming(false)}
              disabled={charging}
            >
              Cancel
            </button>
            <button
              type='button'
              className='goodBtnii'
              onClick={handleCharge}
              disabled={charging}
            >
              {charging ? "Charging…" : "Yes, charge card"}
            </button>
          </div>
        </div>
      </Modal>

      <p className={styles.offSessionNote}>
        This is an off-session charge. If the card requires authentication, it
        will fail — use the payment link instead.
      </p>
    </div>
  );
}
