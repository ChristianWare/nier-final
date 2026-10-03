"use client";

import { useEffect, useState, type ChangeEventHandler } from "react";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import { changeEvent } from "./dateUtils";
import styles from "./DatePicker.module.css";

/** A date and a time together ("YYYY-MM-DDTHH:MM"), like the native
 *  datetime-local input. */
export default function DateTimePicker(props: {
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
  const initial = (controlled ? props.value : props.defaultValue) ?? "";
  const [date, setDate] = useState(initial.slice(0, 10));
  const [time, setTime] = useState(initial.slice(11, 16));
  const combined = date && time ? `${date}T${time}` : "";

  // Follow changes made by the parent (e.g. a form being reset).
  useEffect(() => {
    if (!controlled) return;
    const v = props.value ?? "";
    if (v !== combined && (v || (date && time))) {
      setDate(v.slice(0, 10));
      setTime(v.slice(11, 16));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  function emit(d: string, t: string) {
    const v = d && t ? `${d}T${t}` : "";
    props.onValueChange?.(v);
    props.onChange?.(changeEvent(props.name, v));
  }

  return (
    <span className={styles.dateTime}>
      <DatePicker
        value={date}
        onValueChange={(d) => {
          setDate(d);
          emit(d, time);
        }}
        id={props.id}
        required={props.required}
        disabled={props.disabled}
        className={props.className}
        aria-label={
          props["aria-label"] ? `${props["aria-label"]}: date` : "Date"
        }
      />
      <TimePicker
        value={time}
        onValueChange={(t) => {
          setTime(t);
          emit(date, t);
        }}
        required={props.required}
        disabled={props.disabled}
        className={props.className}
        aria-label={
          props["aria-label"] ? `${props["aria-label"]}: time` : "Time"
        }
      />
      {props.name ? (
        <input
          className={styles.proxy}
          tabIndex={-1}
          aria-hidden='true'
          name={props.name}
          value={controlled ? (props.value ?? "") : combined}
          onChange={() => {}}
        />
      ) : null}
    </span>
  );
}
