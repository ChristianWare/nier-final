import Button from "@/components/shared/Button/Button";
import styles from "./AdminFinanceSnapshot.module.css";
import AdminFinanceMiniChart from "./AdminFinanceMiniChart";

export type AdminFinanceSnapshotChartPoint = {
  key: string;
  tick: string;
  label: string;
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
        <h2 className='cardTitle h4'>{monthLabel} - Earnings</h2>
      </header>

      {Array.isArray(chartData) && chartData.length > 0 ? (
        <div className={styles.chartWrap}>
          <div className={styles.chartHeader}>
            <div className='emptyTitle underline'>Last 12 months</div>
            <div className='miniNote'>Net with captured & refunded</div>
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
  return (
    <div className={`${styles.card} ${styles[`tone_${tone}`]}`}>
      <div className={styles.cardTop}>
        <div className='emptyTitle underline'>{label}</div>
      </div>

      <div className='emptyTitleSmall'>{value}</div>

      {sub ? (
        <div className='miniNote'>{sub}</div>
      ) : (
        <div className='miniNote' />
      )}
    </div>
  );
}
