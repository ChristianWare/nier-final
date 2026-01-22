"use client";

import Button from "@/components/shared/Button/Button";
import CountUp from "@/components/shared/CountUp/CountUp";
import styles from "./AdminFinanceSnapshot.module.css";
import AdminFinanceMiniChart from "./AdminFinanceMiniChart";

export type AdminFinanceSnapshotChartPoint = {
  key: string; // YYYY-MM-DD (Phoenix)
  tick: string; // MM/DD
  label: string; // e.g. "Jan 21, 2026"
  capturedCents: number;
  refundedCents: number;
  netCents: number;
  count: number;
};

export type AdminFinanceSnapshotProps = {
  monthLabel: string;
  currency?: string;

  capturedMonthCents: number;
  capturedTodayCents: number;

  paidCountMonth: number;
  avgOrderValueMonthCents: number;

  refundsMonthCents: number;
  refundCountMonth: number;

  pendingPaymentCount: number;
  pendingPaymentAmountCents: number;

  monthOverMonthPct: number | null;

  chartData?: AdminFinanceSnapshotChartPoint[];
};

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Parse a formatted value (e.g., "$1,234" or "5") into numeric value and prefix/suffix
 */
function parseValue(str: string): {
  value: number;
  prefix: string;
  suffix: string;
} {
  // Remove commas and spaces for parsing
  const cleaned = str.replace(/,/g, "").trim();

  // Try to match: optional prefix (like $) + number + optional suffix (like k, %, +)
  const match = cleaned.match(/^([^\d.-]*)([+-]?\d+(?:\.\d+)?)([^\d]*)$/);

  if (match) {
    const prefix = match[1] || "";
    const value = parseFloat(match[2]) || 0;
    const suffix = match[3] || "";
    return { value, prefix, suffix };
  }

  // Fallback: try to parse as a plain number
  const numValue = parseFloat(cleaned);
  if (!isNaN(numValue)) {
    return { value: numValue, prefix: "", suffix: "" };
  }

  // If all else fails, return the original string as suffix with 0 value
  return { value: 0, prefix: "", suffix: str };
}

export default function AdminFinanceSnapshot({
  monthLabel,
  currency = "USD",

  capturedMonthCents,
  capturedTodayCents,

  paidCountMonth,
  avgOrderValueMonthCents,

  refundsMonthCents,
  refundCountMonth,

  pendingPaymentCount,
  pendingPaymentAmountCents,

  chartData,
}: AdminFinanceSnapshotProps) {
  const netMonthCents = Math.max(0, capturedMonthCents - refundsMonthCents);

  return (
    <section className={styles.container} aria-label='Finance snapshot'>
      <header className='header'>
        <h2 className='cardTitle h4'>{monthLabel} - Daily Earnings</h2>
      </header>

      {Array.isArray(chartData) && chartData.length > 0 ? (
        <div className={styles.chartWrap}>
          <div className={styles.chartHeader}>
            <div className='emptyTitle underline'>Month to date</div>
            <div className='miniNote'>Daily net with captured & refunded</div>
          </div>
          <AdminFinanceMiniChart data={chartData} currency={currency} />
        </div>
      ) : null}

      <div className={styles.grid}>
        <MetricCard
          label='Captured (month)'
          value={formatMoney(capturedMonthCents, currency)}
          sub={`${paidCountMonth} payment${paidCountMonth === 1 ? "" : "s"}`}
        />

        <MetricCard
          label='Captured (today)'
          value={formatMoney(capturedTodayCents, currency)}
          sub='Today'
        />

        <MetricCard
          label='Avg order value'
          value={formatMoney(avgOrderValueMonthCents, currency)}
          sub='This month'
        />

        <MetricCard
          label='Refunded (month)'
          value={formatMoney(refundsMonthCents, currency)}
          sub={`${refundCountMonth} refund${refundCountMonth === 1 ? "" : "s"}`}
          tone='warn'
        />

        <MetricCard
          label='Pending payment'
          value={String(pendingPaymentCount)}
          sub={
            pendingPaymentAmountCents > 0
              ? `Est. ${formatMoney(pendingPaymentAmountCents, currency)}`
              : "Awaiting payment"
          }
          tone={pendingPaymentCount > 0 ? "warn" : "neutral"}
        />

        <MetricCard
          label='Net (month)'
          value={formatMoney(netMonthCents, currency)}
          sub='Captured minus refunded'
          tone='good'
        />
      </div>

      <div className={styles.btnContainer}>
        <Button
          href='/admin/earnings'
          text='See all earnings'
          btnType='black'
          arrow
        />
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
  const { value: numericValue, prefix, suffix } = parseValue(value);

  return (
    <div className={`${styles.card} ${styles[`tone_${tone}`]}`}>
      <div className={styles.cardTop}>
        <div className='emptyTitle underline'>{label}</div>
      </div>

      <div className='kpiValue'>
        {prefix && <span>{prefix}</span>}
        <CountUp
          from={0}
          to={numericValue}
          duration={1.5}
          separator=','
          delay={0.1}
        />
        {suffix && <span>{suffix}</span>}
      </div>

      {sub ? (
        <div className='miniNote'>{sub}</div>
      ) : (
        <div className='miniNote' />
      )}
    </div>
  );
}
