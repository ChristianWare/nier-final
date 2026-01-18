import styles from "./AdminFinanceSnapshot.module.css";

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
};

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(v: number) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${Math.round(v)}%`;
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

  monthOverMonthPct,
}: AdminFinanceSnapshotProps) {
  const netMonthCents = Math.max(0, capturedMonthCents - refundsMonthCents);

  return (
    <section className={styles.container} aria-label='Finance snapshot'>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h2 className='cardTitle h4'>Finance</h2>
          <div className='miniNote'>{monthLabel}</div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.bigValue}>
            {formatMoney(netMonthCents, currency)}
          </div>
          <div className={styles.bigSub}>
            <span className='miniNote'>Net this month</span>
            {typeof monthOverMonthPct === "number" ? (
              <span
                className={`${styles.delta} ${
                  monthOverMonthPct > 0
                    ? styles.deltaUp
                    : monthOverMonthPct < 0
                      ? styles.deltaDown
                      : styles.deltaFlat
                }`}
              >
                {formatPct(monthOverMonthPct)}
              </span>
            ) : null}
          </div>
        </div>
      </header>

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
          sub='Captured - refunds'
          tone='good'
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

      <div className={styles.cardValue}>{value}</div>

      {sub ? (
        <div className='miniNote'>{sub}</div>
      ) : (
        <div className='miniNote' />
      )}
    </div>
  );
}
