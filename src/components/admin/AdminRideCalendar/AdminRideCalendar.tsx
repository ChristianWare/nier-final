"use client";

import styles from "./AdminRideCalendar.module.css";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TZ = "America/Phoenix";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromUTCNoon(d: Date) {
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  return `${y}-${m}`;
}

function parseMonthKeyToUTCNoon(val: string) {
  const [y, m] = val.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
}

function startOfMonthUTCNoon(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12, 0, 0));
}

function startOfWeekUTCNoon(d: Date) {
  const day = d.getUTCDay();
  const diff = day === 0 ? 0 : day;
  const res = new Date(d);
  res.setUTCDate(d.getUTCDate() - diff);
  res.setUTCHours(12, 0, 0, 0);
  return res;
}

function addDaysUTCNoon(date: Date, n: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

export default function AdminRideCalendar({
  initialMonth,
  countsByYmd,
  todayYmd,
}: {
  initialMonth: string;
  countsByYmd: Record<string, number>;
  todayYmd: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [monthDate, setMonthDate] = useState(() => {
    const parsed = parseMonthKeyToUTCNoon(initialMonth);
    return startOfMonthUTCNoon(parsed ?? new Date());
  });

  const grid = useMemo(() => {
    const first = startOfMonthUTCNoon(monthDate);
    const gridStart = startOfWeekUTCNoon(first);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDaysUTCNoon(gridStart, i));
    return days;
  }, [monthDate]);

  function pushMonth(next: Date) {
    const mk = monthKeyFromUTCNoon(next);
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set("month", mk);
    router.push(`/admin/calendar?${sp.toString()}`);
  }

  function goPrev() {
    const next = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth() - 1,
        1,
        12,
        0,
        0,
      ),
    );
    setMonthDate(next);
    pushMonth(next);
  }

  function goNext() {
    const next = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth() + 1,
        1,
        12,
        0,
        0,
      ),
    );
    setMonthDate(next);
    pushMonth(next);
  }

  function goToday() {
    const now = new Date();
    const next = startOfMonthUTCNoon(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0)),
    );
    setMonthDate(next);
    pushMonth(next);
  }

  const mobileMonthValue = monthKeyFromUTCNoon(monthDate);

  function onPickMonthMobile(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    const parsed = parseMonthKeyToUTCNoon(val);
    if (!parsed) return;
    const next = startOfMonthUTCNoon(parsed);
    setMonthDate(next);
    pushMonth(next);
  }

  function openDay(ymd: string) {
    router.push(`/admin/calendar/${ymd}`);
  }

  const label = monthLabel(monthDate);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <label className='cardTitle h5'>Calendar</label>
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
          const ymd = ymdInTz(d);
          const isOtherMonth = d.getUTCMonth() !== monthDate.getUTCMonth();
          const isToday = ymd === todayYmd;
          const count = countsByYmd[ymd] ?? 0;

          return (
            <button
              key={ymd}
              type='button'
              onClick={() => openDay(ymd)}
              className={`${styles.dayCell} ${
                isOtherMonth ? styles.dayCellOther : ""
              } ${isToday ? styles.today : ""}`}
              aria-label={ymd}
            >
              <span className={styles.dayNum}>{d.getUTCDate()}</span>
              {count > 0 ? (
                <span className={styles.countPill}>{count}</span>
              ) : null}
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
          <span className={`${styles.legendDot} ${styles.legendHas}`} />
          <span>Has rides</span>
        </div>
      </div>
    </div>
  );
}
