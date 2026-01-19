/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./BookingDateTimePicker.module.css";
import { useEffect, useMemo, useRef, useState } from "react";

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
function parseTime24(time: string) {
  const fallback = { h24: 9, m: 0 };
  if (!time) return fallback;
  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return fallback;
  return {
    h24: Math.min(23, Math.max(0, hh)),
    m: Math.min(59, Math.max(0, mm)),
  };
}
function to12h(h24: number) {
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return { h12, meridiem };
}
function to24h(h12: number, meridiem: "AM" | "PM") {
  const base = h12 % 12;
  return meridiem === "PM" ? base + 12 : base;
}
function formatTimeLabel(time: string) {
  const { h24, m } = parseTime24(time);
  const { h12, meridiem } = to12h(h24);
  return `${h12}:${pad2(m)} ${meridiem}`;
}

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

  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [draftHour, setDraftHour] = useState<number>(9);
  const [draftMinute, setDraftMinute] = useState<number>(0);
  const [draftMeridiem, setDraftMeridiem] = useState<"AM" | "PM">("AM");

  const hourListRef = useRef<HTMLDivElement | null>(null);
  const minuteListRef = useRef<HTMLDivElement | null>(null);
  const meridiemListRef = useRef<HTMLDivElement | null>(null);

  function scrollToSelected(
    which: "hour" | "minute" | "meridiem",
    behavior: ScrollBehavior = "smooth",
  ) {
    const ref =
      which === "hour"
        ? hourListRef
        : which === "minute"
          ? minuteListRef
          : meridiemListRef;

    const value =
      which === "hour"
        ? String(draftHour)
        : which === "minute"
          ? String(draftMinute)
          : draftMeridiem;

    const root = ref.current;
    if (!root) return;

    const el = root.querySelector<HTMLElement>(`[data-value="${value}"]`);
    if (!el) return;

    el.scrollIntoView({ block: "center", inline: "nearest", behavior });
  }

  useEffect(() => {
    if (!isTimeOpen) return;

    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevTouchAction = body.style.touchAction;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.touchAction = prevTouchAction;
    };
  }, [isTimeOpen]);

  useEffect(() => {
    if (!isTimeOpen) return;
    const id = requestAnimationFrame(() => {
      scrollToSelected("hour", "auto");
      scrollToSelected("minute", "auto");
      scrollToSelected("meridiem", "auto");
    });
    return () => cancelAnimationFrame(id);
  }, [isTimeOpen, draftHour, draftMinute, draftMeridiem]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isTimeOpen) return;
      if (e.key === "Escape") setIsTimeOpen(false);
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === " " ||
        e.key === "PageDown" ||
        e.key === "PageUp"
      ) {
        if ((e.target as HTMLElement | null)?.closest?.(`.${styles.colList}`))
          return;
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown as any);
  }, [isTimeOpen]);

  const grid = useMemo(() => {
    const first = startOfMonth(monthDate);
    const gridStart = startOfWeek(first);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
    return days;
  }, [monthDate]);

  const mobileMonthValue = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

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
  function onPickMonthMobile(e: React.ChangeEvent<HTMLInputElement>) {
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

  function openTime() {
    const { h24, m } = parseTime24(time);
    const { h12, meridiem } = to12h(h24);
    setDraftHour(h12);
    setDraftMinute(m);
    setDraftMeridiem(meridiem as "AM" | "PM");
    setIsTimeOpen(true);
  }

  function closeTime() {
    setIsTimeOpen(false);
  }

  function commitTime() {
    const h24 = to24h(draftHour, draftMeridiem);
    const next = `${pad2(h24)}:${pad2(draftMinute)}`;
    onChangeTime(next);
    setIsTimeOpen(false);
  }

  function setQuick(h24: number, m: number) {
    const { h12, meridiem } = to12h(h24);
    setDraftHour(h12);
    setDraftMinute(m);
    setDraftMeridiem(meridiem as "AM" | "PM");
  }

  const label = monthLabel(monthDate);
  const timeDisplay = time ? formatTimeLabel(time) : "Select time";

  const hourOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i * 5),
    [],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <label className='cardTitle h5'>Date</label>
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
              className={`${styles.dayCell} ${isOtherMonth ? styles.dayCellOther : ""} ${
                isToday ? styles.today : ""
              } ${isSelected ? styles.selected : ""} ${disabled ? styles.pastDay : ""}`}
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
        <label className='cardTitle h5'>Time</label>

        <button
          type='button'
          className={styles.timeTrigger}
          onClick={openTime}
          aria-haspopup='dialog'
        >
          <span className={styles.timeValue}>{timeDisplay}</span>
          <span className={styles.timeIcon} aria-hidden='true'>
            🕒
          </span>
        </button>
      </div>

      {isTimeOpen ? (
        <div
          className={styles.timeOverlay}
          role='dialog'
          aria-modal='true'
          aria-label='Pick a time'
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeTime();
          }}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div className={styles.timePanel}>
            <div className={styles.timePanelHeader}>
              <div className={styles.timePanelTitle}>Pick a time</div>
              <button
                type='button'
                className={styles.closeBtn}
                onClick={closeTime}
                aria-label='Close'
              >
                ✕
              </button>
            </div>

            <div className={styles.quickRow}>
              <button
                type='button'
                className={styles.quickChip}
                onClick={() => setQuick(9, 0)}
              >
                Morning
              </button>
              <button
                type='button'
                className={styles.quickChip}
                onClick={() => setQuick(12, 0)}
              >
                Noon
              </button>
              <button
                type='button'
                className={styles.quickChip}
                onClick={() => setQuick(18, 0)}
              >
                Evening
              </button>
            </div>

            <div className={styles.timeColumns}>
              <div className={styles.timeCol}>
                <div className={styles.colLabel}>Hour</div>
                <button
                  type='button'
                  className={styles.pinnedChip}
                  onClick={() => scrollToSelected("hour")}
                  aria-label={`Selected hour ${draftHour}`}
                >
                  {draftHour}
                </button>
                <div
                  className={styles.colList}
                  role='listbox'
                  aria-label='Hour'
                  ref={hourListRef}
                >
                  {hourOptions.map((h) => (
                    <button
                      key={h}
                      type='button'
                      data-value={h}
                      className={`${styles.colItem} ${draftHour === h ? styles.colItemActive : ""}`}
                      onClick={() => {
                        setDraftHour(h);
                        requestAnimationFrame(() => scrollToSelected("hour"));
                      }}
                      role='option'
                      aria-selected={draftHour === h}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.timeCol}>
                <div className={styles.colLabel}>Minute</div>
                <button
                  type='button'
                  className={styles.pinnedChip}
                  onClick={() => scrollToSelected("minute")}
                  aria-label={`Selected minute ${pad2(draftMinute)}`}
                >
                  {pad2(draftMinute)}
                </button>
                <div
                  className={styles.colList}
                  role='listbox'
                  aria-label='Minute'
                  ref={minuteListRef}
                >
                  {minuteOptions.map((m) => (
                    <button
                      key={m}
                      type='button'
                      data-value={m}
                      className={`${styles.colItem} ${draftMinute === m ? styles.colItemActive : ""}`}
                      onClick={() => {
                        setDraftMinute(m);
                        requestAnimationFrame(() => scrollToSelected("minute"));
                      }}
                      role='option'
                      aria-selected={draftMinute === m}
                    >
                      {pad2(m)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.timeCol}>
                <div className={styles.colLabel}>AM/PM</div>
                <div
                  className={styles.colList}
                  role='listbox'
                  aria-label='AM/PM'
                  ref={meridiemListRef}
                >
                  {(["AM", "PM"] as const).map((v) => (
                    <button
                      key={v}
                      type='button'
                      data-value={v}
                      className={`${styles.colItem} ${draftMeridiem === v ? styles.colItemActive : ""}`}
                      onClick={() => {
                        setDraftMeridiem(v);
                        requestAnimationFrame(() =>
                          scrollToSelected("meridiem"),
                        );
                      }}
                      role='option'
                      aria-selected={draftMeridiem === v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.previewRow}>
              <div className={styles.previewLabel}>Selected</div>
              <div className={styles.previewValue}>
                {draftHour}:{pad2(draftMinute)} {draftMeridiem}
              </div>
            </div>

            <div className={styles.timeFooter}>
              <button
                type='button'
                className={styles.footerBtn}
                onClick={closeTime}
              >
                Cancel
              </button>
              <button
                type='button'
                className={`${styles.footerBtn} ${styles.footerPrimary}`}
                onClick={commitTime}
              >
                Set time
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
