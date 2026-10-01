"use client";

import styles from "./AdminChargeCardOnFileButton.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/shared/Modal/Modal";
import toast from "react-hot-toast";
import {
  adminChargeCardOnFile,
  adminGetCardOnFileQuote,
  type CardOnFileQuote,
} from "../../../../actions/admin/chargeCardOnFile";
import { getSavedCardForBooking } from "../../../../actions/payments/chargeCardOnFileForCheckout";

interface Props {
  bookingId: string;
  onSuccess?: () => void | Promise<void>;
}

type SavedCard = Awaited<ReturnType<typeof getSavedCardForBooking>>;

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

// The Stripe webhook records the payment a moment after the charge succeeds.
const RECORD_POLL_MS = 1000;
const RECORD_POLL_TRIES = 10;

export default function AdminChargeCardOnFileButton({
  bookingId,
  onSuccess,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cardInfo, setCardInfo] = useState<SavedCard | null>(null);
  // The amount comes from the server, from the same calculation the charge
  // uses. The button never trusts a number handed down by the page.
  const [quote, setQuote] = useState<CardOnFileQuote | null>(null);
  const [charging, setCharging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [charged, setCharged] = useState<{
    amountCents: number;
    last4: string;
    recorded: boolean | null; // null = still waiting on Stripe
  } | null>(null);

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadQuote = useCallback(async (): Promise<CardOnFileQuote | null> => {
    try {
      const res = await adminGetCardOnFileQuote(bookingId);
      return "error" in res ? null : res;
    } catch {
      return null;
    }
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getSavedCardForBooking(bookingId).catch(() => null),
      loadQuote(),
    ])
      .then(([card, q]) => {
        if (cancelled) return;
        setCardInfo(card);
        setQuote(q);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId, loadQuote]);

  async function waitUntilRecorded(balanceBefore: number): Promise<boolean> {
    for (let i = 0; i < RECORD_POLL_TRIES; i++) {
      await new Promise((resolve) => setTimeout(resolve, RECORD_POLL_MS));
      if (!alive.current) return false;
      const fresh = await loadQuote();
      if (fresh && fresh.balanceCents < balanceBefore) {
        if (alive.current) setQuote(fresh);
        // The webhook updates the trip record just after the ride's payment
        // record. Give it that beat so the refreshed page shows the end state.
        await new Promise((resolve) => setTimeout(resolve, RECORD_POLL_MS));
        return true;
      }
    }
    return false;
  }

  async function handleCharge() {
    if (!quote || charging) return;
    setCharging(true);
    setConfirming(false);
    let didCharge = false;
    try {
      const result = await adminChargeCardOnFile({
        bookingId,
        expectedAmountCents: quote.balanceCents,
      });

      if ("error" in result) {
        toast.error(result.error);
        // The amount owed changed since this button was drawn. Show the new
        // amount and make the admin confirm it again.
        if (typeof result.amountDueCents === "number") {
          const fresh = await loadQuote();
          if (alive.current && fresh) setQuote(fresh);
        }
        return;
      }

      didCharge = true;
      setCharged({
        amountCents: result.amountCents,
        last4: result.last4,
        recorded: null,
      });
      toast.success(
        `Card charged successfully — •••• ${result.last4} · $${centsToUsd(result.amountCents)}`,
      );

      const recorded = await waitUntilRecorded(quote.balanceCents);
      if (alive.current) {
        setCharged((c) => (c ? { ...c, recorded } : c));
      }
      router.refresh();
      if (onSuccess) await onSuccess();
    } catch {
      if (!didCharge) {
        toast.error(
          "We couldn't confirm whether the card was charged. Refresh this page and check before trying again.",
        );
      } else if (alive.current) {
        // The charge went through; only the follow-up refresh failed.
        setCharged((c) =>
          c && c.recorded === null ? { ...c, recorded: false } : c,
        );
      }
    } finally {
      if (alive.current) setCharging(false);
    }
  }

  if (loading) {
    return <p className='miniNote'>Checking for card on file…</p>;
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
            {brandLabel} •••• {charged.last4} was charged $
            {centsToUsd(charged.amountCents)}
          </div>
          {charged.recorded === null && (
            <div className={styles.successSub}>
              Recording the payment on the booking…
            </div>
          )}
          {charged.recorded === false && (
            <div className={styles.successSub}>
              Stripe is still posting this payment to the booking. Refresh in a
              minute. Do not charge again.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <p className='miniNote' style={{ color: "#dc2626" }}>
        Couldn&apos;t load the amount due for this booking. Refresh the page —
        the card can&apos;t be charged until the amount is confirmed.
      </p>
    );
  }

  const what = quote.isGroup ? "trip" : "booking";

  if (quote.totalCents <= 0) {
    return (
      <p className='miniNote'>
        Set and approve a price before charging the card on file.
      </p>
    );
  }

  if (quote.balanceCents <= 0) {
    return (
      <p className='miniNote'>
        Nothing to charge. This {what} is paid in full.
      </p>
    );
  }

  const amount = `$${centsToUsd(quote.balanceCents)}`;
  const tripLabel = `${quote.rideCount}-ride trip`;

  // One line explaining what the amount is, whenever it isn't simply
  // "the full price of this one ride".
  let context: string | null = null;
  if (quote.paidCents > 0) {
    context = `Remaining balance${quote.isGroup ? ` for this ${tripLabel}` : ""}: $${centsToUsd(quote.paidCents)} of $${centsToUsd(quote.totalCents)} already paid.`;
  } else if (quote.isGroup) {
    context = `Full total for this ${tripLabel}.`;
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

      {context && <p className='miniNote'>{context}</p>}

      {/* Confirm step */}
      <button
        type='button'
        className='goodBtnii'
        onClick={() => setConfirming(true)}
        disabled={charging}
      >
        {charging
          ? "Charging…"
          : `Charge ${brandLabel} •••• ${cardInfo.last4} · ${amount}`}
      </button>

      <Modal isOpen={confirming} onClose={() => setConfirming(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className='cardTitle h5'>Confirm charge</div>
          <p className='paragraph'>
            Are you sure you want to charge{" "}
            <strong>
              {amount} {quote.currency.toUpperCase()}
            </strong>{" "}
            to {brandLabel} •••• {cardInfo.last4}?
          </p>
          {context && <p className='miniNote'>{context}</p>}
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
