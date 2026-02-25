"use client";

import styles from "./AdminDriversCalendarPanel.module.css";
import { useState, useCallback, useMemo } from "react";
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
  initialDataByDriver: Record<string, Record<string, number>>;
  initialMonth: string;
  todayYmd: string;
  timeZone: string;
}

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

  const [countsByYmd, setCountsByYmd] = useState<Record<string, number>>(
    () => initialDataByDriver[selectedId ?? ""] ?? {},
  );
  const [loading, setLoading] = useState(false);

  function selectDriver(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    const mk = monthKeyFromUTCNoon(monthDate);
    const initial = initialDataByDriver[id];
    if (mk === initialMonth && initial) {
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

  // Mobile agenda — only days in this month that have rides
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

  const grid = buildGrid(monthDate);
  const label = monthLabel(monthDate, timeZone);
  const mk = monthKeyFromUTCNoon(monthDate);

  const monthTotal = Object.entries(countsByYmd)
    .filter(([ymd]) => ymd.startsWith(mk))
    .reduce((sum, [, c]) => sum + c, 0);

  const selectedDriver = allDrivers.find((d) => d.id === selectedId) ?? null;

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className='cardTitle h5'>Drivers</span>
        </div>

        {/* Mobile dropdown */}
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

              {/* ── Desktop grid ── */}
              <div className={styles.desktopGrid}>
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

                <div className={styles.mobileLegend}>
                  <div className={styles.legendItem}>
                    <span
                      className={`${styles.legendDot} ${styles.legendToday}`}
                    />
                    <span>Today</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span
                      className={`${styles.legendDot} ${styles.legendHas}`}
                    />
                    <span>Has rides</span>
                  </div>
                </div>
              </div>

              {/* ── Mobile agenda ── */}
              <div
                className={`${styles.mobileAgenda} ${loading ? styles.gridDaysLoading : ""}`}
              >
                {agendaDays.length === 0 ? (
                  <div className={styles.agendaEmpty}>
                    <span className={styles.agendaEmptyIcon}>📭</span>
                    <p className={styles.agendaEmptyText}>
                      No rides this month
                    </p>
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
                            <span className={styles.agendaDow}>
                              {dayOfWeek}
                            </span>
                            <span className={styles.agendaDay}>{dayNum}</span>
                            <span className={styles.agendaMon}>
                              {monthName}
                            </span>
                          </div>

                          <div className={styles.agendaContent}>
                            <div className={styles.agendaRideChip}>
                              <span className={styles.agendaRideCount}>
                                {count}
                              </span>
                              <span className={styles.agendaRideLabel}>
                                {count === 1 ? "ride" : "rides"}
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
                    <span className={styles.agendaStatValue}>{monthTotal}</span>
                    <span className={styles.agendaStatLabel}>This Month</span>
                  </div>
                  <div className={styles.agendaStatDivider} />
                  <div className={styles.agendaStatItem}>
                    <span className={styles.agendaStatValue}>
                      {selectedDriver.upcomingCount}
                    </span>
                    <span className={styles.agendaStatLabel}>Upcoming</span>
                  </div>
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
