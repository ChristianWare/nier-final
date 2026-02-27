"use client";

import styles from "./AdminDriverCalendarCard.module.css";
import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// ─── Date helpers (UTC-noon pattern, same as AdminRideCalendar) ───────────────

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKeyFromUTCNoon(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
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
  const res = new Date(d);
  res.setUTCDate(d.getUTCDate() - day);
  res.setUTCHours(12, 0, 0, 0);
  return res;
}

function addDaysUTCNoon(date: Date, n: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

function ymdInTz(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shortMonthLabel(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildGrid(monthDate: Date): Date[] {
  const first = startOfMonthUTCNoon(monthDate);
  const gridStart = startOfWeekUTCNoon(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDaysUTCNoon(gridStart, i));
  return days;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  /** Total assigned (non-cancelled) bookings ever */
  totalAssignments: number;
  /** Upcoming assignments (pickupAt >= now) */
  upcomingCount: number;
}

interface Props {
  driver: DriverInfo;
  initialMonth: string; // "YYYY-MM"
  initialCountsByYmd: Record<string, number>;
  todayYmd: string;
  timeZone: string;
  isInactive?: boolean;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function AdminDriverCalendarCard({
  driver,
  initialMonth,
  initialCountsByYmd,
  todayYmd,
  timeZone,
  isInactive = false,
}: Props) {
  const router = useRouter();

  const [monthDate, setMonthDate] = useState(() => {
    const parsed = parseMonthKeyToUTCNoon(initialMonth);
    return startOfMonthUTCNoon(parsed ?? new Date());
  });

  const [countsByYmd, setCountsByYmd] =
    useState<Record<string, number>>(initialCountsByYmd);
  const [loading, setLoading] = useState(false);

  const fetchMonth = useCallback(
    async (next: Date) => {
      const mk = monthKeyFromUTCNoon(next);
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/driver-calendar?driverId=${driver.id}&month=${mk}`,
        );
        if (res.ok) {
          const data = await res.json();
          setCountsByYmd(data.countsByYmd ?? {});
        }
      } catch {
        // silently keep previous data
      } finally {
        setLoading(false);
      }
    },
    [driver.id],
  );

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
    fetchMonth(next);
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
    fetchMonth(next);
  }

  function goToday() {
    const now = new Date();
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0),
    );
    setMonthDate(next);
    fetchMonth(next);
  }

  function openDay(ymd: string) {
    router.push(`/admin/calendar/drivers/${driver.id}/${ymd}`);
  }

  const grid = buildGrid(monthDate);
  const label = shortMonthLabel(monthDate, timeZone);

  // Monthly total for the selected month
  const monthKey = monthKeyFromUTCNoon(monthDate);
  const monthTotal = Object.entries(countsByYmd)
    .filter(([ymd]) => ymd.startsWith(monthKey))
    .reduce((sum, [, c]) => sum + c, 0);

  const avatarSrc = driver.image ?? null;
  const displayName = driver.name?.trim() || driver.email;
  const initials = displayName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div className={`${styles.card} ${isInactive ? styles.cardInactive : ""}`}>
      {/* ── Left: Driver info ── */}
      <div className={styles.driverPanel}>
        <div className={styles.avatarWrap}>
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={displayName}
              title={displayName}
              width={64}
              height={64}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback} aria-hidden='true'>
              {initials}
            </div>
          )}
          {isInactive && (
            <span className={styles.inactiveDot} title='Inactive' />
          )}
        </div>

        <div className={styles.driverMeta}>
          <span className={styles.driverName}>{displayName}</span>
          <span className={styles.driverEmail}>{driver.email}</span>
          {isInactive && (
            <span className={`badge badge_neutral ${styles.inactiveBadge}`}>
              Inactive
            </span>
          )}
        </div>

        <div className={styles.driverStats}>
          <div className={styles.statRow}>
            <span className={styles.statNum}>{monthTotal}</span>
            <span className={styles.statLbl}>This month</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statRow}>
            <span className={styles.statNum}>{driver.upcomingCount}</span>
            <span className={styles.statLbl}>Upcoming</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statRow}>
            <span className={styles.statNum}>{driver.totalAssignments}</span>
            <span className={styles.statLbl}>All time</span>
          </div>
        </div>
      </div>

      {/* ── Right: Mini calendar ── */}
      <div className={styles.calPanel}>
        {/* Calendar nav */}
        <div className={styles.calNav}>
          <button
            type='button'
            className={styles.navBtn}
            onClick={goPrev}
            aria-label='Previous month'
          >
            ‹
          </button>
          <button
            type='button'
            className={styles.monthLabel}
            onClick={goToday}
            title='Go to today'
          >
            {label}
          </button>
          <button
            type='button'
            className={styles.navBtn}
            onClick={goNext}
            aria-label='Next month'
          >
            ›
          </button>

          {loading && <span className={styles.loadingDot} aria-hidden='true' />}
        </div>

        {/* Day-of-week header */}
        <div className={styles.calHead}>
          {WEEKDAYS.map((d) => (
            <div key={d} className={styles.dowCell}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className={`${styles.calGrid} ${loading ? styles.calGridLoading : ""}`}
        >
          {grid.map((d) => {
            const ymd = ymdInTz(d, timeZone);
            const isOtherMonth = d.getUTCMonth() !== monthDate.getUTCMonth();
            const isToday = ymd === todayYmd;
            const count = countsByYmd[ymd] ?? 0;
            const hasRides = count > 0;

            return (
              <button
                key={ymd}
                type='button'
                onClick={() => openDay(ymd)}
                disabled={isOtherMonth}
                className={`${styles.dayCell} ${
                  isOtherMonth ? styles.dayCellOther : ""
                } ${isToday ? styles.today : ""} ${
                  hasRides ? styles.hasRides : ""
                }`}
                aria-label={`${ymd}${count > 0 ? `, ${count} ride${count > 1 ? "s" : ""}` : ""}`}
              >
                <span className={styles.dayNum}>{d.getUTCDate()}</span>
                {hasRides && (
                  <span className={styles.countDot} aria-hidden='true'>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
