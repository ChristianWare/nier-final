/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import styles from "./AdminEarningsPage.module.css";

type ViewMode = "month" | "ytd" | "all" | "range";

function cleanView(v: string | null): ViewMode {
  if (v === "month" || v === "ytd" || v === "all" || v === "range") return v;
  return "month";
}

function isYear(v: string | null) {
  return Boolean(v && /^\d{4}$/.test(v));
}

function isMonth(v: string | null) {
  return Boolean(v && /^(0[1-9]|1[0-2])$/.test(v));
}

function isMonthKey(v: string | null) {
  return Boolean(v && /^\d{4}-\d{2}$/.test(v));
}

function getMonthYearFromParams(
  sp: URLSearchParams,
  fallYear: string,
  fallMonth: string,
) {
  const rawYear = sp.get("year");
  const rawMonth = sp.get("month");

  if (isMonthKey(rawMonth)) {
    return { year: rawMonth!.slice(0, 4), month: rawMonth!.slice(5, 7) };
  }

  const year = isYear(rawYear) ? rawYear! : fallYear;
  const month = isMonth(rawMonth) ? rawMonth! : fallMonth;

  return { year, month };
}

export default function EarningsControls({
  years,
  monthOptions,
  defaultFrom,
  defaultTo,
  initialView,
  initialYear,
  initialMonth,
  initialFrom,
  initialTo,
  rangeLabel,
}: {
  years: string[];
  monthOptions: { v: string; label: string }[];
  defaultFrom: string;
  defaultTo: string;
  initialView: ViewMode;
  initialYear: string;
  initialMonth: string;
  initialFrom: string;
  initialTo: string;
  rangeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeView = useMemo(() => cleanView(sp.get("view")), [sp]);

  const urlMonthYear = useMemo(() => {
    const usp = new URLSearchParams(sp.toString());
    return getMonthYearFromParams(usp, initialYear, initialMonth);
  }, [sp, initialYear, initialMonth]);

  const urlRange = useMemo(() => {
    const from = sp.get("from") ?? initialFrom ?? defaultFrom;
    const to = sp.get("to") ?? initialTo ?? defaultTo;
    return { from, to };
  }, [sp, initialFrom, initialTo, defaultFrom, defaultTo]);

  function push(next: URLSearchParams) {
    const qs = next.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => router.push(href));
  }

  function setView(nextView: ViewMode) {
    const next = new URLSearchParams(sp.toString());
    next.set("view", nextView);

    if (nextView === "month") {
      next.delete("from");
      next.delete("to");
      next.set("year", urlMonthYear.year);
      next.set("month", urlMonthYear.month);
      push(next);
      return;
    }

    if (nextView === "range") {
      next.delete("year");
      next.delete("month");
      next.set("from", urlRange.from || defaultFrom);
      next.set("to", urlRange.to || defaultTo);
      push(next);
      return;
    }

    next.delete("year");
    next.delete("month");
    next.delete("from");
    next.delete("to");
    push(next);
  }

  function onApplyMonth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const year = String(fd.get("year") ?? "").trim();
    const month = String(fd.get("month") ?? "").trim();

    const next = new URLSearchParams(sp.toString());
    next.set("view", "month");
    next.delete("from");
    next.delete("to");

    next.set("year", isYear(year) ? year : urlMonthYear.year);
    next.set("month", isMonth(month) ? month : urlMonthYear.month);

    push(next);
  }

  function onApplyRange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const from = String(fd.get("from") ?? "").trim();
    const to = String(fd.get("to") ?? "").trim();

    const next = new URLSearchParams(sp.toString());
    next.set("view", "range");
    next.delete("year");
    next.delete("month");

    next.set("from", from || defaultFrom);
    next.set("to", to || defaultTo);

    push(next);
  }

  return (
    <>
      <div className={styles.tabs}>
        <button
          type='button'
          className={`tab ${activeView === "month" ? "tabActive" : ""}`}
          onClick={() => setView("month")}
          disabled={isPending}
        >
          By month
        </button>

        <button
          type='button'
          className={`tab ${activeView === "ytd" ? "tabActive" : ""}`}
          onClick={() => setView("ytd")}
          disabled={isPending}
        >
          Year to date
        </button>

        <button
          type='button'
          className={`tab ${activeView === "all" ? "tabActive" : ""}`}
          onClick={() => setView("all")}
          disabled={isPending}
        >
          All time
        </button>

        <button
          type='button'
          className={`tab ${activeView === "range" ? "tabActive" : ""}`}
          onClick={() => setView("range")}
          disabled={isPending}
        >
          Date range
        </button>

        {/* <div className={styles.rangePill}>
          <span className='miniNote'>{rangeLabel}</span>
        </div> */}
      </div>

      {activeView === "month" ? (
        <form
          key={`month-${urlMonthYear.year}-${urlMonthYear.month}`}
          className={styles.rangeForm}
          onSubmit={onApplyMonth}
        >
          <label className={styles.rangeField}>
            <span className='miniNote'>Month</span>
            <select
              className={styles.rangeInput}
              name='month'
              defaultValue={urlMonthYear.month}
              disabled={isPending}
            >
              {monthOptions.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.rangeField}>
            <span className='miniNote'>Year</span>
            <select
              className={styles.rangeInput}
              name='year'
              defaultValue={urlMonthYear.year}
              disabled={isPending}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <button
            className={styles.rangeSubmit}
            type='submit'
            disabled={isPending}
          >
            Apply
          </button>
        </form>
      ) : null}

      {activeView === "range" ? (
        <form
          key={`range-${urlRange.from}-${urlRange.to}`}
          className={styles.rangeForm}
          onSubmit={onApplyRange}
        >
          <label className={styles.rangeField}>
            <span className='miniNote'>From</span>
            <input
              className={styles.rangeInput}
              type='date'
              name='from'
              defaultValue={urlRange.from}
              disabled={isPending}
            />
          </label>

          <label className={styles.rangeField}>
            <span className='miniNote'>To</span>
            <input
              className={styles.rangeInput}
              type='date'
              name='to'
              defaultValue={urlRange.to}
              disabled={isPending}
            />
          </label>

          <button
            className={styles.rangeSubmit}
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
