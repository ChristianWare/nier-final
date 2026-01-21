"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

  const from = current.from ?? defaultFrom;
  const to = current.to ?? defaultTo;

  return (
    <form
      className={styles.rangeForm}
      method='GET'
      action='/admin/bookings'
      onSubmit={(e) => {
        e.preventDefault();

        const fd = new FormData(e.currentTarget);
        const fromNext = String(fd.get("from") ?? "").trim();
        const toNext = String(fd.get("to") ?? "").trim();

        const href = buildHref("/admin/bookings", {
          // preserve filters
          status: current.status ?? undefined,
          unassigned: current.unassigned ?? undefined,
          paid: current.paid ?? undefined,
          stuck: current.stuck ?? undefined,

          // force custom range
          range: "range",
          from: fromNext || undefined,
          to: toNext || undefined,

          // reset pagination
          page: undefined,
        });

        startTransition(() => {
          router.push(href, { scroll: false });
          // optional: router.refresh(); // NOT needed; push will re-render the RSC
        });
      }}
    >
      {/* keep range fixed */}
      <input type='hidden' name='range' value='range' />

      <label className={styles.rangeField}>
        <span className='miniNote'>From</span>
        <input
          className={styles.rangeInput}
          type='date'
          name='from'
          defaultValue={from}
        />
      </label>

      <label className={styles.rangeField}>
        <span className='miniNote'>To</span>
        <input
          className={styles.rangeInput}
          type='date'
          name='to'
          defaultValue={to}
        />
      </label>

      <button type='submit' className={styles.rangeSubmit} disabled={isPending}>
        {isPending ? "Applying…" : "Apply"}
      </button>
    </form>
  );
}
