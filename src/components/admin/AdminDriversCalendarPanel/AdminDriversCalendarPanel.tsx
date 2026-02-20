"use client";

import styles from "./AdminDriversCalendarPanel.module.css";
import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export interface DriverInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  upcomingCount: number;
  totalAssignments: number;
}

export interface DriverCalendarData {
  driverId: string;
  countsByYmd: Record<string, number>;
}

interface Props {
  activeDrivers: DriverInfo[];
  inactiveDrivers: DriverInfo[];
  /** Pre-fetched counts for the initial month, keyed by driverId */
  initialDataByDriver: Record<string, Record<string, number>>;
  initialMonth: string; // "YYYY-MM"
  todayYmd: string;
  timeZone: string;
}


const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function monthLabel(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "long",
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

// ─── Main component ─────────────────────────────────────────────────────────

export default function AdminDriversCalendarPanel({
  activeDrivers,
  inactiveDrivers,
  initialDataByDriver,
  initialMonth,
  todayYmd,
  timeZone,
}: Props) {
  const router = useRouter();
  const allDrivers = [...activeDrivers, ...inactiveDrivers];

  const [selectedId, setSelectedId] = useState<string | null>(
    activeDrivers[0]?.id ?? inactiveDrivers[0]?.id ?? null,
  );

  const [monthDate, setMonthDate] = useState(() => {
    const parsed = parseMonthKeyToUTCNoon(initialMonth);
    return startOfMonthUTCNoon(parsed ?? new Date());
  });

  // countsByYmd for the currently selected driver + current month
  const [countsByYmd, setCountsByYmd] = useState<Record<string, number>>(
    () => initialDataByDriver[selectedId ?? ""] ?? {},
  );
  const [loading, setLoading] = useState(false);

  // When selecting a different driver, load their data for the current month
  function selectDriver(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);

    const mk = monthKeyFromUTCNoon(monthDate);
    // Check if we already have this data from the initial load
    const initial = initialDataByDriver[id];
    const initialMk = initialMonth;
    if (mk === initialMk && initial) {
      setCountsByYmd(initial);
      return;
    }
    fetchCounts(id, monthDate);
  }

  const fetchCounts = useCallback(async (driverId: string, month: Date) => {
    const mk = monthKeyFromUTCNoon(month);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/driver-calendar?driverId=${driverId}&month=${mk}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCountsByYmd(data.countsByYmd ?? {});
      }
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (selectedId) fetchCounts(selectedId, next);
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
    if (selectedId) fetchCounts(selectedId, next);
  }

  function goToday() {
    const now = new Date();
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0),
    );
    setMonthDate(next);
    if (selectedId) fetchCounts(selectedId, next);
  }

  function openDay(ymd: string) {
    if (!selectedId) return;
    router.push(`/admin/calendar/drivers/${selectedId}/${ymd}`);
  }

  // Mobile month picker
  const mobileMonthValue = monthKeyFromUTCNoon(monthDate);
  function onPickMonthMobile(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) return;
    const parsed = parseMonthKeyToUTCNoon(val);
    if (!parsed) return;
    const next = startOfMonthUTCNoon(parsed);
    setMonthDate(next);
    if (selectedId) fetchCounts(selectedId, next);
  }

  const grid = buildGrid(monthDate);
  const label = monthLabel(monthDate, timeZone);
  const monthKey = monthKeyFromUTCNoon(monthDate);

  const monthTotal = Object.entries(countsByYmd)
    .filter(([ymd]) => ymd.startsWith(monthKey))
    .reduce((sum, [, c]) => sum + c, 0);

  const selectedDriver = allDrivers.find((d) => d.id === selectedId) ?? null;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className='cardTitle h5'>Drivers</span>
        </div>
        {/* Mobile dropdown — shown only at ≤1068px */}
        <div className={styles.mobileSelect}>
          <select
            className='selectBorder emptySmall'
            value={selectedId ?? ""}
            onChange={(e) => selectDriver(e.target.value)}
            aria-label='Select driver'
          >
            {activeDrivers.length > 0 && (
              <optgroup label='Active'>
                {activeDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name?.trim() || d.email}
                    {d.upcomingCount > 0
                      ? ` (${d.upcomingCount} upcoming)`
                      : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {inactiveDrivers.length > 0 && (
              <optgroup label='Inactive'>
                {inactiveDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name?.trim() || d.email}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {activeDrivers.length > 0 && (
          <div className={styles.driverGroup}>
            <div className={styles.groupHeading}>Active</div>
            {activeDrivers.map((d) => (
              <DriverRow
                key={d.id}
                driver={d}
                selected={d.id === selectedId}
                onClick={() => selectDriver(d.id)}
              />
            ))}
          </div>
        )}
        {inactiveDrivers.length > 0 && (
          <div className={styles.driverGroup}>
            <div className={styles.groupHeading}>Inactive</div>
            {inactiveDrivers.map((d) => (
              <DriverRow
                key={d.id}
                driver={d}
                selected={d.id === selectedId}
                inactive
                onClick={() => selectDriver(d.id)}
              />
            ))}
          </div>
        )}
      </aside>

      {/* ── Right: Calendar ── */}
      <div className={styles.calendarPane}>
        {selectedDriver ? (
          <>
            {/* Selected driver nameplate above calendar */}
            <div className={styles.driverNameplate}>
              <DriverAvatar driver={selectedDriver} size={36} />
              <span className={styles.nameplateName}>
                {selectedDriver.name?.trim() || selectedDriver.email}
              </span>
              <span className={styles.nameplateStats}>
                {selectedDriver.upcomingCount} upcoming ·{" "}
                {selectedDriver.totalAssignments} total
              </span>
            </div>

            <div className={styles.wrap}>
              <div className={styles.header}>
                <div className={styles.topRow}>
                  <label className='cardTitle h5'>Schedule</label>
                  {loading && (
                    <span className={styles.loadingPill}>Loading…</span>
                  )}
                </div>

                <div className={styles.controlsRow}>
                  <div className={styles.controlsDesktop}>
                    <button
                      type='button'
                      className={styles.btn}
                      onClick={goPrev}
                    >
                      ← Prev
                    </button>
                    <button
                      type='button'
                      className={`${styles.btn} ${styles.primary}`}
                      onClick={goToday}
                    >
                      Today
                    </button>
                    <button
                      type='button'
                      className={styles.btn}
                      onClick={goNext}
                    >
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

              <div
                className={`${styles.gridDays} ${loading ? styles.gridDaysLoading : ""}`}
              >
                {grid.map((d) => {
                  const ymd = ymdInTz(d, timeZone);
                  const isOtherMonth =
                    d.getUTCMonth() !== monthDate.getUTCMonth();
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
                      aria-label={`${ymd}${count > 0 ? `, ${count} ride${count > 1 ? "s" : ""}` : ""}`}
                    >
                      <span className={styles.dayNum}>{d.getUTCDate()}</span>
                      {count > 0 && (
                        <span className={styles.countPill}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className={styles.monthStats}>
                <div
                  className={styles.monthStatsItem}
                  style={{ marginBottom: "1rem" }}
                >
                  <span
                    className='subheading'
                    style={{ textDecoration: "underline" }}
                  >
                    Rides this month:
                  </span>{" "}
                  <span className='subheading emptyTitle'>{monthTotal}</span>
                </div>
                <div className={styles.monthStatsItem}>
                  <span
                    className='subheading'
                    style={{ textDecoration: "underline" }}
                  >
                    Upcoming:
                  </span>{" "}
                  <span className='subheading emptyTitle'>
                    {selectedDriver.upcomingCount}
                  </span>
                </div>
              </div>

              {/* Mobile legend */}
              <div className={styles.mobileLegend}>
                <div className={styles.legendItem}>
                  <span
                    className={`${styles.legendDot} ${styles.legendToday}`}
                  />
                  <span>Today</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendHas}`} />
                  <span>Has rides</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className='emptyTitle'>Select a driver</p>
            <p className='miniNote'>
              Choose a driver from the list to view their schedule.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DriverAvatar({
  driver,
  size = 48,
}: {
  driver: DriverInfo;
  size?: number;
}) {
  const displayName = driver.name?.trim() || driver.email;
  const initials = displayName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  if (driver.image) {
    return (
      <Image
        src={driver.image}
        alt={displayName}
        width={size}
        height={size}
        className={styles.avatar}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={styles.avatarFallback}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      aria-hidden='true'
    >
      {initials}
    </div>
  );
}

function DriverRow({
  driver,
  selected,
  inactive = false,
  onClick,
}: {
  driver: DriverInfo;
  selected: boolean;
  inactive?: boolean;
  onClick: () => void;
}) {
  const displayName = driver.name?.trim() || driver.email;

  return (
    <button
      type='button'
      onClick={onClick}
      className={`${styles.driverRow} ${selected ? styles.driverRowSelected : ""} ${inactive ? styles.driverRowInactive : ""}`}
      aria-pressed={selected}
    >
      <div className={styles.driverRowAvatar}>
        <DriverAvatar driver={driver} size={42} />
        {inactive && <span className={styles.inactiveDot} />}
      </div>
      <div className={styles.driverRowInfo}>
        <span className={styles.driverRowName}>{displayName}</span>
        <span className={styles.driverRowSub}>
          {driver.upcomingCount > 0
            ? `${driver.upcomingCount} upcoming`
            : "No upcoming rides"}
        </span>
      </div>
      {selected && (
        <span className={styles.selectedIndicator} aria-hidden='true' />
      )}
    </button>
  );
}
