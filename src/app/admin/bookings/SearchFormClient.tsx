"use client";

import { useMemo, useState } from "react";
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

  const initial = useMemo(() => (defaultValue ?? "").trim(), [defaultValue]);
  const [value, setValue] = useState(initial);

  function apply(nextQ: string) {
    const q = nextQ.trim();

    const href = buildHref("/admin/bookings", {
      ...current,
      q: q.length ? q : undefined,
      page: undefined, // reset paging when searching
    });

    router.replace(href, { scroll: false });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply(value);
  }

  function onClear() {
    setValue("");
    apply("");
  }

  return (
    <form className={styles.searchRow} onSubmit={onSubmit}>
      <input
        className='inputBorder'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Search name, email, booking ID, phone, address…'
      />
      <Button text='Search' btnType='blackReg' type='submit' />

      {value.trim().length ? (
        <Button text='Clear' btnType='grayReg' type='button' onClick={onClear} />
      ) : null}
    </form>
  );
}
