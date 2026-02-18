"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./BookingsPage.module.css";
import Button from "@/components/shared/Button/Button";

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

export default function SearchFormClient({
  current,
  defaultValue,
}: {
  current: Record<string, string | undefined>;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"search" | "clear" | null>(
    null,
  );

  const initial = useMemo(() => (defaultValue ?? "").trim(), [defaultValue]);
  const [value, setValue] = useState(initial);

  function apply(nextQ: string, action: "search" | "clear") {
    const q = nextQ.trim();

    const href = buildHref("/admin/bookings", {
      ...current,
      q: q.length ? q : undefined,
      page: undefined,
    });

    setPendingAction(action);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply(value, "search");
  }

  function onClear() {
    setValue("");
    apply("", "clear");
  }

  const isSearching = isPending && pendingAction === "search";
  const isClearing = isPending && pendingAction === "clear";

  return (
    <form className={styles.searchRow} onSubmit={onSubmit}>
      <input
        className='inputBorder'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Search name, email, confirmation #, booking ID, phone, address…'
        disabled={isPending}
        style={isPending ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
      />
      <Button
        text={isSearching ? "Searching…" : "Search"}
        btnType='blackReg'
        type='submit'
        disabled={isPending}
      />

      {value.trim().length || isClearing ? (
        <Button
          text={isClearing ? "Clearing…" : "Clear"}
          btnType='grayReg'
          type='button'
          onClick={onClear}
          disabled={isPending}
        />
      ) : null}
    </form>
  );
}
