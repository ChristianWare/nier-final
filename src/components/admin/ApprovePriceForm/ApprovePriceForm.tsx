"use client";

import styles from "./ApprovePriceForm.module.css";
import { useTransition, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { approveBookingAndSetPrice } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";

// Format cents to dollars string with commas (e.g., 175632 -> "$1,756.32")
function formatCentsToDollars(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

// Parse dollar string back to cents (e.g., "$1,756.32" -> 175632)
function parseDollarsToCents(value: string): number {
  // Remove currency symbol, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, "");
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

// Format input value for display while typing (allows partial input)
function formatInputValue(value: string): string {
  // If empty or just a dollar sign, return as-is
  if (!value || value === "$") return value;

  // Remove everything except digits and decimal point
  const cleaned = value.replace(/[^0-9.]/g, "");

  // Handle multiple decimal points - keep only first
  const parts = cleaned.split(".");
  let formatted = parts[0];
  if (parts.length > 1) {
    // Limit to 2 decimal places
    formatted += "." + parts[1].slice(0, 2);
  }

  // Add commas to the integer part
  const [intPart, decPart] = formatted.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return "$" + withCommas + (decPart !== undefined ? "." + decPart : "");
}

type FormState = {
  // Track the props we initialized from (to detect changes)
  _propsSubtotal: number;
  _propsFees: number;
  _propsTaxes: number;
  _propsTotal: number;
  // The actual form values
  subtotal: string;
  fees: string;
  taxes: string;
  total: string;
};

export default function ApprovePriceForm({
  bookingId,
  currency,
  subtotalCents,
  feesCents,
  taxesCents,
  totalCents,
}: {
  bookingId: string;
  currency: string;
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Initialize state with props values
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

  // Detect if props changed (e.g., after router.refresh()) and reset state
  // This compares state values to props, which is allowed during render
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

  function handleChange(
    name: "subtotal" | "fees" | "taxes" | "total",
    value: string,
  ) {
    const formatted = formatInputValue(value);
    setState((prev) => ({ ...prev, [name]: formatted }));
  }

  function handleBlur(name: "subtotal" | "fees" | "taxes" | "total") {
    // On blur, format to proper currency display
    const cents = parseDollarsToCents(state[name]);
    setState((prev) => ({ ...prev, [name]: formatCentsToDollars(cents) }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Convert dollar strings back to cents for the server
    const fd = new FormData();
    fd.set("bookingId", bookingId);
    fd.set("currency", currency);
    fd.set("subtotalCents", String(parseDollarsToCents(state.subtotal)));
    fd.set("feesCents", String(parseDollarsToCents(state.fees)));
    fd.set("taxesCents", String(parseDollarsToCents(state.taxes)));
    fd.set("totalCents", String(parseDollarsToCents(state.total)));

    startTransition(() => {
      approveBookingAndSetPrice(fd).then((res) => {
        if (res?.error) return toast.error(res.error);
        toast.success("Approved and price saved");
        router.refresh();
      });
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Grid2>
        <Field
          label='Subtotal'
          name='subtotal'
          value={state.subtotal}
          onChange={(v) => handleChange("subtotal", v)}
          onBlur={() => handleBlur("subtotal")}
          disabled={isPending}
        />
        <Field
          label='Fees'
          name='fees'
          value={state.fees}
          onChange={(v) => handleChange("fees", v)}
          onBlur={() => handleBlur("fees")}
          disabled={isPending}
        />
      </Grid2>

      <Grid2>
        <Field
          label='Taxes'
          name='taxes'
          value={state.taxes}
          onChange={(v) => handleChange("taxes", v)}
          onBlur={() => handleBlur("taxes")}
          disabled={isPending}
        />
        <Field
          label='Total'
          name='total'
          value={state.total}
          onChange={(v) => handleChange("total", v)}
          onBlur={() => handleBlur("total")}
          disabled={isPending}
          highlight
        />
      </Grid2>

      <div className={styles.btnContainer}>
        <Button
          disabled={isPending}
          type='submit'
          text={isPending ? "Saving..." : "Approve & Set Price"}
          btnType='black'
          arrow
        />
      </div>
    </form>
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
      <label className={styles.fieldLabel}>{label}</label>
      <input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={`${styles.input} ${highlight ? styles.inputHighlight : ""}`}
        inputMode='decimal'
      />
    </div>
  );
}
