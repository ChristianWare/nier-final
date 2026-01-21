"use client";

import styles from "./BookingDateTimePicker.module.css";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

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
function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function to12h(h24: number) {
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return { h12, meridiem };
}

const MINUTE_OPTIONS = ["00", "15", "30", "45"] as const;

export default function BookingDateTimePicker({
  date,
  time,
  onChangeDate,
  onChangeTime,
  disablePast = true,
  blockedDates = [],
  onVisibleMonthChange,
}: {
  date: string;
  time: string;
  onChangeDate: (v: string) => void;
  onChangeTime: (v: string) => void;
  disablePast?: boolean;
  blockedDates?: string[];
  onVisibleMonthChange?: (month: string) => void;
}) {
  const todayYMD = useMemo(() => ymdInTz(new Date()), []);
  const blockedSet = useMemo(() => new Set(blockedDates ?? []), [blockedDates]);

  const [monthDate, setMonthDate] = useState(() => {
    const parsed = date ? parseYmdToLocalDate(date) : null;
    return startOfMonth(parsed ?? new Date());
  });

  useEffect(() => {
    onVisibleMonthChange?.(monthKey(monthDate));
  }, [monthDate, onVisibleMonthChange]);

  const grid = useMemo(() => {
    const first = startOfMonth(monthDate);
    const gridStart = startOfWeek(first);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
    return days;
  }, [monthDate]);

  const mobileMonthValue = `${monthDate.getFullYear()}-${String(
    monthDate.getMonth() + 1,
  ).padStart(2, "0")}`;

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
  function onPickMonthMobile(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    const [y, m] = val.split("-").map(Number);
    if (!y || !m) return;
    setMonthDate(new Date(y, m - 1, 1));
  }

  function pickDay(d: Date) {
    const key = ymdInTz(d);
    const isPast = disablePast ? key < todayYMD : false;
    const isBlocked = blockedSet.has(key);
    if (isPast || isBlocked) return;

    if (
      d.getMonth() !== monthDate.getMonth() ||
      d.getFullYear() !== monthDate.getFullYear()
    ) {
      setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }

    onChangeDate(key);
  }

  // ---- Time dropdowns (Hour + Minute in 15-min increments) ----
  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h24) => {
        const { h12, meridiem } = to12h(h24);
        return { value: pad2(h24), label: `${h12} ${meridiem}` };
      }),
    [],
  );

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

  function onHourChange(e: ChangeEvent<HTMLSelectElement>) {
    const hh = e.target.value;

    if (!hh) {
      onChangeTime("");
      return;
    }

    const mm = selectedMM || "00";
    onChangeTime(`${hh}:${mm}`);
  }

  function onMinuteChange(e: ChangeEvent<HTMLSelectElement>) {
    const mm = e.target.value;

    if (!selectedHH) return;

    if (!mm) {
      onChangeTime("");
      return;
    }

    onChangeTime(`${selectedHH}:${mm}`);
  }

  const label = monthLabel(monthDate);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={`${styles.topRow} underline`}>
          <label className='h5 bgWhite'>Date</label>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.controlsDesktop}>
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

          <div className={styles.controlsMobile}>
            <button
              type='button'
              className={styles.iconBtn}
              onClick={goPrev}
              aria-label='Previous month'
            >
              ‹
            </button>

            <input
              type='month'
              value={mobileMonthValue}
              onChange={onPickMonthMobile}
              className={styles.monthPicker}
              aria-label='Pick month'
            />

            <button
              type='button'
              className={styles.iconBtn}
              onClick={goNext}
              aria-label='Next month'
            >
              ›
            </button>

            <button
              type='button'
              className={`${styles.btn} ${styles.primary} ${styles.todayBtn}`}
              onClick={goToday}
            >
              Today
            </button>
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
          const isBlocked = blockedSet.has(key);
          const disabled = isPast || isBlocked;

          return (
            <button
              key={key}
              type='button'
              onClick={() => pickDay(d)}
              className={`${styles.dayCell} ${
                isOtherMonth ? styles.dayCellOther : ""
              } ${isToday ? styles.today : ""} ${
                isSelected ? styles.selected : ""
              } ${disabled ? styles.pastDay : ""}`}
              disabled={disabled}
              aria-label={key}
            >
              <span className={styles.dayNum}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.mobileLegend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendToday}`} />
          <span>Today</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendSelected}`} />
          <span>Selected</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendPast}`} />
          <span>Unavailable</span>
        </div>
      </div>

      <div className={styles.timeBlock}>
        <label className='h5 bgWhite underline'>Time</label>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <select
            className='input emptySmall'
            value={selectedHH}
            onChange={onHourChange}
            aria-label='Select hour'
          >
            <option value=''>Hour</option>
            {hourOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            className='input emptySmall'
            value={selectedMM}
            onChange={onMinuteChange}
            aria-label='Select minutes'
            disabled={!selectedHH}
          >
            <option value=''>Minutes</option>
            {MINUTE_OPTIONS.map((mm) => (
              <option key={mm} value={mm}>
                {mm}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
