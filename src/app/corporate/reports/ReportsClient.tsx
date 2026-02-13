/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useMemo } from "react";
import styles from "./CorporateReports.module.css";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

type Booking = {
  id: string;
  pickupAt: string;
  totalCents: number;
  status: string;
  service: string;
  passengerId: string;
  passengerName: string;
  department: string;
};

type MonthBucket = { key: string; label: string; spend: number; rides: number };
type NameBucket = { name: string; spend: number; rides: number };

type Props = {
  bookings: Booking[];
  departments: string[];
  monthStartIso: string;
  companyTimezone: string;
};

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */

const PERIOD_OPTIONS = [
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "LAST_3", label: "Last 3 Months" },
  { value: "LAST_6", label: "Last 6 Months" },
  { value: "YTD", label: "Year to Date" },
  { value: "ALL", label: "All Time" },
  { value: "CUSTOM", label: "Custom Range" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["value"];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMonthLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function monthKey(iso: string, timeZone: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  })
    .format(d)
    .replace("/", "-");
}

function getDateRange(
  period: Period,
  monthStartIso: string,
  customFrom: string,
  customTo: string,
): [Date | null, Date | null] {
  const now = new Date();
  const ms = new Date(monthStartIso);

  switch (period) {
    case "THIS_MONTH":
      return [ms, null];
    case "LAST_MONTH": {
      const prev = new Date(ms);
      prev.setMonth(prev.getMonth() - 1);
      return [prev, ms];
    }
    case "LAST_3": {
      const d = new Date(ms);
      d.setMonth(d.getMonth() - 2);
      return [d, null];
    }
    case "LAST_6": {
      const d = new Date(ms);
      d.setMonth(d.getMonth() - 5);
      return [d, null];
    }
    case "YTD": {
      const jan1 = new Date(now.getFullYear(), 0, 1);
      return [jan1, null];
    }
    case "ALL":
      return [null, null];
    case "CUSTOM": {
      const from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      const to = customTo ? new Date(customTo + "T23:59:59") : null;
      return [from, to];
    }
    default:
      return [null, null];
  }
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function ReportsClient({
  bookings,
  departments,
  monthStartIso,
  companyTimezone,
}: Props) {
  const [period, setPeriod] = useState<Period>("THIS_MONTH");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // ─── Filtered bookings ───
  const filtered = useMemo(() => {
    const [from, to] = getDateRange(
      period,
      monthStartIso,
      customFrom,
      customTo,
    );
    return bookings.filter((b) => {
      const d = new Date(b.pickupAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [bookings, period, monthStartIso, customFrom, customTo]);

  // ─── KPIs ───
  const totalSpend = filtered.reduce((s, b) => s + b.totalCents, 0);
  const totalRides = filtered.length;
  const avgPerRide = totalRides > 0 ? Math.round(totalSpend / totalRides) : 0;
  const uniquePassengers = new Set(
    filtered.map((b) => b.passengerId).filter(Boolean),
  ).size;

  // ─── Monthly breakdown ───
  const monthlyData = useMemo(() => {
    const map = new Map<string, MonthBucket>();
    for (const b of filtered) {
      const mk = monthKey(b.pickupAt, companyTimezone);
      const existing = map.get(mk);
      if (existing) {
        existing.spend += b.totalCents;
        existing.rides += 1;
      } else {
        map.set(mk, {
          key: mk,
          label: formatMonthLabel(b.pickupAt, companyTimezone),
          spend: b.totalCents,
          rides: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [filtered, companyTimezone]);

  // ─── By department ───
  const deptData = useMemo(() => {
    const map = new Map<string, NameBucket>();
    for (const b of filtered) {
      const dept = b.department || "No Department";
      const existing = map.get(dept);
      if (existing) {
        existing.spend += b.totalCents;
        existing.rides += 1;
      } else {
        map.set(dept, { name: dept, spend: b.totalCents, rides: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [filtered]);

  // ─── By employee (top 10) ───
  const employeeData = useMemo(() => {
    const map = new Map<string, NameBucket>();
    for (const b of filtered) {
      const key = b.passengerId || "unassigned";
      const existing = map.get(key);
      if (existing) {
        existing.spend += b.totalCents;
        existing.rides += 1;
      } else {
        map.set(key, { name: b.passengerName, spend: b.totalCents, rides: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend).slice(0, 10);
  }, [filtered]);

  // ─── By service type ───
  const serviceData = useMemo(() => {
    const map = new Map<string, NameBucket>();
    for (const b of filtered) {
      const existing = map.get(b.service);
      if (existing) {
        existing.spend += b.totalCents;
        existing.rides += 1;
      } else {
        map.set(b.service, {
          name: b.service,
          spend: b.totalCents,
          rides: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [filtered]);

  const maxMonthly = Math.max(1, ...monthlyData.map((d) => d.spend));
  const maxDept = Math.max(1, ...deptData.map((d) => d.spend));
  const maxEmployee = Math.max(1, ...employeeData.map((d) => d.spend));
  const maxService = Math.max(1, ...serviceData.map((d) => d.spend));

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <h2 className='heading h3'>Reports</h2>
        <p className={styles.meta}>
          Spending breakdowns and usage analytics for your corporate account.
        </p>
      </div>

      <div className={styles.filters}>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className='selectBorder'
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {period === "CUSTOM" && (
          <div className={styles.dateRange}>
            <input
              type='date'
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={`formInput ${styles.dateInput}`}
              title='From date'
            />
            <span className={styles.dateSep}>to</span>
            <input
              type='date'
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={`formInput ${styles.dateInput}`}
              title='To date'
            />
          </div>
        )}
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Spend</span>
          <span className={styles.kpiValue}>{formatMoney(totalSpend)}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Rides</span>
          <span className={styles.kpiValue}>{totalRides}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avg Cost / Ride</span>
          <span className={styles.kpiValue}>{formatMoney(avgPerRide)}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Passengers</span>
          <span className={styles.kpiValue}>{uniquePassengers}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No data for this period</p>
          <p className={styles.emptySub}>
            {bookings.length === 0
              ? "Booking data will appear here once rides are completed."
              : "Try selecting a different time period."}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Spend by Month</h3>
            <div className={styles.breakdownList}>
              {monthlyData.map((d) => (
                <BreakdownRow
                  key={d.key}
                  label={d.label}
                  spend={d.spend}
                  rides={d.rides}
                  max={maxMonthly}
                />
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Spend by Department</h3>
            {deptData.length === 0 ? (
              <p className={styles.cardEmpty}>No department data available.</p>
            ) : (
              <div className={styles.breakdownList}>
                {deptData.map((d) => (
                  <BreakdownRow
                    key={d.name}
                    label={d.name}
                    spend={d.spend}
                    rides={d.rides}
                    max={maxDept}
                  />
                ))}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Top Employees by Spend</h3>
            <div className={styles.breakdownList}>
              {employeeData.map((d, i) => (
                <BreakdownRow
                  key={d.name + i}
                  label={d.name}
                  spend={d.spend}
                  rides={d.rides}
                  max={maxEmployee}
                />
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Spend by Service Type</h3>
            <div className={styles.breakdownList}>
              {serviceData.map((d) => (
                <BreakdownRow
                  key={d.name}
                  label={d.name}
                  spend={d.spend}
                  rides={d.rides}
                  max={maxService}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Breakdown Row with visual bar
   ───────────────────────────────────────────── */

function BreakdownRow({
  label,
  spend,
  rides,
  max,
}: {
  label: string;
  spend: number;
  rides: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((spend / max) * 100) : 0;

  return (
    <div className={styles.breakdownRow}>
      <div className={styles.breakdownTop}>
        <span className={styles.breakdownLabel}>{label}</span>
        <span className={styles.breakdownStats}>
          <strong>{formatMoney(spend)}</strong>
          <span className={styles.breakdownRides}>
            {rides} ride{rides !== 1 ? "s" : ""}
          </span>
        </span>
      </div>
      <div className={styles.barBg}>
        <div
          className={styles.barFill}
          style={{ ["--bar-pct" as string]: `${pct}%` }}
        />
      </div>
    </div>
  );
}
