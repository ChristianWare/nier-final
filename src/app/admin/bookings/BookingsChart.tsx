/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import styles from "./BookingsChart.module.css";
import type {
  BookingsChartData,
  ChartBasis,
  ChartBreakdown,
} from "@/lib/booking/bookingsChart";

type Option = { value: string; label: string; href: string };

type Props = {
  data: BookingsChartData;
  basis: ChartBasis;
  /** Null when the time range only makes sense by pickup date. */
  basisHrefs: { pickup: string; created: string } | null;
  breakdown: ChartBreakdown;
  breakdownOptions: Option[];
  monthOptions: Option[];
  /** Matches a monthOptions value, or "" when the list isn't on a whole month. */
  selectedMonth: string;
  /** Bucket key → link that filters the list to that bucket. */
  bucketHrefs: Record<string, string>;
  comparison: {
    thisLabel: string;
    thisRides: number;
    lastLabel: string;
    lastRides: number;
  } | null;
  currency?: string;
};

const GRANULARITY_LABEL = {
  hour: "by hour",
  day: "by day",
  week: "by week",
  month: "by month",
} as const;

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function ChartTooltip({
  active,
  payload,
  labels,
  series,
}: {
  active?: boolean;
  payload?: any[];
  labels: Record<string, string>;
  series: BookingsChartData["series"];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const shown = series.filter((s) => (row[s.key] ?? 0) > 0);
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{labels[row.key] ?? row.key}</div>
      {shown.map((s) => (
        <div key={s.key} className={styles.tooltipRow}>
          <span className={styles.swatch} style={{ background: s.color }} />
          <span>{s.label}</span>
          <strong>{row[s.key]}</strong>
        </div>
      ))}
      <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}>
        <span />
        <span>Total</span>
        <strong>{row.total ?? 0}</strong>
      </div>
    </div>
  );
}

export default function BookingsChart({
  data,
  basis,
  basisHrefs,
  breakdown,
  breakdownOptions,
  monthOptions,
  selectedMonth,
  bucketHrefs,
  comparison,
  currency = "USD",
}: Props) {
  const router = useRouter();
  const { buckets, series, summary, granularity, todayKey } = data;

  const rows = buckets.map((b) => ({
    key: b.key,
    total: b.total,
    ...b.values,
  }));
  const ticks = Object.fromEntries(buckets.map((b) => [b.key, b.tick]));
  const labels = Object.fromEntries(buckets.map((b) => [b.key, b.label]));
  const clickable = granularity !== "hour";

  const go = (key: string | undefined) => {
    const href = key ? bucketHrefs[key] : undefined;
    if (href) router.push(href);
  };

  const navigate = (options: Option[], value: string) => {
    const href = options.find((o) => o.value === value)?.href;
    if (href) router.push(href);
  };

  const lostRate =
    summary.lostRate == null ? "—" : `${Math.round(summary.lostRate * 100)}%`;

  return (
    <details className={styles.card} open>
      <summary className={styles.cardHeader}>
        <span className={styles.title}>Bookings chart</span>
        <span className={styles.subtitle}>
          {summary.rides} {summary.rides === 1 ? "ride" : "rides"} ·{" "}
          {basis === "created" ? "by booked date" : "by pickup date"},{" "}
          {GRANULARITY_LABEL[granularity]}
        </span>
      </summary>

      <div className={styles.body}>
        <div className={styles.controls}>
          {basisHrefs ? (
            <div
              className={styles.segmented}
              role='group'
              aria-label='Count by'
            >
              <span className={styles.controlLabel}>Count by</span>
              <Link
                href={basisHrefs.pickup}
                className={basis === "pickup" ? styles.segActive : styles.seg}
                aria-current={basis === "pickup" ? "true" : undefined}
              >
                Pickup date
              </Link>
              <Link
                href={basisHrefs.created}
                className={basis === "created" ? styles.segActive : styles.seg}
                aria-current={basis === "created" ? "true" : undefined}
              >
                Booked date
              </Link>
            </div>
          ) : null}

          <label className={styles.control}>
            <span className={styles.controlLabel}>Break down by</span>
            <select
              className={styles.select}
              value={breakdown}
              onChange={(e) => navigate(breakdownOptions, e.target.value)}
            >
              {breakdownOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            <span className={styles.controlLabel}>Month</span>
            <select
              className={styles.select}
              value={selectedMonth}
              onChange={(e) => navigate(monthOptions, e.target.value)}
            >
              {selectedMonth === "" ? (
                <option value='' disabled>
                  Pick a month
                </option>
              ) : null}
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Rides</span>
            <strong className={styles.kpiValue}>{summary.rides}</strong>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Trips</span>
            <strong className={styles.kpiValue}>{summary.trips}</strong>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Done</span>
            <strong className={styles.kpiValue}>{summary.done}</strong>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Upcoming</span>
            <strong className={styles.kpiValue}>{summary.upcoming}</strong>
            {summary.needsAction > 0 ? (
              <span className={styles.kpiNote}>
                {summary.needsAction} need action
              </span>
            ) : null}
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Cancelled / no-show</span>
            <strong className={styles.kpiValue}>{lostRate}</strong>
            <span className={styles.kpiNote}>{summary.lost} lost</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Booked value</span>
            <strong className={styles.kpiValue}>
              {money(summary.bookedValueCents, currency)}
            </strong>
            <span className={styles.kpiNote}>excludes lost rides</span>
          </div>
        </div>

        {comparison ? (
          <p className={styles.comparison}>
            So far this month: <strong>{comparison.thisRides}</strong> rides (
            {comparison.thisLabel}) · Same days last month:{" "}
            <strong>{comparison.lastRides}</strong> ({comparison.lastLabel})
          </p>
        ) : null}

        {buckets.length === 0 ? (
          <p className={styles.empty}>No rides to chart for these filters.</p>
        ) : (
          <>
            <div
              className={styles.chartBox}
              role='img'
              aria-label={`Bar chart of ${summary.rides} rides ${GRANULARITY_LABEL[granularity]}`}
            >
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={rows}
                  margin={{ top: 16, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid stroke='rgba(0,0,0,0.08)' vertical={false} />
                  <XAxis
                    dataKey='key'
                    tickFormatter={(k: string) => ticks[k] ?? k}
                    interval='preserveStartEnd'
                    minTickGap={12}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={<ChartTooltip labels={labels} series={series} />}
                  />
                  {todayKey ? (
                    <ReferenceLine
                      x={todayKey}
                      stroke='var(--black)'
                      strokeDasharray='3 3'
                      label={{ value: "Today", position: "top", fontSize: 11 }}
                    />
                  ) : null}
                  {series.map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      stackId='rides'
                      fill={s.color}
                      cursor={clickable ? "pointer" : undefined}
                      onClick={(d: any) => go(d?.payload?.key ?? d?.key)}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <ul className={styles.legend}>
              {series.map((s) => (
                <li key={s.key} className={styles.legendItem}>
                  <span
                    className={styles.swatch}
                    style={{ background: s.color }}
                  />
                  {s.label}
                </li>
              ))}
            </ul>

            {clickable ? (
              <p className={styles.hint}>
                Click a bar to show those bookings in the list below.
              </p>
            ) : null}
          </>
        )}
      </div>
    </details>
  );
}
