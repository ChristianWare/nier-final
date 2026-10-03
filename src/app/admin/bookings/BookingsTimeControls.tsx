"use client";

import { DatePicker } from "@/components/shared/DatePicker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type FormEvent } from "react";
// Same tabs, pill and forms as the earnings page.
import earnings from "../earnings/AdminEarningsPage.module.css";
import styles from "./BookingsChart.module.css";

const MAIN_TABS = [
  { value: "month", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "last12", label: "Monthly" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
  { value: "range", label: "Date range" },
] as const;

const UPCOMING_TABS = [
  { value: "today", label: "Today" },
  { value: "next24", label: "Next 24h" },
  { value: "next7", label: "Next 7 days" },
  { value: "upcoming", label: "Upcoming" },
] as const;

/** Ranges that only make sense by pickup date. */
const PICKUP_ONLY = ["next24", "next7", "upcoming"];

export default function BookingsTimeControls({
  activeRange,
  basis,
  years,
  monthOptions,
  selectedYear,
  selectedMonth,
  currentMonthKey,
  from,
  to,
  rangeLabel,
  basisTitle = "Showing bookings by",
}: {
  /** Label above the pickup/booked date switch. */
  basisTitle?: string;
  activeRange: string;
  basis: "pickup" | "created";
  years: string[];
  monthOptions: { v: string; label: string }[];
  /** The month the Daily view shows. */
  selectedYear: string;
  selectedMonth: string;
  /** YYYY-MM of today, in the company's time zone. */
  currentMonthKey: string;
  /** YYYY-MM-DD values for the Date range form. */
  from: string;
  to: string;
  rangeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function fresh() {
    const next = new URLSearchParams(sp.toString());
    next.delete("page");
    return next;
  }

  function nav(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() =>
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  /** Daily view of a month (YYYY-MM). The current month keeps a clean URL. */
  function setMonth(next: URLSearchParams, monthKey: string) {
    next.delete("from");
    next.delete("to");
    // A search defaults to all time, so say "month" explicitly then.
    if (next.get("q")) next.set("range", "month");
    else next.delete("range");
    if (monthKey === currentMonthKey) next.delete("month");
    else next.set("month", monthKey);
  }

  function setRange(value: string) {
    const next = fresh();
    if (value === "month") {
      // Coming from a date range, open the month it starts in.
      const fromMonth = activeRange === "range" ? from.slice(0, 7) : "";
      setMonth(
        next,
        /^\d{4}-\d{2}$/.test(fromMonth)
          ? fromMonth
          : `${selectedYear}-${selectedMonth}`,
      );
    } else if (value === "range") {
      next.delete("month");
      next.set("range", "range");
      next.set("from", from);
      next.set("to", to);
    } else {
      next.delete("month");
      next.delete("from");
      next.delete("to");
      next.set("range", value);
      if (PICKUP_ONLY.includes(value)) next.delete("basis");
    }
    nav(next);
  }

  function onBasisChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(sp.toString());
    next.delete("page");
    if (e.target.value === "created") next.set("basis", "created");
    else next.delete("basis");
    nav(next);
  }

  function onApplyDaily(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const year = String(fd.get("year") ?? "").trim();
    const month = String(fd.get("month") ?? "").trim();
    const next = fresh();
    setMonth(
      next,
      `${/^\d{4}$/.test(year) ? year : selectedYear}-${/^(0[1-9]|1[0-2])$/.test(month) ? month : selectedMonth}`,
    );
    nav(next);
  }

  function onApplyRange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = fresh();
    next.delete("month");
    next.set("range", "range");
    next.set("from", String(fd.get("from") ?? "").trim() || from);
    next.set("to", String(fd.get("to") ?? "").trim() || to);
    nav(next);
  }

  const pickupOnly = PICKUP_ONLY.includes(activeRange);

  return (
    <>
      <div className={earnings.driverSelector}>
        <label className={earnings.driverLabel}>
          <span className='miniNote'>{basisTitle}</span>
          <select
            className='selectBorder emptySmall'
            style={{ minWidth: "275px" }}
            value={pickupOnly ? "pickup" : basis}
            onChange={onBasisChange}
            disabled={isPending || pickupOnly}
            title={
              pickupOnly
                ? "Upcoming views always use the pickup date"
                : undefined
            }
          >
            <option value='pickup'>Pickup date</option>
            <option value='created'>Booked date</option>
          </select>
        </label>
      </div>

      <div className={earnings.tabs}>
        {MAIN_TABS.map((t) => (
          <button
            key={t.value}
            type='button'
            className={`tab ${activeRange === t.value ? "tabActive" : ""}`}
            onClick={() => setRange(t.value)}
            disabled={isPending}
          >
            {t.label}
          </button>
        ))}

        <span className={styles.tabDivider} aria-hidden='true' />

        {UPCOMING_TABS.map((t) => (
          <button
            key={t.value}
            type='button'
            className={`tab ${activeRange === t.value ? "tabActive" : ""}`}
            onClick={() => setRange(t.value)}
            disabled={isPending}
          >
            {t.label}
          </button>
        ))}

        <div className={earnings.rangePill}>
          <span className='miniNote'>{rangeLabel}</span>
        </div>
      </div>

      {activeRange === "month" ? (
        <form
          key={`daily-${selectedYear}-${selectedMonth}`}
          className={earnings.rangeForm}
          onSubmit={onApplyDaily}
        >
          <label className={earnings.rangeField}>
            <span className='miniNote'>Month</span>
            <select
              className='selectBorder emptySmall'
              name='month'
              defaultValue={selectedMonth}
              disabled={isPending}
            >
              {monthOptions.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className={earnings.rangeField}>
            <span className='miniNote'>Year</span>
            <select
              className='selectBorder emptySmall'
              name='year'
              defaultValue={selectedYear}
              disabled={isPending}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <button className='rangeSubmitBtn' type='submit' disabled={isPending}>
            Apply
          </button>
        </form>
      ) : null}

      {activeRange === "range" ? (
        <form
          key={`range-${from}-${to}`}
          className={earnings.rangeForm}
          onSubmit={onApplyRange}
        >
          <label className={earnings.rangeField}>
            <span className='miniNote'>From</span>
            <DatePicker
              className='selectBorder'
              name='from'
              defaultValue={from}
              disabled={isPending}
            />
          </label>

          <label className={earnings.rangeField}>
            <span className='miniNote'>To</span>
            <DatePicker
              className='selectBorder'
              name='to'
              defaultValue={to}
              disabled={isPending}
            />
          </label>

          <button
            className={earnings.rangeSubmit}
            type='submit'
            disabled={isPending}
          >
            Apply
          </button>
        </form>
      ) : null}
    </>
  );
}
