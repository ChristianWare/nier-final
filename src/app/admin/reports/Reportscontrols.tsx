/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import styles from "./AdminReportsPage.module.css";

type ViewMode = "daily" | "monthly" | "ytd" | "all" | "range";

function cleanView(v: string | null): ViewMode {
  if (v === "month") return "daily";
  if (
    v === "daily" ||
    v === "monthly" ||
    v === "ytd" ||
    v === "all" ||
    v === "range"
  )
    return v;
  return "daily";
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

export default function ReportsControls({
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

  const spKey = sp.toString();
  const activeView = cleanView(sp.get("view"));

  const urlMonthYear = getMonthYearFromParams(
    new URLSearchParams(spKey),
    initialYear,
    initialMonth,
  );

  const urlRange = {
    from: sp.get("from") ?? initialFrom ?? defaultFrom,
    to: sp.get("to") ?? initialTo ?? defaultTo,
  };

  function nav(next: URLSearchParams) {
    const qs = next.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function setView(nextView: ViewMode) {
    const next = new URLSearchParams(spKey);
    next.set("view", nextView);

    if (nextView === "daily") {
      next.delete("from");
      next.delete("to");
      next.set("year", urlMonthYear.year);
      next.set("month", urlMonthYear.month);
      nav(next);
      return;
    }

    if (nextView === "range") {
      next.delete("year");
      next.delete("month");
      next.set("from", urlRange.from || defaultFrom);
      next.set("to", urlRange.to || defaultTo);
      nav(next);
      return;
    }

    next.delete("year");
    next.delete("month");
    next.delete("from");
    next.delete("to");
    nav(next);
  }

  function onApplyDaily(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const year = String(fd.get("year") ?? "").trim();
    const month = String(fd.get("month") ?? "").trim();

    const next = new URLSearchParams(spKey);
    next.set("view", "daily");
    next.delete("from");
    next.delete("to");

    next.set("year", isYear(year) ? year : urlMonthYear.year);
    next.set("month", isMonth(month) ? month : urlMonthYear.month);

    nav(next);
  }

  function onApplyRange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const from = String(fd.get("from") ?? "").trim();
    const to = String(fd.get("to") ?? "").trim();

    const next = new URLSearchParams(spKey);
    next.set("view", "range");
    next.delete("year");
    next.delete("month");

    next.set("from", from || defaultFrom);
    next.set("to", to || defaultTo);

    nav(next);
  }

  return (
    <div className={styles.controlsWrapper}>
      <div className={styles.tabs}>
        <button
          type='button'
          className={`tab ${activeView === "daily" ? "tabActive" : ""}`}
          onClick={() => setView("daily")}
          disabled={isPending}
        >
          Daily
        </button>

        <button
          type='button'
          className={`tab ${activeView === "monthly" ? "tabActive" : ""}`}
          onClick={() => setView("monthly")}
          disabled={isPending}
        >
          Monthly
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

        <div className={styles.rangePill}>
          <span className='miniNote'>{rangeLabel}</span>
        </div>
      </div>

      {activeView === "daily" && (
        <form
          key={`daily-${urlMonthYear.year}-${urlMonthYear.month}`}
          className={styles.filterForm}
          onSubmit={onApplyDaily}
        >
          <label className={styles.filterField}>
            <span className='miniNote'>Month</span>
            <select
              className={styles.filterSelect}
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

          <label className={styles.filterField}>
            <span className='miniNote'>Year</span>
            <select
              className={styles.filterSelect}
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
            className={styles.filterSubmit}
            type='submit'
            disabled={isPending}
          >
            Apply
          </button>
        </form>
      )}

      {activeView === "range" && (
        <form
          key={`range-${urlRange.from}-${urlRange.to}`}
          className={styles.filterForm}
          onSubmit={onApplyRange}
        >
          <label className={styles.filterField}>
            <span className='miniNote'>From</span>
            <input
              className={styles.filterInput}
              type='date'
              name='from'
              defaultValue={urlRange.from}
              disabled={isPending}
            />
          </label>

          <label className={styles.filterField}>
            <span className='miniNote'>To</span>
            <input
              className={styles.filterInput}
              type='date'
              name='to'
              defaultValue={urlRange.to}
              disabled={isPending}
            />
          </label>

          <button
            className={styles.filterSubmit}
            type='submit'
            disabled={isPending}
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
