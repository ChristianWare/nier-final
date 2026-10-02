"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
// Same field and select styles as the earnings page's controls.
import earnings from "../earnings/AdminEarningsPage.module.css";
import styles from "./BookingsChart.module.css";

export type FilterOption = { value: string; label: string; count?: number };
type Group = { label?: string; options: FilterOption[] };

/** URL param → the value that means "no filter" (kept out of the URL). */
const DEFAULTS: Record<string, string> = {
  status: "ALL",
  customerType: "all",
  driver: "all",
  serviceType: "all",
  rideType: "all",
  payment: "any",
  assignment: "any",
  flight: "any",
};

function label(o: FilterOption) {
  return typeof o.count === "number" ? `${o.label} (${o.count})` : o.label;
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className={earnings.rangeField}>
      <span className='miniNote'>{title}</span>
      {children}
    </label>
  );
}

export default function BookingsFilters({
  values,
  statusGroups,
  customerOptions,
  driverOptions,
  serviceOptions,
  rideOptions,
  paymentOptions,
  assignmentOptions,
  flightOptions,
  hasActive,
}: {
  /** Current value of each filter, keyed by URL param. */
  values: Record<keyof typeof DEFAULTS, string>;
  statusGroups: Group[];
  customerOptions: FilterOption[];
  driverOptions: FilterOption[];
  serviceOptions: FilterOption[];
  rideOptions: FilterOption[];
  paymentOptions: FilterOption[];
  assignmentOptions: FilterOption[];
  flightOptions: FilterOption[];
  /** Any filter or search on (shows "Clear filters"). */
  hasActive: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function nav(next: URLSearchParams) {
    next.delete("page");
    const qs = next.toString();
    startTransition(() =>
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  function set(param: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value === DEFAULTS[param]) next.delete(param);
    else next.set(param, value);
    nav(next);
  }

  // Clears which-bookings filters and the search; keeps the time view.
  function clearAll() {
    const next = new URLSearchParams(sp.toString());
    for (const k of [...Object.keys(DEFAULTS), "q"]) next.delete(k);
    nav(next);
  }

  const driverChosen = values.driver !== DEFAULTS.driver;

  const select = (param: string, options: FilterOption[], disabled = false) => (
    <select
      className='selectBorder emptySmall'
      value={values[param]}
      onChange={(e) => set(param, e.target.value)}
      disabled={isPending || disabled}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {label(o)}
        </option>
      ))}
    </select>
  );

  return (
    <div className={styles.filterBar}>
      <Field title='Status'>
        <select
          className='selectBorder emptySmall'
          value={values.status}
          onChange={(e) => set("status", e.target.value)}
          disabled={isPending}
        >
          {statusGroups.map((g, i) =>
            g.label ? (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {label(o)}
                  </option>
                ))}
              </optgroup>
            ) : (
              g.options.map((o) => (
                <option key={`${i}-${o.value}`} value={o.value}>
                  {label(o)}
                </option>
              ))
            ),
          )}
        </select>
      </Field>
      <Field title='Customer type'>
        {select("customerType", customerOptions)}
      </Field>
      <Field title='Driver'>{select("driver", driverOptions)}</Field>
      <Field title='Service'>{select("serviceType", serviceOptions)}</Field>
      <Field title='Ride type'>{select("rideType", rideOptions)}</Field>
      <Field title='Payment'>{select("payment", paymentOptions)}</Field>
      <Field title='Assignment'>
        {select("assignment", assignmentOptions, driverChosen)}
      </Field>
      <Field title='Flight info'>{select("flight", flightOptions)}</Field>
      {hasActive ? (
        <button
          type='button'
          className={`tab ${styles.clearBtn}`}
          onClick={clearAll}
          disabled={isPending}
        >
          Clear filters
        </button>
      ) : null}
      {driverChosen ? (
        <span className={`miniNote ${styles.filterNote}`}>
          Assignment follows the driver you picked.
        </span>
      ) : null}
    </div>
  );
}
