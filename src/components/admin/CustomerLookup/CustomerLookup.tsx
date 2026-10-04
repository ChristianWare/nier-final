"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import {
  adminSearchCustomers,
  type CustomerMatch,
} from "../../../../actions/admin/customers/adminSearchCustomers";
import { statusBadge } from "@/lib/booking/rideBadges";
import styles from "./CustomerLookup.module.css";

/** Debounced people search (accounts and past guests). */
export function useCustomerSearch(
  query: string,
  enabled: boolean,
  guestsOnly = false,
) {
  const [found, setFound] = useState<{ q: string; results: CustomerMatch[] }>({
    q: "",
    results: [],
  });
  const q = query.trim();
  const active = enabled && q.length >= 2;

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await adminSearchCustomers({ query: q, guestsOnly });
        if (alive) setFound({ q, results: res.results });
      } catch {
        if (alive) setFound({ q, results: [] });
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [active, q, guestsOnly]);

  return active && found.q === q ? found.results : [];
}

/** "3 bookings · last 09/14/2026 · Cancelled" */
export function historyLine(p: CustomerMatch): string {
  if (!p.bookings || !p.lastAt) return "No bookings yet";
  const d = new Date(p.lastAt);
  const mdy = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  const status = p.lastStatus ? ` · ${statusBadge(p.lastStatus).label}` : "";
  return `${p.bookings} ${p.bookings === 1 ? "booking" : "bookings"} · last ${mdy}${status}`;
}

function Suggestion({ p }: { p: CustomerMatch }) {
  return (
    <>
      <span className={styles.name}>
        {p.name ?? p.email ?? "Customer"}
        {p.userId ? <span className={styles.tag}>Has an account</span> : null}
      </span>
      <span className={styles.meta}>
        {[p.email, p.phone].filter(Boolean).join(" · ")}
      </span>
      <span className={styles.history}>{historyLine(p)}</span>
    </>
  );
}

/** An input that suggests past customers as you type (name, email or phone). */
export default function CustomerLookupInput({
  value,
  onChange,
  onPick,
  className,
  placeholder,
  inputMode,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: CustomerMatch) => void;
  className?: string;
  placeholder?: string;
  inputMode?: "email" | "tel" | "text";
  "aria-label"?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useCustomerSearch(value, open);
  const showing = open && results.length > 0;

  function pick(p: CustomerMatch) {
    setOpen(false);
    onPick(p);
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!showing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[Math.min(active, results.length - 1)]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <input
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKey}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete='off'
        role='combobox'
        aria-label={ariaLabel}
        aria-autocomplete='list'
        aria-expanded={showing}
        aria-controls={`${id}-list`}
      />
      {showing ? (
        <ul
          id={`${id}-list`}
          role='listbox'
          className={styles.list}
          aria-label='Past customers'
        >
          {results.map((p, i) => (
            <li
              key={p.key}
              role='option'
              aria-selected={i === active}
              className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <Suggestion p={p} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Under the account search: people who booked before without an account. */
export function PastGuests({
  query,
  onPick,
}: {
  query: string;
  onPick: (p: CustomerMatch) => void;
}) {
  const results = useCustomerSearch(query, true, true);
  if (results.length === 0) return null;
  return (
    <div className={styles.pastGuests}>
      <div className='miniNote'>
        Past guests (no account). Picking one books them as a guest:
      </div>
      {results.map((p) => (
        <button
          key={p.key}
          type='button'
          className={styles.guestBtn}
          onClick={() => onPick(p)}
        >
          <Suggestion p={p} />
        </button>
      ))}
    </div>
  );
}
