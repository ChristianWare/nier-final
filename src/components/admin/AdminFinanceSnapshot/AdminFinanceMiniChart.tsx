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
  ReferenceLine,
  Cell,
  Rectangle,
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

function NetBarShape(props: any) {
  const { x, y, width, height, fill, payload } = props;
  const v = Number(payload?.netCents ?? 0);

  const radius: [number, number, number, number] =
    v >= 0 ? [10, 10, 0, 0] : [0, 0, 10, 10];

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      radius={radius}
    />
  );
}

export default function AdminFinanceMiniChart({
  data,
  currency,
}: {
  data: {
    key: string; // YYYY-MM-DD (Phoenix)
    tick: string; // MM/DD
    label: string; // e.g. "Jan 21, 2026"
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
          <ReferenceLine y={0} stroke='rgba(0,0,0,0.12)' />

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

          <Bar dataKey='netCents' shape={<NetBarShape />}>
            {data.map((d, i) => (
              <Cell
                key={`${d.key}-${i}`}
                fill={d.netCents < 0 ? "var(--red)" : "var(--lightGreen)"}
              />
            ))}
          </Bar>

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
