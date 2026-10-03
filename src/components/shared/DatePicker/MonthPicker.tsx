"use client";

import { useState, type ChangeEventHandler, type CSSProperties } from "react";
import PickerShell from "./PickerShell";
import { changeEvent, formatYm, pad } from "./dateUtils";
import styles from "./DatePicker.module.css";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Picks a month ("YYYY-MM"). */
export default function MonthPicker(props: {
  value?: string;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const controlled = props.value !== undefined;
  const [inner, setInner] = useState(props.defaultValue ?? "");
  const current = (controlled ? props.value : inner) ?? "";
  const valid = /^\d{4}-\d{2}$/.test(current);
  const [year, setYear] = useState(
    valid ? Number(current.slice(0, 4)) : new Date().getFullYear(),
  );

  function commit(v: string) {
    if (!controlled) setInner(v);
    props.onValueChange?.(v);
    props.onChange?.(changeEvent(props.name, v));
  }

  return (
    <span className={styles.field}>
      <PickerShell
        label={formatYm(current)}
        valueText={formatYm(current)}
        placeholder={props.placeholder ?? "Select month"}
        isEmpty={!valid}
        className={props.className}
        style={props.style}
        id={props.id}
        disabled={props.disabled}
        ariaLabel={props["aria-label"]}
        dialogLabel={props["aria-label"] ?? "Choose a month"}
      >
        {(close) => (
          <div className={styles.panel}>
            <div className={styles.monthHeader}>
              <button
                type='button'
                className={styles.navBtn}
                aria-label='Previous year'
                onClick={() => setYear((y) => y - 1)}
              >
                ‹
              </button>
              <strong>{year}</strong>
              <button
                type='button'
                className={styles.navBtn}
                aria-label='Next year'
                onClick={() => setYear((y) => y + 1)}
              >
                ›
              </button>
            </div>
            <div className={styles.monthGrid}>
              {MONTHS.map((m, i) => {
                const v = `${year}-${pad(i + 1)}`;
                return (
                  <button
                    key={m}
                    type='button'
                    className={`${styles.monthBtn} ${v === current ? styles.monthBtnActive : ""}`}
                    aria-pressed={v === current}
                    onClick={() => {
                      commit(v);
                      close();
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PickerShell>
      {props.name ? (
        <input
          className={styles.proxy}
          tabIndex={-1}
          aria-hidden='true'
          name={props.name}
          value={current}
          onChange={() => {}}
        />
      ) : null}
    </span>
  );
}
