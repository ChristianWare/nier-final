/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
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
import styles from "./AdminReportsPage.module.css";

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

const POS_RADIUS: [number, number, number, number] = [6, 6, 0, 0];
const NEG_RADIUS: [number, number, number, number] = [0, 0, 6, 6];

function NetBarShape(props: any) {
  const { x, y, width, height, fill, payload } = props;
  const v = Number(payload?.netCents ?? 0);

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      radius={v >= 0 ? POS_RADIUS : NEG_RADIUS}
    />
  );
}

export default function RevenueChart({
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
    refundedCount?: number;
  }[];
  currency: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Allow wheel events to propagate for page scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Don't prevent default - let the page scroll
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className={styles.revenueChartInner} ref={containerRef}>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.swatch} data-tone='net' />
          <span>Net Revenue</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.swatch} data-tone='captured' />
          <span>Captured</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.swatch} data-tone='refunded' />
          <span>Refunded</span>
        </div>
      </div>

      <div className={styles.revenueChartCanvas}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <CartesianGrid stroke='rgba(0,0,0,0.06)' vertical={false} />

            <ReferenceLine y={0} stroke='rgba(0,0,0,0.12)' />

            <XAxis
              dataKey='tick'
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              interval='preserveStartEnd'
              minTickGap={20}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              width={60}
              tickFormatter={(v) => formatMoney(Number(v || 0), currency)}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as any;
                return (
                  <div className={styles.tooltip}>
                    <div className={styles.tooltipTitle}>{row.label}</div>
                    <div className={styles.tooltipGrid}>
                      <span className={styles.tooltipLabel}>Captured</span>
                      <span className={styles.tooltipValue}>
                        {formatMoney(row.capturedCents ?? 0, currency)}
                      </span>
                      <span className={styles.tooltipLabel}>Refunded</span>
                      <span className={styles.tooltipValue}>
                        {formatMoney(row.refundedCents ?? 0, currency)}
                      </span>
                      <span className={styles.tooltipLabel}>Net</span>
                      <span className={styles.tooltipValue}>
                        {formatMoney(row.netCents ?? 0, currency)}
                      </span>
                      <span className={styles.tooltipLabel}>Payments</span>
                      <span className={styles.tooltipValue}>
                        {row.count ?? 0}
                      </span>
                      {typeof row.refundedCount === "number" && (
                        <>
                          <span className={styles.tooltipLabel}>Refunds</span>
                          <span className={styles.tooltipValue}>
                            {row.refundedCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            <Bar dataKey='netCents' shape={<NetBarShape />}>
              {data.map((d, i) => (
                <Cell
                  key={`${d.key}-${i}`}
                  fill={d.netCents < 0 ? "#ef4444" : "#10b981"}
                />
              ))}
            </Bar>

            <Line
              type='monotone'
              dataKey='capturedCents'
              stroke='#111827'
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#111827" }}
            />
            <Line
              type='monotone'
              dataKey='refundedCents'
              stroke='#ef4444'
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#ef4444" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
