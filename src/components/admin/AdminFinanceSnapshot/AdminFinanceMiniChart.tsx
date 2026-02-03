/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Legend,
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
    v >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6];

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

function CustomLegend() {
  return (
    <div className={styles.chartLegend}>
      <div className={styles.legendItem}>
        <span
          className={styles.legendColor}
          style={{ background: "var(--lightGreen)" }}
        />
        <span>Daily Net Earnings</span>
      </div>
      <div className={styles.legendItem}>
        <span
          className={styles.legendColor}
          style={{
            background: "var(--black)",
            height: "3px",
            borderRadius: "2px",
          }}
        />
        <span>Captured</span>
      </div>
      <div className={styles.legendItem}>
        <span
          className={styles.legendColor}
          style={{
            background: "var(--red)",
            height: "3px",
            borderRadius: "2px",
          }}
        />
        <span>Refunded</span>
      </div>
    </div>
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
  // Calculate totals for the period
  const totals = data.reduce(
    (acc, d) => ({
      captured: acc.captured + d.capturedCents,
      refunded: acc.refunded + d.refundedCents,
      net: acc.net + d.netCents,
      payments: acc.payments + d.count,
    }),
    { captured: 0, refunded: 0, net: 0, payments: 0 },
  );

  return (
    <div className={styles.chartContainer}>
      {/* Summary row */}
      <div className={styles.chartSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Captured</span>
          <span className={styles.summaryValue}>
            {formatMoney(totals.captured, currency)}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Refunded</span>
          <span className={`${styles.summaryValue} ${styles.summaryRefund}`}>
            {formatMoney(totals.refunded, currency)}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Net Earnings</span>
          <span className={`${styles.summaryValue} ${styles.summaryNet}`}>
            {formatMoney(totals.net, currency)}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Payments</span>
          <span className={styles.summaryValue}>{totals.payments}</span>
        </div>
      </div>

      {/* Legend */}
      <CustomLegend />

      {/* Chart */}
      <div className={styles.chartCanvas}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
          >
            <CartesianGrid stroke='rgba(0,0,0,0.06)' vertical={false} />
            <ReferenceLine y={0} stroke='rgba(0,0,0,0.15)' strokeWidth={1} />

            <XAxis
              dataKey='tick'
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#666" }}
              interval='preserveStartEnd'
              minTickGap={20}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#666" }}
              width={60}
              tickFormatter={(v) => formatMoney(Number(v || 0), currency)}
            />

            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as any;
                const isPositive = (row.netCents ?? 0) >= 0;

                return (
                  <div className={styles.tooltip}>
                    <div className={styles.tooltipTitle}>{row.label}</div>

                    <div className={styles.tooltipSection}>
                      <div className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>
                          <span
                            className={styles.tooltipDot}
                            style={{
                              background: isPositive
                                ? "var(--lightGreen)"
                                : "var(--red)",
                            }}
                          />
                          Daily Net
                        </span>
                        <span
                          className={`${styles.tooltipVal} ${isPositive ? styles.tooltipGood : styles.tooltipBad}`}
                        >
                          {formatMoney(row.netCents ?? 0, currency)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.tooltipDivider} />

                    <div className={styles.tooltipSection}>
                      <div className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>
                          <span
                            className={styles.tooltipDot}
                            style={{ background: "var(--black)" }}
                          />
                          Captured
                        </span>
                        <span className={styles.tooltipVal}>
                          {formatMoney(row.capturedCents ?? 0, currency)}
                        </span>
                      </div>
                      <div className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>
                          <span
                            className={styles.tooltipDot}
                            style={{ background: "var(--red)" }}
                          />
                          Refunded
                        </span>
                        <span className={styles.tooltipVal}>
                          {formatMoney(row.refundedCents ?? 0, currency)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.tooltipDivider} />

                    <div className={styles.tooltipRow}>
                      <span className={styles.tooltipLabel}>Payments</span>
                      <span className={styles.tooltipVal}>
                        {row.count ?? 0}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            <Bar dataKey='netCents' shape={<NetBarShape />} barSize={24}>
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
              activeDot={{ r: 4, fill: "var(--black)" }}
            />
            <Line
              type='monotone'
              dataKey='refundedCents'
              stroke='var(--red)'
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--red)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
