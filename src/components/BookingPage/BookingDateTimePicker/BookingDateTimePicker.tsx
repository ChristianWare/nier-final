"use client";

// Pickup date and time. A month of days as boxes, Monday first: open days
// are white boxes, past days and the days around the month are faded
// numbers, fully booked days (blackouts) are striped, and the chosen day is
// filled in black. Under it, the hour and minutes, and one line saying
// what's picked so far. Used by the public booking tool and by the admin and
// corporate booking tools.

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import styles from "./BookingDateTimePicker.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addDays(date: Date, n: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}
/** The Monday on or before d. */
function startOfWeekMonday(d: Date) {
  const res = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(res, -((res.getDay() + 6) % 7));
}
function ymdInTz(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
/** Calendar days are local dates: their key is just y-m-d. */
function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseYmdToLocalDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function monthKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function to12h(h24: number) {
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return { h12, meridiem };
}
function timeLabel(hhmm: string) {
  const [hh, mm] = hhmm.split(":");
  const { h12, meridiem } = to12h(parseInt(hh, 10));
  return `${h12}:${mm} ${meridiem}`;
}
function dayLabel(ymd: string) {
  const d = parseYmdToLocalDate(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Total minutes from "HH:MM", or null if invalid.
function hhmToMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [hhRaw, mmRaw] = hhmm.split(":");
  const h = parseInt(hhRaw, 10);
  const m = parseInt(mmRaw, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export default function BookingDateTimePicker({
  date,
  time,
  onChangeDate,
  onChangeTime,
  disablePast = true,
  blockedDates = [],
  onVisibleMonthChange,
  timeZone,
  minTime,
}: {
  date: string;
  time: string;
  onChangeDate: (v: string) => void;
  onChangeTime: (v: string) => void;
  disablePast?: boolean;
  blockedDates?: string[];
  onVisibleMonthChange?: (month: string) => void;
  timeZone: string;
  minTime?: string; // "HH:MM": earlier times are disabled
}) {
  const todayYMD = useMemo(() => ymdInTz(new Date(), timeZone), [timeZone]);
  const blockedSet = useMemo(() => new Set(blockedDates ?? []), [blockedDates]);

  const [monthDate, setMonthDate] = useState(() => {
    const parsed = date ? parseYmdToLocalDate(date) : null;
    return startOfMonth(parsed ?? parseYmdToLocalDate(todayYMD) ?? new Date());
  });

  useEffect(() => {
    onVisibleMonthChange?.(monthKey(monthDate));
  }, [monthDate, onVisibleMonthChange]);

  // Monday of the week the month starts in, to Sunday of the week it ends in.
  const grid = useMemo(() => {
    const first = startOfMonth(monthDate);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const start = startOfWeekMonday(first);
    const end = addDays(startOfWeekMonday(last), 6);
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return days;
  }, [monthDate]);

  const thisMonthKey = todayYMD.slice(0, 7);
  const canGoPrev = !disablePast || monthKey(monthDate) > thisMonthKey;

  function goPrev() {
    if (!canGoPrev) return;
    setMonthDate((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
  }
  function goNext() {
    setMonthDate((cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
  }

  // ─── Time ───────────────────────────────────────────────────────────────
  const minTotalMinutes = useMemo(() => hhmToMinutes(minTime), [minTime]);

  // An hour is disabled when even its last slot (:45) is before minTime.
  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, h24) => {
      const { h12, meridiem } = to12h(h24);
      const disabled =
        minTotalMinutes !== null && h24 * 60 + 45 < minTotalMinutes;
      return { value: pad2(h24), label: `${h12} ${meridiem}`, disabled };
    });
  }, [minTotalMinutes]);

  const { selectedHH, selectedMM } = useMemo(() => {
    if (!time) return { selectedHH: "", selectedMM: "" };
    const [hhRaw = "", mmRaw = ""] = time.split(":");
    const hhNum = Number(hhRaw);
    const mmNum = Number(mmRaw);
    if (!Number.isFinite(hhNum) || !Number.isFinite(mmNum)) {
      return { selectedHH: "", selectedMM: "" };
    }
    const hh = pad2(Math.min(23, Math.max(0, hhNum)));
    const mm = pad2(Math.min(59, Math.max(0, mmNum)));
    return {
      selectedHH: hh,
      selectedMM: (MINUTE_OPTIONS as readonly string[]).includes(mm) ? mm : "",
    };
  }, [time]);

  const minuteOptions = useMemo(() => {
    const hh = parseInt(selectedHH, 10);
    return MINUTE_OPTIONS.map((mm) => {
      const slot = hh * 60 + parseInt(mm, 10);
      const disabled =
        !Number.isNaN(hh) && minTotalMinutes !== null && slot < minTotalMinutes;
      return { value: mm, disabled };
    });
  }, [selectedHH, minTotalMinutes]);

  function onHourChange(e: ChangeEvent<HTMLSelectElement>) {
    const hh = e.target.value;
    if (!hh) {
      onChangeTime("");
      return;
    }
    // Keep the minutes unless they're now before minTime.
    const slot = parseInt(hh, 10) * 60 + (parseInt(selectedMM, 10) || 0);
    const mmStillValid =
      selectedMM && (minTotalMinutes === null || slot >= minTotalMinutes);
    onChangeTime(`${hh}:${mmStillValid ? selectedMM : "00"}`);
  }

  function onMinuteChange(e: ChangeEvent<HTMLSelectElement>) {
    const mm = e.target.value;
    if (!selectedHH) return;
    onChangeTime(mm ? `${selectedHH}:${mm}` : "");
  }

  const month = monthDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const status = !date
    ? "Choose a day for your pickup."
    : !time
      ? `Choose a time on ${dayLabel(date)}.`
      : `Pickup on ${dayLabel(date)} at ${timeLabel(time)}.`;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.monthNav}>
          <button
            type='button'
            className={styles.navBtn}
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label='Previous month'
          >
            <Arrow className={styles.prevIcon} />
          </button>
          <p className={styles.month} aria-live='polite'>
            {month}
          </p>
          <button
            type='button'
            className={styles.navBtn}
            onClick={goNext}
            aria-label='Next month'
          >
            <Arrow className={styles.nextIcon} />
          </button>
        </div>

        <ul className={styles.legend}>
          <li>
            <span className={styles.swatch} aria-hidden='true' />
            Open
          </li>
          <li>
            <span
              className={`${styles.swatch} ${styles.swatchBooked}`}
              aria-hidden='true'
            />
            Fully booked
          </li>
        </ul>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.dow} aria-hidden='true'>
            {d}
          </span>
        ))}

        {grid.map((d) => {
          const key = ymdLocal(d);
          const inMonth = d.getMonth() === monthDate.getMonth();
          const isPast = disablePast && key < todayYMD;
          const isBlocked = blockedSet.has(key);
          const isToday = key === todayYMD;
          const isSelected = Boolean(date) && key === date;

          // Days around the month are just faded numbers.
          if (!inMonth) {
            return (
              <span
                key={key}
                className={`${styles.day} ${styles.dayFaded}`}
                aria-hidden='true'
              >
                <span className={styles.num}>{d.getDate()}</span>
              </span>
            );
          }

          const disabled = isPast || isBlocked;
          const cls = [
            styles.day,
            isPast ? styles.dayFaded : "",
            isBlocked && !isPast ? styles.dayBooked : "",
            !disabled ? styles.dayOpen : "",
            isSelected ? styles.daySelected : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={key}
              type='button'
              className={cls}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`${dayLabel(key)}${isBlocked ? ", fully booked" : ""}${isToday ? ", today" : ""}`}
              onClick={() => onChangeDate(key)}
            >
              {isToday && <span className={styles.todayDot} />}
              <span className={styles.num}>{d.getDate()}</span>
              {isBlocked && !isPast && (
                <span className={styles.dayNote}>Booked</span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.time}>
        <p className={styles.subLabel}>Pickup time</p>
        <div className={styles.timeRow}>
          <select
            className={styles.select}
            value={selectedHH}
            onChange={onHourChange}
            aria-label='Hour'
          >
            <option value=''>Hour</option>
            {hourOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={selectedMM}
            onChange={onMinuteChange}
            aria-label='Minutes'
            disabled={!selectedHH}
          >
            <option value=''>Minutes</option>
            {minuteOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                :{o.value}
              </option>
            ))}
          </select>
        </div>
        {minTime && (
          <p className={styles.note}>
            Same-day rides need at least 6 hours&apos; notice. The earliest
            pickup today is {timeLabel(minTime)}.
          </p>
        )}
      </div>

      <p
        className={`${styles.status} ${date && time ? styles.statusDone : ""}`}
      >
        {status}
      </p>
    </div>
  );
}
