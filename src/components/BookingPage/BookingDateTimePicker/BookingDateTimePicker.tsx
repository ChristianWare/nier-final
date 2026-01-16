"use client";

import styles from "./BookingDateTimePicker.module.css";
import { useMemo, useState } from "react";

const TZ = process.env.NEXT_PUBLIC_SALON_TZ ?? "America/Phoenix";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? 0 : day;
  const res = new Date(d);
  res.setDate(d.getDate() - diff);
  res.setHours(0, 0, 0, 0);
  return res;
}
function addDays(date: Date, n: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function ymdInTz(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  }).format(date);
}
function parseYmdToLocalDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default function BookingDateTimePicker({
  date,
  time,
  onChangeDate,
  onChangeTime,
  disablePast = true,
}: {
  date: string;
  time: string;
  onChangeDate: (v: string) => void;
  onChangeTime: (v: string) => void;
  disablePast?: boolean;
}) {
  const todayYMD = useMemo(() => ymdInTz(new Date()), []);

  const [monthDate, setMonthDate] = useState(() => {
    const parsed = date ? parseYmdToLocalDate(date) : null;
    return startOfMonth(parsed ?? new Date());
  });

  const grid = useMemo(() => {
    const first = startOfMonth(monthDate);
    const gridStart = startOfWeek(first);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
    return days;
  }, [monthDate]);

  function goPrev() {
    setMonthDate((cur) => new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
  }
  function goNext() {
    setMonthDate((cur) => new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
  }
  function goToday() {
    const now = new Date();
    setMonthDate(startOfMonth(now));
    onChangeDate(todayYMD);
  }

  function pickDay(d: Date) {
    const key = ymdInTz(d);
    if (disablePast && key < todayYMD) return;

    if (
      d.getMonth() !== monthDate.getMonth() ||
      d.getFullYear() !== monthDate.getFullYear()
    ) {
      setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }

    onChangeDate(key);
  }

  const label = monthLabel(monthDate);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button type='button' className={styles.btn} onClick={goPrev}>
            ← Prev
          </button>
          <button
            type='button'
            className={`${styles.btn} ${styles.primary}`}
            onClick={goToday}
          >
            Today
          </button>
          <button type='button' className={styles.btn} onClick={goNext}>
            Next →
          </button>
          <div className={styles.monthLabel}>{label}</div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.timeGroup}>
            <div className={styles.timeLabel}>Time</div>
            <input
              type='time'
              value={time}
              onChange={(e) => onChangeTime(e.target.value)}
              className={styles.timeInput}
            />
          </div>
        </div>
      </div>

      <div className={styles.gridHead}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.dowCell}>
            {d}
          </div>
        ))}
      </div>

      <div className={styles.gridDays}>
        {grid.map((d) => {
          const key = ymdInTz(d);
          const isOtherMonth = d.getMonth() !== monthDate.getMonth();
          const isToday = key === todayYMD;
          const isSelected = Boolean(date) && key === date;
          const isPast = disablePast ? key < todayYMD : false;

          return (
            <button
              key={key}
              type='button'
              onClick={() => pickDay(d)}
              className={`${styles.dayCell} ${isOtherMonth ? styles.dayCellOther : ""} ${
                isToday ? styles.today : ""
              } ${isSelected ? styles.selected : ""} ${isPast ? styles.pastDay : ""}`}
              disabled={isPast}
              aria-label={key}
            >
              <span className={styles.dayNum}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
