"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./UserTripsPage.module.css";
import Button from "@/components/shared/Button/Button";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING_REVIEW", label: "Pending" },
  { value: "PENDING_PAYMENT", label: "Payment Due" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "EN_ROUTE", label: "En Route" },
  { value: "ARRIVED", label: "Arrived" },
  { value: "IN_PROGRESS", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "DECLINED", label: "Declined" },
  { value: "NO_SHOW", label: "No-Show" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

const RANGE_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past Trips" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
] as const;

const SORT_OPTIONS = [
  { value: "", label: "Default Sort" },
  { value: "pickup-asc", label: "Pickup ↑" },
  { value: "pickup-desc", label: "Pickup ↓" },
  { value: "status-asc", label: "Status A–Z" },
  { value: "status-desc", label: "Status Z–A" },
  { value: "service-asc", label: "Service A–Z" },
  { value: "service-desc", label: "Service Z–A" },
  { value: "total-asc", label: "Total ↑" },
  { value: "total-desc", label: "Total ↓" },
  { value: "created-asc", label: "Created ↑" },
  { value: "created-desc", label: "Created ↓" },
] as const;

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

type PendingAction = "search" | "clear" | "filter" | null;

export default function UserSearchFormClient({
  current,
  defaultValue,
}: {
  current: Record<string, string | undefined>;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const initial = useMemo(() => (defaultValue ?? "").trim(), [defaultValue]);
  const [value, setValue] = useState(initial);

  const currentStatus = current.status ?? "ALL";
  const currentRange = current.range ?? "upcoming";
  const currentSortKey =
    current.sort && current.order ? `${current.sort}-${current.order}` : "";

  function navigate(
    params: Record<string, string | undefined>,
    action: PendingAction,
  ) {
    setPendingAction(action);
    startTransition(() => {
      router.replace(
        buildHref("/dashboard/trips", { ...params, page: undefined }),
        { scroll: false },
      );
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(
      { ...current, q: value.trim().length ? value.trim() : undefined },
      "search",
    );
  }

  function onClear() {
    setValue("");
    navigate({ ...current, q: undefined }, "clear");
  }

  function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    navigate(
      { ...current, status: next === "ALL" ? undefined : next },
      "filter",
    );
  }

  function onRangeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    navigate(
      { ...current, range: next === "upcoming" ? undefined : next },
      "filter",
    );
  }

  function onSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) {
      navigate({ ...current, sort: undefined, order: undefined }, "filter");
    } else {
      const [sort, order] = val.split("-");
      navigate({ ...current, sort, order }, "filter");
    }
  }

  function onClearFilters() {
    setValue("");
    navigate(
      {
        status: undefined,
        range: undefined,
        sort: undefined,
        order: undefined,
        q: undefined,
      },
      "clear",
    );
  }

  const isSearching = isPending && pendingAction === "search";
  const isClearing = isPending && pendingAction === "clear";
  const isFiltering = isPending && pendingAction === "filter";

  const hasActiveFilters =
    currentStatus !== "ALL" ||
    currentRange !== "upcoming" ||
    currentSortKey !== "" ||
    value.trim().length > 0;

  return (
    <div className={styles.searchFilters}>
      <form className={styles.searchRow} onSubmit={onSubmit}>
        <input
          className='inputBorder'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Search by confirmation #, address, or service...'
          disabled={isPending}
          style={
            isPending ? { opacity: 0.5, cursor: "not-allowed" } : undefined
          }
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

      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={currentStatus}
          onChange={onStatusChange}
          disabled={isPending}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={currentRange}
          onChange={onRangeChange}
          disabled={isPending}
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={currentSortKey}
          onChange={onSortChange}
          disabled={isPending}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <Button
            text={isClearing ? "Clearing…" : "Clear Filters"}
            btnType='grayReg'
            type='button'
            onClick={onClearFilters}
            disabled={isPending}
          />
        )}
      </div>

      {isFiltering && (
        <p className={styles.filteringIndicator}>Updating results…</p>
      )}
    </div>
  );
}
