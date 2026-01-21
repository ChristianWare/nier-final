"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./BookingsPage.module.css";

function buildHref(
  base: string,
  params: Record<string, string | undefined | null>,
) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    const s = String(v).trim();
    if (!s) continue;
    usp.set(k, s);
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

export default function CustomRangeFormClient({
  current,
  defaultFrom,
  defaultTo,
}: {
  current: Record<string, string | undefined>;
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();

  const initial = useMemo(() => {
    return {
      from: current.from ?? defaultFrom,
      to: current.to ?? defaultTo,
    };
  }, [current.from, current.to, defaultFrom, defaultTo]);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const href = buildHref("/admin/bookings", {
      ...current,
      range: "range",
      from,
      to,
      page: undefined, // reset paging when applying a new range
    });

    router.replace(href, { scroll: false });
  }

  return (
    <form className={styles.rangeForm} onSubmit={onSubmit}>
      <label className={styles.rangeField}>
        <span className='miniNote'>From</span>
        <input
          className={styles.rangeInput}
          type='date'
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>

      <label className={styles.rangeField}>
        <span className='miniNote'>To</span>
        <input
          className={styles.rangeInput}
          type='date'
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>

      <button type='submit' className={styles.rangeSubmit}>
        Apply
      </button>
    </form>
  );
}
