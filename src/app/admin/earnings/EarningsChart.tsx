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
  Rectangle,
} from "recharts";
import styles from "./AdminEarningsPage.module.css";

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
  // Top bar gets rounded corners only if it has value
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
  // Base bar gets rounded top only when there's no tip on top
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

export default function EarningsChart({
  data,
  currency,
  isDriverMode = false,
}: {
  data: {
    key: string;
    tick: string;
    label: string;
    baseCents: number;
    tipCents: number;
    capturedCents: number;
    refundedCents: number;
    netCents: number;
    count: number;
    refundedCount?: number;
  }[];
  currency: string;
  isDriverMode?: boolean;
}) {
  const hasAnyRefunds = !isDriverMode && data.some((d) => d.refundedCents > 0);

  return (
    <div className={styles.chartInner}>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.swatch} data-tone='base' />
          <span className='miniNote'>
            {isDriverMode ? "Base Pay" : "Base Fee"}
          </span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.swatch} data-tone='tip' />
          <span className='miniNote'>Tips</span>
        </div>
        {!isDriverMode && (
          <>
            <div className={styles.legendItem}>
              <span className={styles.swatch} data-tone='captured' />
              <span className='miniNote'>Captured</span>
            </div>
            {hasAnyRefunds && (
              <div className={styles.legendItem}>
                <span className={styles.swatch} data-tone='refunded' />
                <span className='miniNote'>Refunded</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.chartCanvas}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 10, bottom: 6, left: 10 }}
          >
            <CartesianGrid stroke='rgba(0,0,0,0.08)' vertical={false} />

            {!isDriverMode && <ReferenceLine y={0} stroke='rgba(0,0,0,0.12)' />}

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
                      <span className='miniNote'>
                        {isDriverMode ? "Base Pay" : "Base Fee"}
                      </span>
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
                      <span className='miniNote'>
                        {isDriverMode ? "Total" : "Captured"}
                      </span>
                      <span className={styles.tooltipVal}>
                        {formatMoney(row.capturedCents ?? 0, currency)}
                      </span>
                    </div>
                    {!isDriverMode && (
                      <>
                        <div className={styles.tooltipRow}>
                          <span className='miniNote'>Refunded</span>
                          <span className={styles.tooltipVal}>
                            {formatMoney(row.refundedCents ?? 0, currency)}
                          </span>
                        </div>
                        <div className={styles.tooltipRow}>
                          <span className='miniNote'>Net</span>
                          <span className={styles.tooltipVal}>
                            {formatMoney(row.netCents ?? 0, currency)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className={styles.tooltipRow}>
                      <span className='miniNote'>
                        {isDriverMode ? "Trips" : "Payments"}
                      </span>
                      <span className={styles.tooltipVal}>
                        {row.count ?? 0}
                      </span>
                    </div>
                    {!isDriverMode &&
                    typeof row.refundedCount === "number" &&
                    row.refundedCount > 0 ? (
                      <div className={styles.tooltipRow}>
                        <span className='miniNote'>Refunds</span>
                        <span className={styles.tooltipVal}>
                          {row.refundedCount}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              }}
            />

            {/* Stacked bars: base on bottom, tips on top */}
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

            {/* Captured line (company mode) */}
            {!isDriverMode && (
              <Line
                type='monotone'
                dataKey='capturedCents'
                stroke='var(--black)'
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}

            {/* Refunded line (company mode, only if there are refunds) */}
            {!isDriverMode && hasAnyRefunds && (
              <Line
                type='monotone'
                dataKey='refundedCents'
                stroke='var(--red)'
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
