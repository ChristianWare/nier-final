"use client";

import styles from "./DriverRideCalendar.module.css";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymdInTz(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function monthLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
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

function getDaysInMonth(monthDate: Date): Date[] {
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(Date.UTC(year, month, i, 12, 0, 0)));
  }
  return days;
}

export default function DriverRideCalendar({
  initialMonth,
  countsByYmd,
  todayYmd,
  timeZone,
}: {
  initialMonth: string;
  countsByYmd: Record<string, number>;
  todayYmd: string;
  timeZone: string;
}) {
  const router = useRouter();

  const [monthDate, setMonthDate] = useState(() => {
    const parsed = parseMonthKeyToUTCNoon(initialMonth);
    return startOfMonthUTCNoon(parsed ?? new Date());
  });

  // Desktop grid
  const grid = useMemo(() => {
    const first = startOfMonthUTCNoon(monthDate);
    const gridStart = startOfWeekUTCNoon(first);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDaysUTCNoon(gridStart, i));
    return days;
  }, [monthDate]);

  // Mobile agenda — only days with trips
  const agendaDays = useMemo(() => {
    const allDays = getDaysInMonth(monthDate);
    return allDays
      .map((d) => {
        const ymd = ymdInTz(d, timeZone);
        const count = countsByYmd[ymd] ?? 0;
        const isToday = ymd === todayYmd;
        return { d, ymd, count, isToday };
      })
      .filter(({ count }) => count > 0);
  }, [monthDate, countsByYmd, todayYmd, timeZone]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const monthKey = monthKeyFromUTCNoon(monthDate);
    let totalTrips = 0;
    Object.entries(countsByYmd).forEach(([ymd, count]) => {
      if (ymd.startsWith(monthKey)) totalTrips += count;
    });
    return { totalTrips };
  }, [monthDate, countsByYmd]);

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
  }

  function goToday() {
    const now = new Date();
    const next = startOfMonthUTCNoon(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0)),
    );
    setMonthDate(next);
  }

  const mobileMonthValue = monthKeyFromUTCNoon(monthDate);

  function onPickMonthMobile(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    const parsed = parseMonthKeyToUTCNoon(val);
    if (!parsed) return;
    setMonthDate(startOfMonthUTCNoon(parsed));
  }

  function openDay(ymd: string) {
    router.push(`/driver-dashboard/schedule/${ymd}`);
  }

  const label = monthLabel(monthDate, timeZone);

  return (
    <div className={styles.wrap}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.topRow}>
          <label className='cardTitle h5'>My Schedule</label>
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

      {/* ── Desktop grid ── */}
      <div className={styles.desktopGrid}>
        <div className={styles.gridHead}>
          {WEEKDAYS.map((d) => (
            <div key={d} className={styles.dowCell}>
              {d}
            </div>
          ))}
        </div>

        <div className={styles.gridDays}>
          {grid.map((d) => {
            const ymd = ymdInTz(d, timeZone);
            const isOtherMonth = d.getUTCMonth() !== monthDate.getUTCMonth();
            const isToday = ymd === todayYmd;
            const count = countsByYmd[ymd] ?? 0;
            const hasTrips = count > 0;

            return (
              <button
                key={ymd}
                type='button'
                onClick={() => openDay(ymd)}
                className={`${styles.dayCell} ${
                  isOtherMonth ? styles.dayCellOther : ""
                } ${isToday ? styles.today : ""} ${hasTrips ? styles.hasTrips : ""}`}
                aria-label={ymd}
              >
                <span className={styles.dayNum}>{d.getUTCDate()}</span>
                {count > 0 && <span className={styles.countPill}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div className={styles.monthStats}>
          <div className={styles.monthStatsItem}>
            <span
              className='subheading'
              style={{ textDecoration: "underline" }}
            >
              Trips this month:
            </span>{" "}
            <span className='subheading emptyTitle'>
              {monthStats.totalTrips}
            </span>
          </div>
        </div>

        <div className={styles.mobileLegend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendToday}`} />
            <span>Today</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendHas}`} />
            <span>Has trips</span>
          </div>
        </div>
      </div>

      {/* ── Mobile agenda ── */}
      <div className={styles.mobileAgenda}>
        {agendaDays.length === 0 ? (
          <div className={styles.agendaEmpty}>
            <span className={styles.agendaEmptyIcon}>📭</span>
            <p className={styles.agendaEmptyText}>No trips this month</p>
          </div>
        ) : (
          <div className={styles.agendaList}>
            {agendaDays.map(({ d, ymd, count, isToday }) => {
              const dayOfWeek = DAY_NAMES[d.getUTCDay()];
              const dayNum = d.getUTCDate();
              const monthName = MONTH_NAMES[d.getUTCMonth()];

              return (
                <button
                  key={ymd}
                  type='button'
                  className={`${styles.agendaRow} ${isToday ? styles.agendaRowToday : ""}`}
                  onClick={() => openDay(ymd)}
                >
                  <div
                    className={`${styles.agendaDate} ${isToday ? styles.agendaDateToday : ""}`}
                  >
                    <span className={styles.agendaDow}>{dayOfWeek}</span>
                    <span className={styles.agendaDay}>{dayNum}</span>
                    <span className={styles.agendaMon}>{monthName}</span>
                  </div>

                  <div className={styles.agendaContent}>
                    <div className={styles.agendaTripChip}>
                      <span className={styles.agendaTripCount}>{count}</span>
                      <span className={styles.agendaTripLabel}>
                        {count === 1 ? "trip" : "trips"}
                      </span>
                    </div>
                  </div>

                  <span className={styles.agendaArrow}>›</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Stats bar */}
        <div className={styles.agendaStats}>
          <div className={styles.agendaStatItem}>
            <span className={styles.agendaStatValue}>
              {monthStats.totalTrips}
            </span>
            <span className={styles.agendaStatLabel}>This Month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
