"use client";

import styles from "./PriceForm.module.css";
import { useTransition, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { updateBookingPrice } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

function formatCentsToDollars(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

function parseDollarsToCents(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

function formatInputValue(value: string): string {
  if (!value || value === "$") return value;
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  let formatted = parts[0];
  if (parts.length > 1) {
    formatted += "." + parts[1].slice(0, 2);
  }
  const [intPart, decPart] = formatted.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + withCommas + (decPart !== undefined ? "." + decPart : "");
}

type FormState = {
  _propsSubtotal: number;
  _propsFees: number;
  _propsTaxes: number;
  _propsTotal: number;
  subtotal: string;
  fees: string;
  taxes: string;
  total: string;
};

export default function PriceForm({
  bookingId,
  currency,
  subtotalCents,
  feesCents,
  taxesCents,
  totalCents,
  extraAction,
}: {
  bookingId: string;
  currency: string;
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
  extraAction?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [state, setState] = useState<FormState>(() => ({
    _propsSubtotal: subtotalCents,
    _propsFees: feesCents,
    _propsTaxes: taxesCents,
    _propsTotal: totalCents,
    subtotal: formatCentsToDollars(subtotalCents),
    fees: formatCentsToDollars(feesCents),
    taxes: formatCentsToDollars(taxesCents),
    total: formatCentsToDollars(totalCents),
  }));

  const isDirty =
    isEditing &&
    (parseDollarsToCents(state.subtotal) !== subtotalCents ||
      parseDollarsToCents(state.fees) !== feesCents ||
      parseDollarsToCents(state.taxes) !== taxesCents ||
      parseDollarsToCents(state.total) !== totalCents);

  useDirtyForm("price-form", isDirty);

  // Detect if props changed (e.g., after router.refresh()) and reset state
  if (
    subtotalCents !== state._propsSubtotal ||
    feesCents !== state._propsFees ||
    taxesCents !== state._propsTaxes ||
    totalCents !== state._propsTotal
  ) {
    setState({
      _propsSubtotal: subtotalCents,
      _propsFees: feesCents,
      _propsTaxes: taxesCents,
      _propsTotal: totalCents,
      subtotal: formatCentsToDollars(subtotalCents),
      fees: formatCentsToDollars(feesCents),
      taxes: formatCentsToDollars(taxesCents),
      total: formatCentsToDollars(totalCents),
    });
  }

  /* ── Helpers ── */
  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass = justSaved
    ? `${styles.form} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.form} ${styles.sectionEditing}`
      : `${styles.form} ${styles.sectionLocked}`;

  const resetToProps = useCallback(() => {
    setState({
      _propsSubtotal: subtotalCents,
      _propsFees: feesCents,
      _propsTaxes: taxesCents,
      _propsTotal: totalCents,
      subtotal: formatCentsToDollars(subtotalCents),
      fees: formatCentsToDollars(feesCents),
      taxes: formatCentsToDollars(taxesCents),
      total: formatCentsToDollars(totalCents),
    });
  }, [subtotalCents, feesCents, taxesCents, totalCents]);

  function handleCancel() {
    resetToProps();
    setIsEditing(false);
  }

  function handleChange(
    name: "subtotal" | "fees" | "taxes" | "total",
    value: string,
  ) {
    const formatted = formatInputValue(value);

    if (name === "total") {
      setState((prev) => ({ ...prev, total: formatted }));
      return;
    }

    setState((prev) => {
      const next = { ...prev, [name]: formatted };
      const sub = parseDollarsToCents(next.subtotal);
      const fee = parseDollarsToCents(next.fees);
      const tax = parseDollarsToCents(next.taxes);
      next.total = formatCentsToDollars(sub + fee + tax);
      return next;
    });
  }

  function handleBlur(name: "subtotal" | "fees" | "taxes" | "total") {
    const cents = parseDollarsToCents(state[name]);
    setState((prev) => ({ ...prev, [name]: formatCentsToDollars(cents) }));
  }

  function handleSave() {
    const fd = new FormData();
    fd.set("bookingId", bookingId);
    fd.set("currency", currency);
    fd.set("subtotalCents", String(parseDollarsToCents(state.subtotal)));
    fd.set("feesCents", String(parseDollarsToCents(state.fees)));
    fd.set("taxesCents", String(parseDollarsToCents(state.taxes)));
    fd.set("totalCents", String(parseDollarsToCents(state.total)));

    startTransition(() => {
      updateBookingPrice(fd).then((res) => {
        if (res?.error) return toast.error(res.error);
        toast.success("Price updated successfully");

        // Notify admin if driver pay was auto-adjusted
        if (res?.driverPayAdjustment) {
          const adj = res.driverPayAdjustment;
          const oldPay = (adj.oldDriverPayCents / 100).toFixed(2);
          const newPay = (adj.newDriverPayCents / 100).toFixed(2);
          toast.success(
            `Driver pay automatically adjusted from $${oldPay} to $${newPay} (${adj.percentage}%)`,
            { duration: 5000 },
          );
        }
        setJustSaved(true);
        setTimeout(() => {
          setJustSaved(false);
          setIsEditing(false);
        }, 2000);
        router.refresh();
      });
    });
  }

  /* ── Section action buttons ── */
  const renderActions = () => {
    if (justSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          {extraAction}
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          {extraAction}
          <Button
            text={isPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            type='button'
            disabled={isPending}
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
        {extraAction}
        <Button
          text='Edit Price'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  return (
    <div className={wrapperClass}>
      <Grid2>
        <Field
          label='Subtotal'
          name='subtotal'
          value={state.subtotal}
          onChange={(v) => handleChange("subtotal", v)}
          onBlur={() => handleBlur("subtotal")}
          disabled={fieldsDisabled}
        />
        <Field
          label='Fees'
          name='fees'
          value={state.fees}
          onChange={(v) => handleChange("fees", v)}
          onBlur={() => handleBlur("fees")}
          disabled={fieldsDisabled}
        />
      </Grid2>

      <Grid2>
        <Field
          label='Taxes'
          name='taxes'
          value={state.taxes}
          onChange={(v) => handleChange("taxes", v)}
          onBlur={() => handleBlur("taxes")}
          disabled={fieldsDisabled}
        />
        <Field
          label='Total'
          name='total'
          value={state.total}
          onChange={(v) => handleChange("total", v)}
          onBlur={() => handleBlur("total")}
          disabled={fieldsDisabled}
          highlight
        />
      </Grid2>

      <div className='sectionDivider' />

      {renderActions()}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid2}>{children}</div>;
}

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  highlight,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className='emptyTitle'>{label}</label>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`inputBorder ${styles.input} ${highlight ? styles.inputHighlight : ""}`}
        inputMode='decimal'
      />
    </div>
  );
}
