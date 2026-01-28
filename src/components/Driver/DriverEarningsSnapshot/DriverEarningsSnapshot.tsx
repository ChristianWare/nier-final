"use client";

import Link from "next/link";
import styles from "./DriverEarningsSnapshot.module.css";
import DriverEarningsMiniChart from "./Driverearningsminichart";

export type DriverEarningsChartPoint = {
  key: string; // YYYY-MM-DD (Phoenix)
  tick: string; // MM/DD
  label: string; // e.g. "Jan 21, 2026"
  earningsCents: number;
  tripCount: number;
};

export type DriverEarningsSnapshotProps = {
  monthLabel: string;
  currency?: string;

  earningsMonthCents: number;
  earningsTodayCents: number;

  tripCountMonth: number;
  tripCountToday: number;

  avgPerTripCents: number;

  chartData?: DriverEarningsChartPoint[];
};

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMoneyFull(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function DriverEarningsSnapshot({
  monthLabel,
  currency = "USD",
  earningsMonthCents,
  earningsTodayCents,
  tripCountMonth,
  tripCountToday,
  avgPerTripCents,
  chartData,
}: DriverEarningsSnapshotProps) {
  return (
    <section className={styles.container} aria-label='Earnings snapshot'>
      <header className='header'>
        <h2 className='cardTitle h4'>
          {/* <span className={styles.icon}>💰</span> */}
          {monthLabel} - My Earnings
        </h2>
      </header>

      {Array.isArray(chartData) && chartData.length > 0 ? (
        <div className={styles.chartWrap}>
          <div className={styles.chartHeader}>
            <div className='emptyTitle underline'>Month to date</div>
            <div className='miniNote'>Daily earnings breakdown</div>
          </div>
          <DriverEarningsMiniChart data={chartData} currency={currency} />
        </div>
      ) : null}

      <div className={styles.grid}>
        <MetricCard
          label='Earnings (month)'
          value={formatMoney(earningsMonthCents, currency)}
          sub={`${tripCountMonth} trip${tripCountMonth === 1 ? "" : "s"} completed`}
          tone='good'
        />

        <MetricCard
          label='Earnings (today)'
          value={formatMoney(earningsTodayCents, currency)}
          sub={`${tripCountToday} trip${tripCountToday === 1 ? "" : "s"} today`}
        />

        <MetricCard
          label='Avg per trip'
          value={formatMoneyFull(avgPerTripCents, currency)}
          sub='This month'
        />
      </div>

      <div className={styles.btnContainer}>
        <Link href='/driver-dashboard/earnings' className='primaryBtn'>
          View detailed earnings →
        </Link>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div className={`${styles.card} ${styles[`tone_${tone}`]}`}>
      <div className={styles.cardTop}>
        <div className='emptyTitle underline'>{label}</div>
      </div>

      <div className='kpiValue'>{value}</div>

      {sub ? (
        <div className='miniNote'>{sub}</div>
      ) : (
        <div className='miniNote' />
      )}
    </div>
  );
}
