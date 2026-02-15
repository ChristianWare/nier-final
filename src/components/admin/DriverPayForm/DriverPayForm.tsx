"use client";

import styles from "./DriverPayForm.module.css";
import { useTransition, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { updateDriverPayAction } from "../../../../actions/admin/updateDriverPayAction";
import Button from "@/components/shared/Button/Button";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

function formatMoney(cents: number, currency = "USD") {
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: string): number | null {
  const cleaned = dollars.trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

type TipDistribution = "full" | "custom" | "none";
type PayMethod = "quick" | "percent" | "amount";

export default function DriverPayForm({
  bookingId,
  currentDriverPaymentCents,
  currentDriverTipCents,
  bookingTotalCents,
  currency = "USD",
  tipCents = 0,
  hasDriver,
}: {
  bookingId: string;
  currentDriverPaymentCents: number | null;
  currentDriverTipCents: number | null;
  bookingTotalCents: number;
  currency?: string;
  tipCents?: number;
  hasDriver: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [driverPayment, setDriverPayment] = useState<string>(
    centsToDollars(currentDriverPaymentCents),
  );
  const [customPercent, setCustomPercent] = useState<string>("");
  const [payMethod, setPayMethod] = useState<PayMethod>("quick");

  // Tip distribution helper (declared before useState so it can initialize)
  function getInitialTipDistribution(): TipDistribution {
    if (currentDriverTipCents === null || currentDriverTipCents === undefined) {
      return "full";
    }
    if (currentDriverTipCents === 0) return "none";
    if (currentDriverTipCents === tipCents) return "full";
    return "custom";
  }

  const [tipDistribution, setTipDistribution] = useState<TipDistribution>(
    getInitialTipDistribution(),
  );
  const [customTipAmount, setCustomTipAmount] = useState<string>(
    currentDriverTipCents &&
      currentDriverTipCents !== tipCents &&
      currentDriverTipCents !== 0
      ? centsToDollars(currentDriverTipCents)
      : "",
  );

  // Track props to detect server-side changes (e.g. auto-adjusted driver pay)
  const [prevPropPaymentCents, setPrevPropPaymentCents] = useState(
    currentDriverPaymentCents,
  );
  const [prevPropTipCents, setPrevPropTipCents] = useState(
    currentDriverTipCents,
  );

  if (currentDriverPaymentCents !== prevPropPaymentCents) {
    setPrevPropPaymentCents(currentDriverPaymentCents);
    setDriverPayment(centsToDollars(currentDriverPaymentCents));
  }

  if (currentDriverTipCents !== prevPropTipCents) {
    setPrevPropTipCents(currentDriverTipCents);
    setTipDistribution(getInitialTipDistribution());
    setCustomTipAmount(
      currentDriverTipCents &&
        currentDriverTipCents !== tipCents &&
        currentDriverTipCents !== 0
        ? centsToDollars(currentDriverTipCents)
        : "",
    );
  }

  // Parse current input to cents
  const currentPaymentCents = dollarsToCents(driverPayment) ?? 0;

  // Calculate actual driver tip based on distribution selection
  const getDriverTipCents = (): number => {
    if (tipCents === 0) return 0;
    switch (tipDistribution) {
      case "full":
        return tipCents;
      case "none":
        return 0;
      case "custom": {
        const customCents = dollarsToCents(customTipAmount);
        return Math.min(customCents ?? 0, tipCents);
      }
      default:
        return tipCents;
    }
  };

  const driverTipCents = getDriverTipCents();
  const totalDriverEarnings = currentPaymentCents + driverTipCents;

  const isDirty =
    hasDriver &&
    isEditing &&
    ((dollarsToCents(driverPayment) ?? 0) !==
      (currentDriverPaymentCents ?? 0) ||
      driverTipCents !==
        (currentDriverTipCents ?? (tipCents > 0 ? tipCents : 0)));

  useDirtyForm("driver-pay", isDirty, "driver-pay-section");

  /* ── Helpers ── */
  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass = justSaved
    ? `${styles.form} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.form} ${styles.sectionEditing}`
      : `${styles.form} ${styles.sectionLocked}`;

  // Percentage quick buttons — includes 85%
  const percentageOptions = [
    { label: "10%", percent: 0.1 },
    { label: "20%", percent: 0.2 },
    { label: "30%", percent: 0.3 },
    { label: "50%", percent: 0.5 },
    { label: "70%", percent: 0.7 },
    { label: "85%", percent: 0.85 },
  ];

  const percentageAmounts = percentageOptions.map(({ label, percent }) => ({
    label,
    cents: Math.round(bookingTotalCents * percent),
  }));

  function setAmountFromCents(cents: number) {
    setDriverPayment((cents / 100).toFixed(2));
  }

  const handleCancel = useCallback(() => {
    setDriverPayment(centsToDollars(currentDriverPaymentCents));
    setCustomPercent("");
    setTipDistribution(getInitialTipDistribution());
    setCustomTipAmount(
      currentDriverTipCents &&
        currentDriverTipCents !== tipCents &&
        currentDriverTipCents !== 0
        ? centsToDollars(currentDriverTipCents)
        : "",
    );
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDriverPaymentCents, currentDriverTipCents, tipCents]);

  function handleSave() {
    if (!hasDriver) {
      toast.error("Assign a driver first before setting driver pay.");
      return;
    }

    const paymentCents = dollarsToCents(driverPayment);
    if (paymentCents === null || paymentCents <= 0) {
      toast.error("Enter a valid driver payment amount.");
      return;
    }

    startTransition(async () => {
      const res = await updateDriverPayAction(
        bookingId,
        paymentCents,
        driverTipCents,
      );
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Driver pay saved");
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        setIsEditing(false);
      }, 2000);
      router.refresh();
    });
  }

  // If no driver assigned, show disabled state
  if (!hasDriver) {
    return (
      <div className={styles.noDriverMessage}>
        <div className={styles.noDriverIcon}>🚗</div>
        <div className={styles.noDriverText}>
          <strong>No driver assigned yet</strong>
          <p>Assign a driver and vehicle above before setting driver pay.</p>
        </div>
      </div>
    );
  }

  /* ── Section action buttons ── */
  const renderActions = () => {
    if (justSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={isPending}
            type='button'
            text={isPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handleSave}
          />
          {!isPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Driver Pay'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  /* ── Tab definitions ── */
  const tabs: { key: PayMethod; label: string; icon: string }[] = [
    { key: "quick", label: "Quick Select", icon: "⚡" },
    { key: "percent", label: "Custom %", icon: "%" },
    { key: "amount", label: "Custom Amount", icon: "$" },
  ];

  return (
    <div className={wrapperClass}>
      {/* Driver Payment Section */}
      <div className={styles.driverPaymentSection}>
        {/* Current value display — always visible */}
        <div className={styles.currentValueDisplay}>
          <div className={styles.currentValueRow}>
            <span className='emptyTitle'>Driver Payment</span>
            <span className={styles.currentValueAmount}>
              {currentPaymentCents > 0
                ? formatMoney(currentPaymentCents, currency)
                : "—"}
            </span>
          </div>
          {bookingTotalCents > 0 && currentPaymentCents > 0 && (
            <span className='miniNote'>
              {((currentPaymentCents / bookingTotalCents) * 100).toFixed(1)}% of{" "}
              {formatMoney(bookingTotalCents, currency)} booking total
            </span>
          )}
        </div>

        {/* Segmented tab control */}
        <div className={styles.methodTabs}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type='button'
              className={`${styles.methodTab} ${payMethod === tab.key ? styles.methodTabActive : ""}`}
              onClick={() => setPayMethod(tab.key)}
              disabled={fieldsDisabled}
            >
              <span className={styles.methodTabIcon}>{tab.icon}</span>
              <span className={styles.methodTabLabel}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Panel: Quick Select ── */}
        {payMethod === "quick" && (
          <div className={styles.methodPanel}>
            {bookingTotalCents > 0 ? (
              <>
                <div className='miniNote' style={{ marginBottom: 4 }}>
                  Tap a percentage of the{" "}
                  <strong>{formatMoney(bookingTotalCents, currency)}</strong>{" "}
                  booking total
                </div>
                <div className={styles.percentageButtons}>
                  {percentageAmounts.map(({ label, cents }) => (
                    <button
                      key={label}
                      type='button'
                      className={`${styles.percentBtn} ${
                        currentPaymentCents === cents
                          ? styles.percentBtnActive
                          : ""
                      }`}
                      onClick={() => setAmountFromCents(cents)}
                      disabled={fieldsDisabled || cents === 0}
                    >
                      {label}
                      <span className={styles.percentAmount}>
                        {formatMoney(cents, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className='miniNote'>
                Booking total is $0 — use Custom Amount instead.
              </div>
            )}
          </div>
        )}

        {/* ── Panel: Custom Percentage ── */}
        {payMethod === "percent" && (
          <div className={styles.methodPanel}>
            {bookingTotalCents > 0 ? (
              <div className={styles.inputSection}>
                <label className='emptyTitle'>
                  Enter percentage of {formatMoney(bookingTotalCents, currency)}
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type='text'
                    inputMode='decimal'
                    placeholder='e.g. 65'
                    value={customPercent}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setCustomPercent(val);
                      const pct = parseFloat(val);
                      if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
                        setAmountFromCents(
                          Math.round(bookingTotalCents * (pct / 100)),
                        );
                      }
                    }}
                    disabled={fieldsDisabled}
                    className='inputBorder'
                  />
                  <span className={styles.unitLabel}>%</span>
                </div>
                <span className='miniNote'>
                  {customPercent &&
                  parseFloat(customPercent) > 0 &&
                  parseFloat(customPercent) <= 100
                    ? `${customPercent}% → ${formatMoney(Math.round(bookingTotalCents * (parseFloat(customPercent) / 100)), currency)} driver payment`
                    : "Type any percentage from 0–100"}
                </span>
              </div>
            ) : (
              <div className='miniNote'>
                Booking total is $0 — use Custom Amount instead.
              </div>
            )}
          </div>
        )}

        {/* ── Panel: Custom Amount ── */}
        {payMethod === "amount" && (
          <div className={styles.methodPanel}>
            <div className={styles.inputSection}>
              <label className='emptyTitle'>Driver payment amount</label>
              <div className={styles.inputWrapper}>
                <span className={styles.dollarSign}>$</span>
                <input
                  type='text'
                  inputMode='decimal'
                  placeholder='0.00'
                  value={driverPayment}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setDriverPayment(val);
                    setCustomPercent("");
                  }}
                  disabled={fieldsDisabled}
                  className='inputBorder'
                />
              </div>
              <span className='miniNote'>
                Enter the exact dollar amount the company pays the driver
                {bookingTotalCents > 0 && currentPaymentCents > 0
                  ? ` (${((currentPaymentCents / bookingTotalCents) * 100).toFixed(1)}% of booking)`
                  : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tip Distribution Section */}
      {tipCents > 0 && (
        <div className={styles.tipDistributionSection}>
          <div className={styles.tipDistributionHeader}>
            <span className={styles.tipDistributionIcon}>💰</span>
            <div>
              <label className='emptyTitle'>Customer Tip Distribution</label>
              <span className='miniNote' style={{ marginLeft: "1rem" }}>
                Customer tipped {formatMoney(tipCents, currency)} during
                checkout
              </span>
            </div>
          </div>

          <div className={styles.tipDistributionOptions}>
            {/* Full tip option */}
            <label
              className={`${styles.tipOption} ${tipDistribution === "full" ? styles.tipOptionActive : ""}`}
            >
              <input
                type='radio'
                name='tipDistribution'
                value='full'
                checked={tipDistribution === "full"}
                onChange={() => setTipDistribution("full")}
                disabled={fieldsDisabled}
                className={styles.tipRadio}
              />
              <div className={styles.tipOptionContent}>
                <span className={styles.tipOptionLabel}>Full Tip</span>
                <span className={styles.tipOptionAmount}>
                  {formatMoney(tipCents, currency)}
                </span>
                <span className={styles.tipOptionDesc}>
                  Driver receives the entire tip
                </span>
              </div>
            </label>

            {/* Custom amount option */}
            <label
              className={`${styles.tipOption} ${tipDistribution === "custom" ? styles.tipOptionActive : ""}`}
            >
              <input
                type='radio'
                name='tipDistribution'
                value='custom'
                checked={tipDistribution === "custom"}
                onChange={() => setTipDistribution("custom")}
                disabled={fieldsDisabled}
                className={styles.tipRadio}
              />
              <div className={styles.tipOptionContent}>
                <span className={styles.tipOptionLabel}>Custom Amount</span>
                {tipDistribution === "custom" && (
                  <div className={styles.customTipInput}>
                    <span className={styles.dollarSign}>$</span>
                    <input
                      type='text'
                      inputMode='decimal'
                      placeholder='0.00'
                      value={customTipAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setCustomTipAmount(val);
                      }}
                      disabled={fieldsDisabled}
                      className='inputBorder'
                      style={{ width: "100px" }}
                    />
                    <span className={styles.tipMaxNote}>
                      max {formatMoney(tipCents, currency)}
                    </span>
                  </div>
                )}
                <span className={styles.tipOptionDesc}>
                  Specify how much of the tip goes to driver
                </span>
              </div>
            </label>

            {/* No tip option */}
            <label
              className={`${styles.tipOption} ${tipDistribution === "none" ? styles.tipOptionActive : ""}`}
            >
              <input
                type='radio'
                name='tipDistribution'
                value='none'
                checked={tipDistribution === "none"}
                onChange={() => setTipDistribution("none")}
                disabled={fieldsDisabled}
                className={styles.tipRadio}
              />
              <div className={styles.tipOptionContent}>
                <span className={styles.tipOptionLabel}>No Tip to Driver</span>
                <span className={styles.tipOptionAmount}>$0.00</span>
                <span className={styles.tipOptionDesc}>
                  Company retains the full tip
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Driver Earnings Summary Card */}
      <div className={styles.driverEarningsCard}>
        <div className={styles.earningsHeader}>
          <span className={styles.earningsIcon}>💵</span>
          <span className={styles.earningsTitle}>Driver Earnings Summary</span>
        </div>

        <div className={styles.earningsBreakdown}>
          {/* Company Payment Row */}
          <div className={styles.earningsRow}>
            <span className={styles.earningsLabel}>Company Payment</span>
            <span className={styles.earningsValue}>
              {currentPaymentCents > 0
                ? formatMoney(currentPaymentCents, currency)
                : "—"}
            </span>
          </div>

          {/* Customer Tip Row */}
          <div className={styles.earningsRow}>
            <span className={styles.earningsLabel}>
              Driver Tip
              {tipCents > 0 && driverTipCents < tipCents && (
                <span className={styles.tipBadgeReduced}>
                  {driverTipCents === 0 ? "Not included" : "Partial"}
                </span>
              )}
              {tipCents > 0 && driverTipCents === tipCents && (
                <span className={styles.tipBadge}>Full tip</span>
              )}
            </span>
            <span
              className={`${styles.earningsValue} ${driverTipCents > 0 ? styles.tipValue : ""}`}
            >
              {driverTipCents > 0 ? formatMoney(driverTipCents, currency) : "—"}
            </span>
          </div>

          {/* Show company retained tip if applicable */}
          {tipCents > 0 && driverTipCents < tipCents && (
            <div className={`${styles.earningsRow} ${styles.earningsRowMuted}`}>
              <span className={styles.earningsLabel}>Company Retains</span>
              <span className={styles.earningsValue}>
                {formatMoney(tipCents - driverTipCents, currency)}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className={styles.earningsDivider} />

          {/* Total Row */}
          <div className={`${styles.earningsRow} ${styles.earningsTotalRow}`}>
            <span className={styles.earningsTotalLabel}>
              Total Driver Earnings
            </span>
            <span className={styles.earningsTotalValue}>
              {totalDriverEarnings > 0
                ? formatMoney(totalDriverEarnings, currency)
                : "—"}
            </span>
          </div>
        </div>

        {/* Tip notes */}
        {tipCents > 0 && driverTipCents === tipCents && (
          <div className={styles.tipNote}>
            💡 The driver will receive the full{" "}
            {formatMoney(tipCents, currency)} tip from the customer.
          </div>
        )}

        {tipCents > 0 && driverTipCents > 0 && driverTipCents < tipCents && (
          <div className={styles.tipNotePartial}>
            ℹ️ The driver will receive {formatMoney(driverTipCents, currency)}{" "}
            of the {formatMoney(tipCents, currency)} customer tip. The company
            retains {formatMoney(tipCents - driverTipCents, currency)}.
          </div>
        )}

        {tipCents > 0 && driverTipCents === 0 && (
          <div className={styles.tipNoteNone}>
            ⚠️ The driver will not receive any of the{" "}
            {formatMoney(tipCents, currency)} customer tip. The company retains
            the full amount.
          </div>
        )}

        {tipCents === 0 && (
          <div className={styles.noTipNote}>
            No customer tip was added during checkout.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {renderActions()}
    </div>
  );
}
