"use client";

import {
  useState,
  type ChangeEventHandler,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { DayPicker, type Matcher } from "react-day-picker";
import PickerShell from "./PickerShell";
import {
  changeEvent,
  formatMdyYmd,
  formatYmd,
  parseTypedDate,
  parseYmd,
  toYmd,
} from "./dateUtils";
import styles from "./DatePicker.module.css";

/** Calendar styling: every part of the calendar uses our classes. */
export const dayPickerClassNames = {
  root: styles.rdp,
  months: styles.months,
  month: styles.month,
  month_caption: styles.caption,
  caption_label: styles.captionLabel,
  dropdowns: styles.dropdowns,
  dropdown_root: styles.dropdownRoot,
  dropdown: styles.dropdown,
  nav: styles.nav,
  button_previous: styles.navBtn,
  button_next: styles.navBtn,
  chevron: styles.chevron,
  month_grid: styles.grid,
  weekdays: styles.weekdays,
  weekday: styles.weekday,
  weeks: styles.weeks,
  week: styles.week,
  day: styles.day,
  day_button: styles.dayButton,
  selected: styles.selected,
  today: styles.today,
  outside: styles.outside,
  disabled: styles.disabled,
  hidden: styles.hidden,
  focused: styles.focused,
};

export type DatePickerProps = {
  /** "YYYY-MM-DD" (controlled). */
  value?: string;
  /** "YYYY-MM-DD" (uncontrolled; read through `name` when the form submits). */
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  title?: string;
  "aria-label"?: string;
  /** How the chosen date shows: "Oct 1, 2026" (default) or "10/01/2026". */
  displayFormat?: "medium" | "mdy";
  /** Years offered in the year dropdown. */
  fromYear?: number;
  toYear?: number;
};

export default function DatePicker(props: DatePickerProps) {
  const controlled = props.value !== undefined;
  const [inner, setInner] = useState(props.defaultValue ?? "");
  const current = (controlled ? props.value : inner) ?? "";
  const selected = parseYmd(current);
  const [month, setMonth] = useState<Date>(selected ?? new Date());
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState(false);

  const minDate = parseYmd(props.min);
  const maxDate = parseYmd(props.max);
  const allowed = (d: Date) =>
    (!minDate || d >= minDate) && (!maxDate || d <= maxDate);
  const disabled: Matcher[] = [];
  if (minDate) disabled.push({ before: minDate });
  if (maxDate) disabled.push({ after: maxDate });
  const year = new Date().getFullYear();
  const shown =
    props.displayFormat === "mdy" ? formatMdyYmd(current) : formatYmd(current);

  function commit(v: string) {
    if (!controlled) setInner(v);
    props.onValueChange?.(v);
    props.onChange?.(changeEvent(props.name, v));
  }

  return (
    <span className={styles.field}>
      <PickerShell
        label={shown}
        valueText={formatYmd(current)}
        placeholder={props.placeholder ?? "Select date"}
        isEmpty={!selected}
        className={props.className}
        style={props.style}
        id={props.id}
        disabled={props.disabled}
        ariaLabel={props["aria-label"]}
        title={props.title}
        dialogLabel={props["aria-label"] ?? props.title ?? "Choose a date"}
      >
        {(close) => {
          const onTyped = (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const v = parseTypedDate(typed);
            if (v && allowed(parseYmd(v)!)) {
              commit(v);
              setTyped("");
              setTypedError(false);
              close();
            } else {
              setTypedError(true);
            }
          };
          const today = new Date();
          return (
            <div className={styles.panel}>
              <input
                className={`${styles.typeInput} ${typedError ? styles.typeInputError : ""}`}
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setTypedError(false);
                }}
                onKeyDown={onTyped}
                placeholder='Type a date: MM/DD/YYYY'
                aria-label='Type a date'
                inputMode='numeric'
              />
              <DayPicker
                mode='single'
                selected={selected}
                onSelect={(d) => {
                  if (d) {
                    commit(toYmd(d));
                    close();
                  }
                }}
                month={month}
                onMonthChange={setMonth}
                captionLayout='dropdown'
                startMonth={new Date(props.fromYear ?? year - 80, 0)}
                endMonth={new Date(props.toYear ?? year + 15, 11)}
                disabled={disabled}
                classNames={dayPickerClassNames}
                autoFocus
              />
              <div className={styles.footer}>
                <button
                  type='button'
                  className={styles.footBtn}
                  disabled={
                    !allowed(
                      new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                      ),
                    )
                  }
                  onClick={() => {
                    commit(toYmd(today));
                    close();
                  }}
                >
                  Today
                </button>
                {!props.required && current ? (
                  <button
                    type='button'
                    className={styles.footBtn}
                    onClick={() => {
                      commit("");
                      close();
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          );
        }}
      </PickerShell>
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
