/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useNavProgress } from "@/components/shared/NavProgress/useNavProgress";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Rectangle,
} from "recharts";
// Same card, legend, canvas and tooltip styles as the earnings chart.
import earnings from "../earnings/AdminEarningsPage.module.css";
import styles from "./BookingsChart.module.css";
import {
  CHART_BREAKDOWNS,
  chartTitle,
  type BookingsChartData,
  type ChartBreakdown,
} from "@/lib/booking/bookingsChart";

const BAR_RADIUS_TOP: [number, number, number, number] = [10, 10, 0, 0];
const BAR_RADIUS_NONE: [number, number, number, number] = [0, 0, 0, 0];

export default function BookingsChart({
  data,
  breakdown,
  rangeLabel,
}: {
  data: BookingsChartData;
  breakdown: ChartBreakdown;
  /** The period the page is showing, e.g. "Oct 2026". */
  rangeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  useNavProgress(isPending);
  const { buckets, series, granularity, todayKey } = data;

  function nav(next: URLSearchParams) {
    next.delete("page");
    const qs = next.toString();
    startTransition(() =>
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  // Clicking a bar sets the page's date range to that bar, so the list
  // below (and this chart) show just those bookings.
  function showBucket(key: string | undefined) {
    const b = buckets.find((x) => x.key === key);
    if (!b?.from || !b?.to) return;
    const next = new URLSearchParams(sp.toString());
    next.delete("month");
    next.set("range", "range");
    next.set("from", b.from);
    next.set("to", b.to);
    nav(next);
  }

  function onBreakdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(sp.toString());
    if (e.target.value === "status") next.delete("breakdown");
    else next.set("breakdown", e.target.value);
    nav(next);
  }

  // The topmost non-empty segment of each bar gets the rounded top.
  const rows = buckets.map((b) => {
    let top: string | null = null;
    for (const s of series) if ((b.values[s.key] ?? 0) > 0) top = s.key;
    return {
      key: b.key,
      tick: b.tick,
      label: b.label,
      total: b.total,
      __top: top,
      ...b.values,
    };
  });
  const ticks = Object.fromEntries(buckets.map((b) => [b.key, b.tick]));
  const clickable = granularity !== "hour";
  const total = buckets.reduce((sum, b) => sum + b.total, 0);

  return (
    <section className={`${earnings.card} ${earnings.chartCard}`}>
      <div className={earnings.cardHeader}>
        <div className='cardTitle h4'>{chartTitle(granularity)}</div>
        <div className='miniNote'>{rangeLabel}</div>
      </div>

      <div className={earnings.chartWrap}>
        <div className={earnings.chartInner}>
          <div className={styles.legendRow}>
            <div className={earnings.legend}>
              {series.map((s) => (
                <div key={s.key} className={earnings.legendItem}>
                  <span
                    className={earnings.swatch}
                    style={{ background: s.color }}
                  />
                  <span className='miniNote'>{s.label}</span>
                </div>
              ))}
            </div>

            <label className={styles.colorBy}>
              <span className='miniNote'>Color bars by</span>
              <select
                className='selectBorder emptySmall'
                value={breakdown}
                onChange={onBreakdownChange}
                disabled={isPending}
              >
                {CHART_BREAKDOWNS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className={earnings.chartCanvas}
            role='img'
            aria-label={`${chartTitle(granularity)}: ${total} rides, ${rangeLabel}`}
          >
            {buckets.length === 0 ? (
              <div className={styles.empty}>
                <span className='miniNote'>
                  No bookings to chart for these filters.
                </span>
              </div>
            ) : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={rows}
                  margin={{ top: 6, right: 10, bottom: 6, left: 10 }}
                >
                  <CartesianGrid stroke='rgba(0,0,0,0.08)' vertical={false} />
                  <XAxis
                    dataKey='key'
                    tickFormatter={(k: string) => ticks[k] ?? k}
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
                    width={36}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload || payload.length === 0)
                        return null;
                      const row = payload[0]?.payload as any;
                      return (
                        <div className={earnings.tooltip}>
                          <div className={earnings.tooltipTitle}>
                            {row.label}
                          </div>
                          {series
                            .filter((s) => (row[s.key] ?? 0) > 0)
                            .map((s) => (
                              <div key={s.key} className={earnings.tooltipRow}>
                                <span className='miniNote'>{s.label}</span>
                                <span className={earnings.tooltipVal}>
                                  {row[s.key]}
                                </span>
                              </div>
                            ))}
                          <div className={earnings.tooltipRow}>
                            <span className='miniNote'>Total rides</span>
                            <span className={earnings.tooltipVal}>
                              {row.total ?? 0}
                            </span>
                          </div>
                          {clickable && row.total > 0 ? (
                            <span className='miniNote'>
                              Click to see these bookings
                            </span>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                  {todayKey ? (
                    <ReferenceLine
                      x={todayKey}
                      stroke='rgba(0,0,0,0.35)'
                      strokeDasharray='4 4'
                      label={{ value: "Today", position: "top", fontSize: 11 }}
                    />
                  ) : null}
                  {series.map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      stackId='bookings'
                      fill={s.color}
                      cursor={clickable ? "pointer" : undefined}
                      onClick={(d: any) =>
                        showBucket(d?.payload?.key ?? d?.key)
                      }
                      shape={(props: any) => (
                        <Rectangle
                          x={props.x}
                          y={props.y}
                          width={props.width}
                          height={props.height}
                          fill={props.fill}
                          radius={
                            props.payload?.__top === s.key
                              ? BAR_RADIUS_TOP
                              : BAR_RADIUS_NONE
                          }
                        />
                      )}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {clickable && buckets.length > 0 ? (
            <div className='miniNote'>
              Click a bar to show those bookings in the list below.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
