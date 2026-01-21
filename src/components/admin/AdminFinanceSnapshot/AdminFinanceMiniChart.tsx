/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import styles from "./AdminFinanceSnapshot.module.css";

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminFinanceMiniChart({
  data,
  currency,
}: {
  data: {
    key: string;
    tick: string;
    label: string;
    capturedCents: number;
    refundedCents: number;
    netCents: number;
    count: number;
  }[];
  currency: string;
}) {
  return (
    <div className={styles.chartCanvas}>
      <ResponsiveContainer width='100%' height='100%'>
        <ComposedChart
          data={data}
          margin={{ top: 6, right: 10, bottom: 0, left: 10 }}
        >
          <CartesianGrid stroke='rgba(0,0,0,0.08)' vertical={false} />
          <XAxis
            dataKey='tick'
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            interval='preserveStartEnd'
            minTickGap={14}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            width={56}
            tickFormatter={(v) => formatMoney(Number(v || 0), currency)}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = payload[0]?.payload as any;
              return (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipTitle}>{row.label}</div>
                  <div className={styles.tooltipRow}>
                    <span className='miniNote'>Net</span>
                    <span className={styles.tooltipVal}>
                      {formatMoney(row.netCents ?? 0, currency)}
                    </span>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span className='miniNote'>Captured</span>
                    <span className={styles.tooltipVal}>
                      {formatMoney(row.capturedCents ?? 0, currency)}
                    </span>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span className='miniNote'>Refunded</span>
                    <span className={styles.tooltipVal}>
                      {formatMoney(row.refundedCents ?? 0, currency)}
                    </span>
                  </div>
                  <div className={styles.tooltipRow}>
                    <span className='miniNote'>Payments</span>
                    <span className={styles.tooltipVal}>{row.count ?? 0}</span>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey='netCents'
            fill='var(--lightGreen)'
            radius={[10, 10, 0, 0]}
          />
          <Line
            type='monotone'
            dataKey='capturedCents'
            stroke='var(--black)'
            strokeWidth={2}
            dot={false}
          />
          <Line
            type='monotone'
            dataKey='refundedCents'
            stroke='var(--red)'
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
