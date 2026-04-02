"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createPaymentLinkAndEmail } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import styles from "./SendPaymentLinkButton.module.css";

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type LinkType = "full" | "deposit" | "balance";

type SentEvent = {
  sentAt: string;
  recipientEmail: string | null;
  amountCents?: number | null;
  isDeposit?: boolean;
  isBalance?: boolean;
};

type Props = {
  bookingId: string;
  totalCents: number;
  amountPaidCents: number;
  currency: string;
  isApproved?: boolean;
  customerEmail: string | null;
  // Deposit
  depositMode?: boolean;
  depositCents?: number | null;
  depositDueDate?: string | null; // ISO string
  balanceDueDate?: string | null;
  // History
  paymentLinkSentEvents?: SentEvent[];
};

export default function SendPaymentLinkButton({
  bookingId,
  totalCents,
  amountPaidCents,
  currency,
  isApproved = true,
  customerEmail,
  depositMode = false,
  depositCents,
  depositDueDate,
  balanceDueDate,
  paymentLinkSentEvents = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [modalLinkType, setModalLinkType] = useState<LinkType>("full");

  const effectiveDepositCents = depositCents ?? 0;
  const balanceDueCents = totalCents - amountPaidCents;
  const isDepositPaid =
    depositMode &&
    effectiveDepositCents > 0 &&
    amountPaidCents >= effectiveDepositCents;
  const isFullyPaid = amountPaidCents >= totalCents && totalCents > 0;
  // How much remains after the deposit is paid
  const balanceAfterDeposit = totalCents - effectiveDepositCents;

  function openModal(type: LinkType) {
    setModalLinkType(type);
    setOverrideEmail("");
    setOverrideError(null);
    setShowModal(true);
  }

  function sendLink(type: LinkType, emailOverride?: string) {
    const fd = new FormData();
    fd.append("bookingId", bookingId);

    if (type === "deposit") {
      fd.append("isDepositPayment", "true");
      fd.append("depositAmountCents", String(effectiveDepositCents));
    } else if (type === "balance") {
      fd.append("isBalancePayment", "true");
    }

    if (emailOverride) fd.append("overrideEmail", emailOverride);

    startTransition(async () => {
      const result = await createPaymentLinkAndEmail(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const target = emailOverride || customerEmail || "client";
      const amountLabel =
        type === "deposit"
          ? formatMoney(effectiveDepositCents, currency)
          : type === "balance"
            ? formatMoney(balanceDueCents, currency)
            : formatMoney(totalCents, currency);
      const typeLabel =
        type === "deposit"
          ? "Deposit"
          : type === "balance"
            ? "Balance"
            : "Payment";

      toast.success(`${typeLabel} link sent to ${target} (${amountLabel})`);
      setShowModal(false);
      setOverrideEmail("");
      router.refresh();
    });
  }

  function handleModalSend() {
    setOverrideError(null);
    const email = overrideEmail.trim();
    if (!email) {
      setOverrideError("Please enter an email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setOverrideError("Please enter a valid email address.");
      return;
    }
    sendLink(modalLinkType, email);
  }

  // ── Not approved ────────────────────────────────────────────────────────────
  if (!isApproved) {
    return (
      <div className={styles.notApprovedBanner}>
        <strong>⚠️ Booking not approved</strong>
        <p>
          Approve this booking before sending a payment link. See the Approval
          section above.
        </p>
      </div>
    );
  }

  // ── Fully paid ──────────────────────────────────────────────────────────────
  if (isFullyPaid) {
    return (
      <div className={styles.fullyPaidWrapper}>
        <Button
          disabled
          type="button"
          text="✓ Fully paid"
          btnType="greenReg"
          onClick={() => {}}
        />
        <a
          href={`/pay/${bookingId}/success?already_paid=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="backBtn"
          style={{ display: "inline-block", fontSize: "1.4rem" }}
        >
          View payment success page →
        </a>
      </div>
    );
  }

  // Derived display flags
  const showDepositSection = depositMode && !isDepositPaid;
  const showBalanceSection = depositMode && isDepositPaid && balanceDueCents > 0;
  const showFullSection = !depositMode;

  // For non-deposit bookings that have a partial payment
  const showNonDepositBalanceBanner =
    !depositMode && amountPaidCents > 0 && balanceDueCents > 0;

  // Modal title + amount based on type
  const modalTitle =
    modalLinkType === "deposit"
      ? `Send deposit link — ${formatMoney(effectiveDepositCents, currency)}`
      : modalLinkType === "balance"
        ? `Send balance link — ${formatMoney(balanceDueCents, currency)}`
        : `Send payment link — ${formatMoney(totalCents, currency)}`;

  return (
    <div className={styles.container}>
      {/* Customer email */}
      {customerEmail && (
        <div className={styles.emailDisplay}>
          <span className={styles.emailLabel}>Customer email:</span>
          <span className={styles.emailValue}>
            {customerEmail.toLowerCase()}
          </span>
        </div>
      )}

      {/* ── DEPOSIT section ───────────────────────────────────────────────── */}
      {showDepositSection && (
        <div className={styles.linkSection}>
          <div className={styles.linkSectionHeader}>
            <span className={styles.linkSectionTitle}>Deposit required</span>
            {depositDueDate && (
              <span className="badge badge_warn" style={{ fontSize: "1.2rem" }}>
                Due {formatDate(depositDueDate)}
              </span>
            )}
          </div>

          <div className={styles.amountStack}>
            <div className={styles.amountMain}>
              {formatMoney(effectiveDepositCents, currency)}
            </div>
            {balanceAfterDeposit > 0 && (
              <div className={styles.amountSub}>
                +{formatMoney(balanceAfterDeposit, currency)} balance remaining
                after
                {balanceDueDate ? ` · due ${formatDate(balanceDueDate)}` : ""}
              </div>
            )}
          </div>

          <div className={styles.btnGroup}>
            <Button
              btnType="greenReg"
              text={isPending ? "Sending..." : "Email deposit link to client"}
              disabled={isPending}
              onClick={() => sendLink("deposit")}
              type="button"
            />
            <Button
              btnType="blackReg"
              text="Send to different email"
              disabled={isPending}
              onClick={() => openModal("deposit")}
              type="button"
            />
          </div>

          <div className={styles.orDivider}>
            <span className={styles.orText}>
              or send full payment link instead
            </span>
          </div>

          <Button
            btnType="blueReg"
            text={`Email full link (${formatMoney(totalCents, currency)})`}
            disabled={isPending}
            onClick={() => sendLink("full")}
            type="button"
          />
        </div>
      )}

      {/* ── BALANCE section — deposit already paid ────────────────────────── */}
      {showBalanceSection && (
        <div className={styles.linkSection}>
          <div className={styles.depositPaidBadge}>
            <span>✓ Deposit received</span>
            <span className={styles.depositPaidAmount}>
              {formatMoney(amountPaidCents, currency)}
            </span>
          </div>

          <div className={styles.linkSectionHeader}>
            <span className={styles.linkSectionTitle}>Balance due</span>
            {balanceDueDate && (
              <span className="badge badge_warn" style={{ fontSize: "1.2rem" }}>
                Due {formatDate(balanceDueDate)}
              </span>
            )}
          </div>

          <div className={styles.amountStack}>
            <div className={styles.amountMain}>
              {formatMoney(balanceDueCents, currency)}
            </div>
          </div>

          <div className={styles.btnGroup}>
            <Button
              btnType="greenReg"
              text={isPending ? "Sending..." : "Email balance link to client"}
              disabled={isPending}
              onClick={() => sendLink("balance")}
              type="button"
            />
            <Button
              btnType="blackReg"
              text="Send to different email"
              disabled={isPending}
              onClick={() => openModal("balance")}
              type="button"
            />
          </div>
        </div>
      )}

      {/* ── FULL PAYMENT section — no deposit mode ───────────────────────── */}
      {showFullSection && (
        <div className={styles.linkSection}>
          {showNonDepositBalanceBanner && (
            <div className={styles.balanceBanner}>
              <strong>Balance due:</strong>{" "}
              {formatMoney(balanceDueCents, currency)}
              <span style={{ opacity: 0.8, marginLeft: 6 }}>
                (Paid: {formatMoney(amountPaidCents, currency)} of{" "}
                {formatMoney(totalCents, currency)})
              </span>
            </div>
          )}
          <div className={styles.btnGroup}>
            <Button
              btnType="greenReg"
              text={
                isPending
                  ? "Sending..."
                  : showNonDepositBalanceBanner
                    ? `Email balance link (${formatMoney(balanceDueCents, currency)})`
                    : `Email payment link to client (${formatMoney(totalCents, currency)})`
              }
              disabled={isPending}
              onClick={() =>
                sendLink(showNonDepositBalanceBanner ? "balance" : "full")
              }
              type="button"
            />
            <Button
              btnType="blackReg"
              text="Send to different email"
              disabled={isPending}
              onClick={() =>
                openModal(showNonDepositBalanceBanner ? "balance" : "full")
              }
              type="button"
            />
          </div>
        </div>
      )}

      {/* ── Sent history ──────────────────────────────────────────────────── */}
      {paymentLinkSentEvents.length > 0 && (
        <div className={styles.sentHistory}>
          <div className={styles.sentHistoryTitle}>Payment link history</div>
          {paymentLinkSentEvents.map((e, i) => (
            <div key={i} className={styles.sentHistoryRow}>
              <div className={styles.sentHistoryLeft}>
                <span className={styles.sentHistoryEmail}>
                  {e.recipientEmail ?? "unknown"}
                </span>
                {e.isDeposit && (
                  <span
                    className={`badge badge_warn ${styles.sentHistoryBadge}`}
                  >
                    Deposit
                  </span>
                )}
                {e.isBalance && (
                  <span
                    className={`badge badge_accent ${styles.sentHistoryBadge}`}
                  >
                    Balance
                  </span>
                )}
                {!e.isDeposit && !e.isBalance && (
                  <span
                    className={`badge badge_good ${styles.sentHistoryBadge}`}
                  >
                    Full
                  </span>
                )}
                {e.amountCents != null && (
                  <span className={styles.sentHistoryAmount}>
                    {formatMoney(e.amountCents, currency)}
                  </span>
                )}
              </div>
              <span className={styles.sentHistoryDate}>
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(e.sentAt))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Alternate email modal ──────────────────────────────────────────── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div style={{ display: "grid", gap: 16, padding: 8 }}>
          <div className="cardTitle h5">{modalTitle}</div>
          <p className="miniNote">
            The link will be sent to this address instead of{" "}
            {customerEmail
              ? customerEmail.toLowerCase()
              : "the customer's email on file"}
            .
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type="email"
              value={overrideEmail}
              onChange={(e) => {
                setOverrideEmail(e.target.value);
                setOverrideError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleModalSend();
              }}
              placeholder="Enter email address..."
              className="input emptySmall"
              autoFocus
              style={{
                borderColor: overrideError ? "rgba(180,0,0,0.6)" : undefined,
              }}
            />
            {overrideError && (
              <p style={{ color: "#c00", fontSize: "1.4rem", margin: 0 }}>
                {overrideError}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="secondaryBtn"
              onClick={() => setShowModal(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="goodBtnii"
              onClick={handleModalSend}
              disabled={isPending}
            >
              {isPending ? "Sending..." : "Send link"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}