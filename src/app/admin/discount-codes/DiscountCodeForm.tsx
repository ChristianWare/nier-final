"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { DatePicker } from "@/components/shared/DatePicker";
import { saveDiscountCode } from "../../../../actions/admin/discountCodes";
import type { DiscountCodeInput } from "@/lib/discounts/discountForm";
import styles from "../drivers/AdminDriversPage.module.css";
import own from "./DiscountCodes.module.css";

const EMPTY: DiscountCodeInput = {
  code: "",
  name: "",
  partner: "",
  kind: "PERCENT",
  value: "",
  maxDiscount: "",
  minFare: "",
  bookFrom: "",
  bookUntil: "",
  rideFrom: "",
  rideUntil: "",
  maxUses: "",
  maxUsesPerCustomer: "",
  active: true,
  notes: "",
};

export default function DiscountCodeForm({
  initial,
}: {
  initial?: DiscountCodeInput;
}) {
  const router = useRouter();
  const [v, setV] = useState<DiscountCodeInput>(initial ?? EMPTY);
  const [error, setError] = useState<{ text: string; field?: string } | null>(
    null,
  );
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const set = (k: keyof DiscountCodeInput) => (val: string | boolean) => {
    setV((x) => ({ ...x, [k]: val }));
    setSaved(false);
  };
  const err = (k: keyof DiscountCodeInput) =>
    error?.field === k ? (
      <span className={own.fieldError}>{error.text}</span>
    ) : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveDiscountCode(v);
      if ("error" in res) {
        setError({ text: res.error, field: res.field });
        return;
      }
      if (!v.id) {
        router.push(`/admin/discount-codes/${res.id}`);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const textInput = (
    k: keyof DiscountCodeInput,
    label: string,
    hint?: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className={styles.field}>
      <span className='miniNote'>{label}</span>
      <input
        className={styles.textField}
        value={String(v[k] ?? "")}
        onChange={(e) => set(k)(e.target.value)}
        aria-invalid={error?.field === k}
        {...props}
      />
      {hint ? <span className='miniNote'>{hint}</span> : null}
      {err(k)}
    </label>
  );
  const dateInput = (k: keyof DiscountCodeInput, label: string) => (
    <label className={styles.field}>
      <span className='miniNote'>{label}</span>
      <DatePicker
        className={styles.textField}
        value={String(v[k] ?? "")}
        onValueChange={(val) => set(k)(val)}
        aria-label={label}
      />
      {err(k)}
    </label>
  );

  return (
    <form onSubmit={onSubmit}>
      <h3 className={`cardTitle h6 ${styles.formSection}`}>The code</h3>
      <div className={styles.formGrid}>
        {textInput(
          "code",
          "Code",
          "What customers type, e.g. SMOKEN26. Letters and numbers, no spaces.",
          {
            autoCapitalize: "characters",
            style: { textTransform: "uppercase" },
            maxLength: 30,
          },
        )}
        {textInput("name", "Name", "For you, e.g. Smoke 'N The Desert 2026.")}
        {textInput(
          "partner",
          "Partner (optional)",
          "Who it's for, e.g. the event organizer.",
        )}
      </div>

      <h3 className={`cardTitle h6 ${styles.formSection}`}>The discount</h3>
      <div
        className={own.kindRow}
        role='radiogroup'
        aria-label='Kind of discount'
      >
        <label>
          <input
            type='radio'
            name='kind'
            checked={v.kind === "PERCENT"}
            onChange={() => set("kind")("PERCENT")}
          />{" "}
          Percent off
        </label>
        <label>
          <input
            type='radio'
            name='kind'
            checked={v.kind === "AMOUNT"}
            onChange={() => set("kind")("AMOUNT")}
          />{" "}
          Dollars off
        </label>
      </div>
      <div className={styles.formGrid}>
        {textInput(
          "value",
          v.kind === "PERCENT" ? "Percent off" : "Dollars off",
          v.kind === "PERCENT"
            ? "Comes off each ride's price, e.g. 15."
            : "Comes off once per booking (a trip counts once), e.g. 20.",
          {
            inputMode: "decimal",
            placeholder: v.kind === "PERCENT" ? "15" : "20",
          },
        )}
        {v.kind === "PERCENT"
          ? textInput(
              "maxDiscount",
              "Most it can take off, $ (optional)",
              "Leave blank for no limit.",
              { inputMode: "decimal" },
            )
          : null}
        {textInput(
          "minFare",
          "Minimum ride price, $ (optional)",
          "The ride price needed to use the code.",
          { inputMode: "decimal" },
        )}
      </div>
      <p className='miniNote'>
        It comes off the ride price only, never fees, taxes or tips. Drivers are
        paid on the price before the discount.
      </p>

      <h3 className={`cardTitle h6 ${styles.formSection}`}>When it works</h3>
      <div className={styles.formGrid}>
        {dateInput("bookFrom", "Can be used to book from")}
        {dateInput("bookUntil", "Last day to book")}
        {dateInput("rideFrom", "Covers rides from")}
        {dateInput("rideUntil", "Covers rides through")}
      </div>
      <p className='miniNote'>
        All optional. Leave a date blank for no limit. Dates are in Phoenix time
        and include the whole day.
      </p>

      <h3 className={`cardTitle h6 ${styles.formSection}`}>Limits</h3>
      <div className={styles.formGrid}>
        {textInput(
          "maxUses",
          "Total uses (optional)",
          "A trip counts as one use. Cancelled bookings give their use back.",
          { inputMode: "numeric" },
        )}
        {textInput(
          "maxUsesPerCustomer",
          "Uses per customer (optional)",
          "Matched by account, email or phone.",
          { inputMode: "numeric" },
        )}
      </div>

      <label className={`${styles.field} ${styles.notesField}`}>
        <span className='miniNote'>Notes (optional)</span>
        <textarea
          className={styles.textField}
          rows={3}
          value={v.notes}
          onChange={(e) => set("notes")(e.target.value)}
        />
      </label>

      <div className={styles.checkRow}>
        <label>
          <input
            type='checkbox'
            checked={v.active}
            onChange={(e) => set("active")(e.target.checked)}
          />{" "}
          On
          <span className='miniNote'>
            {" "}
            (customers can use it within the dates above)
          </span>
        </label>
      </div>

      {error && !error.field ? (
        <p className={own.fieldError}>{error.text}</p>
      ) : null}
      <div className={styles.formFoot}>
        <button className='rangeSubmitBtn' type='submit' disabled={isPending}>
          {isPending ? "Saving…" : v.id ? "Save changes" : "Create code"}
        </button>
        {saved ? <span className='miniNote'>Saved.</span> : null}
      </div>
    </form>
  );
}
