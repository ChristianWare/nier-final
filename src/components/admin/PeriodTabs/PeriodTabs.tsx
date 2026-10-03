"use client";

import { Fragment } from "react";
import styles from "./PeriodTabs.module.css";

export type PeriodTab = { value: string; label: string };
export type PeriodTabGroup = { label: string; tabs: readonly PeriodTab[] };

/**
 * The period tabs above charts and tables (Daily, Weekly, … Upcoming).
 * Wider screens show the tabs; phones and small tablets get one "Period"
 * dropdown instead of several rows of tabs. Both call the same onSelect.
 */
export default function PeriodTabs({
  groups,
  active,
  onSelect,
  disabled,
  rangeLabel,
  className,
  pillClassName,
}: {
  groups: readonly PeriodTabGroup[];
  active: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  /** The selected period in words (e.g. "Oct 2026"), shown beside the tabs. */
  rangeLabel?: string;
  /** The page's own tab-row class, so each page keeps its spacing. */
  className?: string;
  pillClassName?: string;
}) {
  const known = groups.some((g) => g.tabs.some((t) => t.value === active));
  const option = (t: PeriodTab) => (
    <option key={t.value} value={t.value}>
      {t.label}
    </option>
  );

  return (
    <div className={`${className ?? ""} ${styles.bar}`}>
      <div className={styles.tabs}>
        {groups.map((g, i) => (
          <Fragment key={g.label}>
            {i > 0 ? (
              <span className={styles.divider} aria-hidden='true' />
            ) : null}
            {g.tabs.map((t) => (
              <button
                key={t.value}
                type='button'
                className={`tab ${active === t.value ? "tabActive" : ""}`}
                aria-pressed={active === t.value}
                onClick={() => onSelect(t.value)}
                disabled={disabled}
              >
                {t.label}
              </button>
            ))}
          </Fragment>
        ))}
      </div>

      <label className={styles.picker}>
        <span className='miniNote'>Period</span>
        <select
          className='selectBorder'
          value={active}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
        >
          {known ? null : (
            <option value={active} disabled>
              {rangeLabel ?? "Custom"}
            </option>
          )}
          {groups.length > 1
            ? groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.tabs.map(option)}
                </optgroup>
              ))
            : groups[0]?.tabs.map(option)}
        </select>
      </label>

      {rangeLabel ? (
        <div className={pillClassName}>
          <span className='miniNote'>{rangeLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
