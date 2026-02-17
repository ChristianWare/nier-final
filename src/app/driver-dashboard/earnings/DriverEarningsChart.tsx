/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Rectangle,
} from "recharts";
import styles from "./DriverEarningsPage.module.css";

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

const BAR_RADIUS_TOP: [number, number, number, number] = [10, 10, 0, 0];
const BAR_RADIUS_NONE: [number, number, number, number] = [0, 0, 0, 0];

function TipBarShape(props: any) {
  const { x, y, width, height, fill, payload } = props;
  const hasTip = Number(payload?.tipCents ?? 0) > 0;
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      radius={hasTip ? BAR_RADIUS_TOP : BAR_RADIUS_NONE}
    />
  );
}

function BaseBarShape(props: any) {
  const { x, y, width, height, fill, payload } = props;
  const hasTip = Number(payload?.tipCents ?? 0) > 0;
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      radius={hasTip ? BAR_RADIUS_NONE : BAR_RADIUS_TOP}
    />
  );
}

export default function DriverEarningsChart({
  data,
  currency,
}: {
  data: {
    key: string;
    tick: string;
    label: string;
    baseCents: number;
    tipCents: number;
    totalCents: number;
    count: number;
  }[];
  currency: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--paragraph)",
          fontSize: "1.4rem",
        }}
      >
        No earnings data available for this period
      </div>
    );
  }

  return (
    <div className={styles.chartInner}>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.swatch} data-tone='base' />
          <span className='miniNote'>Base Pay</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.swatch} data-tone='tip' />
          <span className='miniNote'>Tips</span>
        </div>
      </div>

      <div className={styles.chartCanvas}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 10, bottom: 6, left: 10 }}
          >
            <CartesianGrid stroke='rgba(0,0,0,0.08)' vertical={false} />

            <XAxis
              dataKey='tick'
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              interval='preserveStartEnd'
              minTickGap={16}
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
                      <span className='miniNote'>Base Pay</span>
                      <span className={styles.tooltipVal}>
                        {formatMoney(row.baseCents ?? 0, currency)}
                      </span>
                    </div>
                    <div className={styles.tooltipRow}>
                      <span className='miniNote'>Tips</span>
                      <span className={styles.tooltipVal}>
                        {formatMoney(row.tipCents ?? 0, currency)}
                      </span>
                    </div>
                    <div className={styles.tooltipRow}>
                      <span className='miniNote'>Total</span>
                      <span className={styles.tooltipVal}>
                        {formatMoney(row.totalCents ?? 0, currency)}
                      </span>
                    </div>
                    <div className={styles.tooltipRow}>
                      <span className='miniNote'>Trips</span>
                      <span className={styles.tooltipVal}>
                        {row.count ?? 0}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            <Bar
              dataKey='baseCents'
              stackId='earnings'
              fill='var(--lightGreen)'
              shape={<BaseBarShape />}
            />
            <Bar
              dataKey='tipCents'
              stackId='earnings'
              fill='var(--accentBlue, #3b82f6)'
              shape={<TipBarShape />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
