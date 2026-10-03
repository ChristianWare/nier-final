"use client";

import { useState, type ChangeEventHandler } from "react";
import { changeEvent, joinTime, pad, splitTime } from "./dateUtils";
import styles from "./DatePicker.module.css";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

/** Picks a time ("HH:MM", 24-hour) with hour, minute and AM/PM. */
export default function TimePicker(props: {
  value?: string;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const controlled = props.value !== undefined;
  const [inner, setInner] = useState(props.defaultValue ?? "");
  const current = (controlled ? props.value : inner) ?? "";
  const parts = splitTime(current);
  // Parts picked before the time is complete.
  const [draft, setDraft] = useState(parts);
  const shown = parts.hour ? parts : draft;

  function update(next: Partial<typeof parts>) {
    const p = { ...shown, ...next };
    setDraft(p);
    const v = joinTime(p.hour, p.minute, p.period);
    if (!controlled) setInner(v);
    props.onValueChange?.(v);
    props.onChange?.(changeEvent(props.name, v));
  }

  const label = props["aria-label"] ?? "Time";
  return (
    <span className={styles.timeGroup} role='group' aria-label={label}>
      <select
        id={props.id}
        className={props.className}
        value={shown.hour}
        onChange={(e) => update({ hour: e.target.value })}
        disabled={props.disabled}
        aria-label={`${label}: hour`}
      >
        <option value=''>--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className={styles.timeSep}>:</span>
      <select
        className={props.className}
        value={shown.minute}
        onChange={(e) => update({ minute: e.target.value })}
        disabled={props.disabled}
        aria-label={`${label}: minute`}
      >
        <option value=''>--</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        className={props.className}
        value={shown.period}
        onChange={(e) => update({ period: e.target.value })}
        disabled={props.disabled}
        aria-label={`${label}: AM or PM`}
      >
        <option value=''>--</option>
        <option value='AM'>AM</option>
        <option value='PM'>PM</option>
      </select>
      {props.name || props.required ? (
        <input
          className={styles.proxy}
          tabIndex={-1}
          aria-hidden='true'
          name={props.name}
          value={current}
          required={props.required}
          onChange={() => {}}
        />
      ) : null}
    </span>
  );
}
