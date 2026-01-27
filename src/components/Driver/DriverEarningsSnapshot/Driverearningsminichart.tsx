/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import styles from "./DriverEarningsSnapshot.module.css";

type ChartPoint = {
  key: string;
  tick: string;
  label: string;
  earningsCents: number;
  tripCount: number;
};

type Props = {
  data: ChartPoint[];
  currency?: string;
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function CustomTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: any[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{point.label}</div>
      <div className={styles.tooltipRow}>
        <span>Earnings</span>
        <span className={styles.tooltipVal}>
          {formatMoney(point.earningsCents, currency)}
        </span>
      </div>
      <div className={styles.tooltipRow}>
        <span>Trips</span>
        <span className={styles.tooltipVal}>{point.tripCount}</span>
      </div>
    </div>
  );
}

export default function DriverEarningsMiniChart({
  data,
  currency = "USD",
}: Props) {
  return (
    <div className={styles.chartCanvas}>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray='3 3'
            vertical={false}
            stroke='rgba(0,0,0,0.06)'
          />
          <XAxis
            dataKey='tick'
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
            interval='preserveStartEnd'
          />
          <YAxis
            tickFormatter={(v) => `$${Math.round(v / 100)}`}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar
            dataKey='earningsCents'
            fill='#22c55e'
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
