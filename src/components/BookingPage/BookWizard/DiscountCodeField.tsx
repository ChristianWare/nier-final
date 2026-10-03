"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  checkDiscountCode,
  type CheckDiscountInput,
} from "../../../../actions/discountCodes/checkDiscountCode";
import styles from "./DiscountCodeField.module.css";

export type AppliedDiscount = {
  code: string;
  name: string;
  summary: string;
  totalCents: number;
  /** The rides it was worked out for; if they change, it needs applying again. */
  key: string;
};

const usd = (cents: number) => (cents / 100).toFixed(2);

/** "Have a discount code?" in the booking tool's review step. */
export default function DiscountCodeField({
  rides,
  ridesKey,
  email,
  phone,
  initialCode,
  applied,
  onApplied,
}: {
  rides: CheckDiscountInput["rides"];
  ridesKey: string;
  email?: string | null;
  phone?: string | null;
  /** From a share link (/book?code=…): filled in, ready to apply. */
  initialCode?: string;
  applied: AppliedDiscount | null;
  onApplied: (d: AppliedDiscount | null) => void;
}) {
  const id = useId();
  const [code, setCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [triedOnce, setTriedOnce] = useState(false);

  async function apply() {
    const c = code.trim();
    if (!c) {
      setError("Enter a code.");
      return;
    }
    setChecking(true);
    setError(null);
    setTriedOnce(true);
    try {
      const res = await checkDiscountCode({ code: c, rides, email, phone });
      if (!res.ok) {
        setError(res.error);
        onApplied(null);
        return;
      }
      onApplied({
        code: res.code,
        name: res.name,
        summary: res.summary,
        totalCents: res.totalCents,
        key: ridesKey,
      });
    } catch {
      setError("Couldn't check the code. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void apply();
    }
  }

  if (applied && applied.key === ridesKey) {
    return (
      <div className={styles.applied} role='status'>
        <span>
          ✓ <strong>{applied.code}</strong> applied · {applied.summary} · −$
          {usd(applied.totalCents)}
        </span>
        <button
          type='button'
          className={styles.remove}
          onClick={() => {
            onApplied(null);
            setCode("");
            setTriedOnce(false);
          }}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.label} htmlFor={id}>
        Have a discount code?
      </label>
      <div className={styles.row}>
        <input
          id={id}
          className={styles.input}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          onKeyDown={onKey}
          placeholder='Enter code'
          autoCapitalize='characters'
          autoComplete='off'
          spellCheck={false}
          maxLength={30}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type='button'
          className={styles.apply}
          onClick={() => void apply()}
          disabled={checking}
        >
          {checking ? "Checking…" : "Apply"}
        </button>
      </div>
      {applied && applied.key !== ridesKey ? (
        <p className='miniNote'>
          Your ride details changed. Apply the code again to update the
          discount.
        </p>
      ) : initialCode && !triedOnce ? (
        <p className='miniNote'>Tap Apply to use your code.</p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className={styles.error} role='alert'>
          {error}
        </p>
      ) : null}
    </div>
  );
}
