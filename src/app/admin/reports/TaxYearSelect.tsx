"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Picks the tax package's year (kept in the URL as ?taxYear=). */
export default function TaxYearSelect({
  years,
  year,
}: {
  years: string[];
  year: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  return (
    <select
      className='selectBorder emptySmall'
      value={year}
      disabled={isPending}
      aria-label='Tax year'
      onChange={(e) => {
        const next = new URLSearchParams(sp.toString());
        next.set("taxYear", e.target.value);
        startTransition(() =>
          router.push(`${pathname}?${next.toString()}`, { scroll: false }),
        );
      }}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
