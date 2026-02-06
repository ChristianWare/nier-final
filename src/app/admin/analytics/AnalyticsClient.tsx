"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import styles from "./AdminAnalyticsPage.module.css";

import type {
  AggregateStats,
  TimeseriesPoint,
  TopPageData,
  TrafficSourceData,
  CountryData,
  DeviceData,
  EntryPageData,
  ExitPageData,
  BrowserData,
} from "@/lib/plausible";

/* ══════════════════════════════════════════════
 *  TYPES
 * ══════════════════════════════════════════════ */

export type AnalyticsClientProps = {
  range: string;
  rangeLabel: string;
  current: AggregateStats;
  previous: AggregateStats;
  timeseries: TimeseriesPoint[];
  topPages: TopPageData[];
  trafficSources: TrafficSourceData[];
  countries: CountryData[];
  devices: DeviceData[];
  entryPages: EntryPageData[];
  exitPages: ExitPageData[];
  browsers: BrowserData[];
  realtimeVisitors: number;
  siteId: string;
};

/* ══════════════════════════════════════════════
 *  EDUCATIONAL INSIGHTS DATA
 * ══════════════════════════════════════════════ */

type InsightData = {
  title: string;
  description: string;
  ranges: { label: string; tone: "excellent" | "good" | "average" | "poor" }[];
  tip: string;
};

const INSIGHTS: Record<string, InsightData> = {
  visitors: {
    title: "Unique Visitors",
    description:
      "The number of unique people who visited your site. Each person is counted once regardless of how many pages they view.",
    ranges: [],
    tip: "Improve by: SEO optimization, Google Business profile, social media, and referral partnerships with hotels, event venues, and concierge services.",
  },
  pageviews: {
    title: "Total Pageviews",
    description:
      "The total number of pages viewed across all visitors. If pageviews are much higher than visitors, people are browsing multiple pages — a great sign.",
    ranges: [],
    tip: "If pageviews are close to visitor count, visitors aren't exploring. Add clear navigation and internal links between your services, fleet, and booking pages.",
  },
  bounceRate: {
    title: "Bounce Rate",
    description:
      "Percentage of visitors who land on a page and leave without doing anything else. For a service business like a car service, lower is better.",
    ranges: [
      { label: "< 30% Excellent", tone: "excellent" },
      { label: "30-55% Good", tone: "good" },
      { label: "55-70% Average", tone: "average" },
      { label: "> 70% Needs work", tone: "poor" },
    ],
    tip: "Improve by: faster page load times, clear 'Book Now' CTAs above the fold, ensuring landing pages match search intent, and mobile-friendly design.",
  },
  visitDuration: {
    title: "Average Visit Duration",
    description:
      "How long people spend on your site per session. For a booking service, 1–3 minutes is solid — they're checking services, pricing, and booking.",
    ranges: [
      { label: "> 3 min Excellent", tone: "excellent" },
      { label: "1-3 min Good", tone: "good" },
      { label: "30s-1 min Average", tone: "average" },
      { label: "< 30s Needs work", tone: "poor" },
    ],
    tip: "Improve by: clear navigation, prominent pricing, engaging fleet photos, customer testimonials, and a streamlined booking flow.",
  },
  viewsPerVisit: {
    title: "Pages Per Visit",
    description:
      "How many pages someone views in one session. For a car service, 2–4 is ideal (home → services/fleet → booking).",
    ranges: [
      { label: "> 3 Excellent", tone: "excellent" },
      { label: "2-3 Good", tone: "good" },
      { label: "1.5-2 Average", tone: "average" },
      { label: "< 1.5 Needs work", tone: "poor" },
    ],
    tip: "Improve by: clear CTAs guiding visitors toward booking on every page, logical navigation flow, and prominent 'View Fleet' / 'Get a Quote' buttons.",
  },
  visits: {
    title: "Total Visits (Sessions)",
    description:
      "The total number of sessions. One visitor can have multiple visits if they come back on different occasions.",
    ranges: [],
    tip: "If visits are much higher than visitors, you have returning customers — that's a great sign of brand loyalty and interest.",
  },
};

/* ══════════════════════════════════════════════
 *  HELPERS
 * ══════════════════════════════════════════════ */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function getBounceRateHealth(rate: number): {
  label: string;
  className: string;
} {
  if (rate < 30)
    return { label: "Excellent", className: styles.healthExcellent };
  if (rate <= 55) return { label: "Good", className: styles.healthGood };
  if (rate <= 70) return { label: "Average", className: styles.healthAverage };
  return { label: "Needs work", className: styles.healthPoor };
}

function getDurationHealth(seconds: number): {
  label: string;
  className: string;
} {
  if (seconds > 180)
    return { label: "Excellent", className: styles.healthExcellent };
  if (seconds >= 60) return { label: "Good", className: styles.healthGood };
  if (seconds >= 30)
    return { label: "Average", className: styles.healthAverage };
  return { label: "Needs work", className: styles.healthPoor };
}

function getViewsPerVisitHealth(views: number): {
  label: string;
  className: string;
} {
  if (views > 3)
    return { label: "Excellent", className: styles.healthExcellent };
  if (views >= 2) return { label: "Good", className: styles.healthGood };
  if (views >= 1.5)
    return { label: "Average", className: styles.healthAverage };
  return { label: "Needs work", className: styles.healthPoor };
}

const DEVICE_ICONS: Record<string, string> = {
  Desktop: "🖥️",
  Mobile: "📱",
  Tablet: "📋",
  Other: "❓",
};

/* ══════════════════════════════════════════════
 *  SUB-COMPONENTS
 * ══════════════════════════════════════════════ */

function ChangeIndicator({
  current,
  previous,
  invertColor = false,
}: {
  current: number;
  previous: number;
  invertColor?: boolean;
}) {
  const change = pctChange(current, previous);
  if (change === null) return null;

  const isUp = change > 0;
  const isDown = change < 0;
  const isFlat = Math.abs(change) < 0.5;

  // For bounce rate, down is good (invertColor)
  let className = styles.kpiFlat;
  if (!isFlat) {
    if (invertColor) {
      className = isUp ? styles.kpiDown : styles.kpiUp;
    } else {
      className = isUp ? styles.kpiUp : styles.kpiDown;
    }
  }

  return (
    <span className={className}>
      {isUp ? "↑" : isDown ? "↓" : "→"} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function InfoButton({
  metricKey,
  activeInsight,
  onToggle,
}: {
  metricKey: string;
  activeInsight: string | null;
  onToggle: (key: string) => void;
}) {
  const isActive = activeInsight === metricKey;
  return (
    <button
      className={isActive ? styles.infoBtnActive : styles.infoBtn}
      onClick={() => onToggle(metricKey)}
      title={`Learn about ${INSIGHTS[metricKey]?.title ?? metricKey}`}
      type='button'
    >
      ?
    </button>
  );
}

function InsightPanel({ metricKey }: { metricKey: string }) {
  const insight = INSIGHTS[metricKey];
  if (!insight) return null;

  return (
    <div className={styles.insightCard}>
      <div className={styles.insightTitle}>💡 {insight.title}</div>
      <div className={styles.insightBody}>{insight.description}</div>
      {insight.ranges.length > 0 && (
        <div className={styles.insightRanges}>
          {insight.ranges.map((r) => {
            const toneMap: Record<string, string> = {
              excellent: styles.healthExcellent,
              good: styles.healthGood,
              average: styles.healthAverage,
              poor: styles.healthPoor,
            };
            return (
              <span key={r.label} className={toneMap[r.tone]}>
                {r.label}
              </span>
            );
          })}
        </div>
      )}
      <div className={styles.insightTip}>💡 {insight.tip}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════
 *  RANGE TABS
 * ══════════════════════════════════════════════ */

const RANGE_OPTIONS = [
  { value: "day", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "month", label: "This Month" },
  { value: "12mo", label: "12 Months" },
];

/* ══════════════════════════════════════════════
 *  MAIN CLIENT COMPONENT
 * ══════════════════════════════════════════════ */

export default function AnalyticsClient({
  range,
  rangeLabel,
  current,
  previous,
  timeseries,
  topPages,
  trafficSources,
  countries,
  devices,
  entryPages,
  exitPages,
  browsers,
  realtimeVisitors,
  siteId,
}: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<
    "visitors" | "pageviews" | "visits"
  >("visitors");

  const toggleInsight = useCallback((key: string) => {
    setActiveInsight((prev) => (prev === key ? null : key));
  }, []);

  function handleRangeChange(newRange: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", newRange);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  /* ── KPI Cards ──────────────────────────────── */

  const bounceHealth = getBounceRateHealth(current.bounceRate);
  const durationHealth = getDurationHealth(current.visitDuration);
  const viewsHealth = getViewsPerVisitHealth(current.viewsPerVisit);

  /* ── Chart tick formatter ───────────────────── */

  function formatChartTick(dateStr: string) {
    if (range === "day") {
      // Hour format: "2024-01-15 14:00:00" → "2 PM"
      const hourMatch = dateStr.match(/\d{4}-\d{2}-\d{2}\s+(\d+):/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1]);
        if (hour === 0) return "12 AM";
        if (hour === 12) return "12 PM";
        return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
      }
      return dateStr;
    }
    if (range === "12mo") {
      // Month format: "2024-01" → "Jan"
      const d = new Date(dateStr + "-01");
      return d.toLocaleDateString("en-US", { month: "short" });
    }
    // Day format: "2024-01-15" → "Jan 15"
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  /* ── Render ─────────────────────────────────── */

  return (
    <div className={styles.container}>
      {/* ── Header ──────────────────────────── */}
      <div className={styles.analyticsTop}>
        <div className={styles.headerLeft}>
          <h1>Website Analytics</h1>
          <div className={styles.headerMeta}>
            {realtimeVisitors > 0 && (
              <span className={styles.realtimePill}>
                <span className={styles.realtimeDot} />
                {realtimeVisitors} online now
              </span>
            )}
            <span className={styles.sitePill}>🌐 {siteId}</span>
            <span className={styles.sitePill}>📊 {rangeLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Range Tabs ──────────────────────── */}
      <div className={styles.tabs}>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleRangeChange(opt.value)}
            className={
              range === opt.value ? styles.rangePillActive : styles.rangePill
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── KPI Grid ────────────────────────── */}
      <div className={styles.kpiGrid}>
        {/* Unique Visitors */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>
              <span className='miniNote'>Unique Visitors</span>
              <InfoButton
                metricKey='visitors'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </span>
            <ChangeIndicator
              current={current.visitors}
              previous={previous.visitors}
            />
          </div>
          <span className={styles.kpiValue}>
            {formatNumber(current.visitors)}
          </span>
          {activeInsight === "visitors" && (
            <InsightPanel metricKey='visitors' />
          )}
        </div>

        {/* Total Pageviews */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>
              <span className='miniNote'>Pageviews</span>
              <InfoButton
                metricKey='pageviews'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </span>
            <ChangeIndicator
              current={current.pageviews}
              previous={previous.pageviews}
            />
          </div>
          <span className={styles.kpiValue}>
            {formatNumber(current.pageviews)}
          </span>
          {activeInsight === "pageviews" && (
            <InsightPanel metricKey='pageviews' />
          )}
        </div>

        {/* Bounce Rate */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>
              <span className='miniNote'>Bounce Rate</span>
              <InfoButton
                metricKey='bounceRate'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </span>
            <ChangeIndicator
              current={current.bounceRate}
              previous={previous.bounceRate}
              invertColor
            />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className={styles.kpiValue}>
              {current.bounceRate.toFixed(1)}%
            </span>
            <span className={bounceHealth.className}>{bounceHealth.label}</span>
          </div>
          {activeInsight === "bounceRate" && (
            <InsightPanel metricKey='bounceRate' />
          )}
        </div>

        {/* Visit Duration */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>
              <span className='miniNote'>Avg. Visit Duration</span>
              <InfoButton
                metricKey='visitDuration'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </span>
            <ChangeIndicator
              current={current.visitDuration}
              previous={previous.visitDuration}
            />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className={styles.kpiValue}>
              {formatDuration(current.visitDuration)}
            </span>
            <span className={durationHealth.className}>
              {durationHealth.label}
            </span>
          </div>
          {activeInsight === "visitDuration" && (
            <InsightPanel metricKey='visitDuration' />
          )}
        </div>

        {/* Pages Per Visit */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>
              <span className='miniNote'>Pages / Visit</span>
              <InfoButton
                metricKey='viewsPerVisit'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </span>
            <ChangeIndicator
              current={current.viewsPerVisit}
              previous={previous.viewsPerVisit}
            />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className={styles.kpiValue}>
              {current.viewsPerVisit.toFixed(1)}
            </span>
            <span className={viewsHealth.className}>{viewsHealth.label}</span>
          </div>
          {activeInsight === "viewsPerVisit" && (
            <InsightPanel metricKey='viewsPerVisit' />
          )}
        </div>

        {/* Total Visits */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>
              <span className='miniNote'>Total Visits</span>
              <InfoButton
                metricKey='visits'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </span>
            <ChangeIndicator
              current={current.visits}
              previous={previous.visits}
            />
          </div>
          <span className={styles.kpiValue}>
            {formatNumber(current.visits)}
          </span>
          {activeInsight === "visits" && <InsightPanel metricKey='visits' />}
        </div>
      </div>

      {/* ── Traffic Chart ───────────────────── */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartHeaderLeft}>
            <h3>Traffic Over Time</h3>
          </div>
          <div className={styles.metricToggles}>
            {(["visitors", "pageviews", "visits"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChartMetric(m)}
                className={
                  chartMetric === m
                    ? styles.metricToggleActive
                    : styles.metricToggle
                }
              >
                {m === "visitors"
                  ? "Visitors"
                  : m === "pageviews"
                    ? "Pageviews"
                    : "Visits"}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chartWrap}>
          <div className={styles.chartInner}>
            <div className={styles.chartCanvas}>
              {timeseries.length > 0 ? (
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart
                    data={timeseries}
                    margin={{ top: 6, right: 10, bottom: 6, left: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id='chartGradient'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'
                      >
                        <stop
                          offset='0%'
                          stopColor='var(--black)'
                          stopOpacity={0.15}
                        />
                        <stop
                          offset='100%'
                          stopColor='var(--black)'
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke='rgba(0,0,0,0.08)' vertical={false} />
                    <XAxis
                      dataKey='date'
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      interval='preserveStartEnd'
                      minTickGap={40}
                      tickFormatter={formatChartTick}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      width={48}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip
                      cursor={{ stroke: "rgba(0,0,0,0.12)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const row = payload[0].payload as TimeseriesPoint;
                        return (
                          <div className={styles.tooltip}>
                            <div className={styles.tooltipTitle}>
                              {formatChartTick(row.date)}
                            </div>
                            <div className={styles.tooltipRow}>
                              <span className='miniNote'>Visitors</span>
                              <span className={styles.tooltipVal}>
                                {formatNumber(row.visitors)}
                              </span>
                            </div>
                            <div className={styles.tooltipRow}>
                              <span className='miniNote'>Pageviews</span>
                              <span className={styles.tooltipVal}>
                                {formatNumber(row.pageviews)}
                              </span>
                            </div>
                            <div className={styles.tooltipRow}>
                              <span className='miniNote'>Visits</span>
                              <span className={styles.tooltipVal}>
                                {formatNumber(row.visits)}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type='monotone'
                      dataKey={chartMetric}
                      stroke='var(--black)'
                      strokeWidth={2}
                      fill='url(#chartGradient)'
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--black)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.empty}>
                  <span className={styles.emptyTitle}>No data yet</span>
                  <span className='miniNote'>
                    Traffic data will appear here once visitors start coming in.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Pages + Traffic Sources ──────── */}
      <div className={styles.twoCol}>
        {/* Top Pages */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h3>Top Pages</h3>
              <InfoButton
                metricKey='topPages'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </div>
          </div>
          {activeInsight === "topPages" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💡 Top Pages</div>
                <div className={styles.insightBody}>
                  Shows which pages get the most traffic. You want the booking
                  page to be high on this list. If the home page dominates but
                  the booking page barely shows up, there&apos;s a conversion
                  path problem.
                </div>
                <div className={styles.insightTip}>
                  💡 Make &quot;Book a Ride&quot; visible and accessible from
                  every page. Add clear CTAs guiding visitors from informational
                  pages toward booking.
                </div>
              </div>
            </div>
          )}
          <div className={styles.tableWrap}>
            {topPages.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Visitors</th>
                    <th>Bounce</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((p) => (
                    <tr key={p.page}>
                      <td className={styles.pageCell}>{p.page}</td>
                      <td>
                        <div className={styles.barCell}>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFillPrimary}
                              style={{
                                width: `${Math.min(100, (p.visitors / (topPages[0]?.visitors || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.barValue}>
                            {formatNumber(p.visitors)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            getBounceRateHealth(p.bounceRate).className
                          }
                        >
                          {p.bounceRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className='miniNote'>
                        {formatDuration(p.visitDuration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <span className='miniNote'>No page data yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h3>Traffic Sources</h3>
              <InfoButton
                metricKey='trafficSources'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </div>
          </div>
          {activeInsight === "trafficSources" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💡 Traffic Sources</div>
                <div className={styles.insightBody}>
                  Where your visitors come from. &quot;Direct / None&quot; means
                  they typed your URL or used a bookmark. Google means they
                  found you through search. Social sources show which platforms
                  drive traffic.
                </div>
                <div className={styles.insightTip}>
                  💡 If organic search is low, invest in local SEO. If referral
                  traffic from hotels/venues shows up, partnerships are paying
                  off. Strong direct traffic means good brand recognition.
                </div>
              </div>
            </div>
          )}
          <div className={styles.tableWrap}>
            {trafficSources.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Visitors</th>
                    <th>Bounce</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficSources.map((s) => (
                    <tr key={s.source}>
                      <td style={{ fontWeight: 600 }}>{s.source}</td>
                      <td>
                        <div className={styles.barCell}>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFillPrimary}
                              style={{
                                width: `${Math.min(100, (s.visitors / (trafficSources[0]?.visitors || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.barValue}>
                            {formatNumber(s.visitors)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            getBounceRateHealth(s.bounceRate).className
                          }
                        >
                          {s.bounceRate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <span className='miniNote'>No source data yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Entry/Exit Pages ────────────────── */}
      <div className={styles.twoCol}>
        {/* Entry Pages */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h3>Entry Pages</h3>
              <InfoButton
                metricKey='entryPages'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </div>
          </div>
          {activeInsight === "entryPages" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💡 Entry Pages</div>
                <div className={styles.insightBody}>
                  The first page visitors land on when they come to your site.
                  These are your &quot;front doors&quot; — if the homepage
                  dominates, most people find you directly. If service or fleet
                  pages appear, your SEO is working for specific searches.
                </div>
                <div className={styles.insightTip}>
                  💡 Every entry page should have a clear path to booking. Add
                  prominent CTAs to your top entry pages.
                </div>
              </div>
            </div>
          )}
          <div className={styles.tableWrap}>
            {entryPages.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {entryPages.map((p) => (
                    <tr key={p.page}>
                      <td className={styles.pageCell}>{p.page}</td>
                      <td>
                        <div className={styles.barCell}>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFillPrimary}
                              style={{
                                width: `${Math.min(100, (p.visitors / (entryPages[0]?.visitors || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.barValue}>
                            {formatNumber(p.visitors)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <span className='miniNote'>No entry page data yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Exit Pages */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h3>Exit Pages</h3>
              <InfoButton
                metricKey='exitPages'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </div>
          </div>
          {activeInsight === "exitPages" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💡 Exit Pages</div>
                <div className={styles.insightBody}>
                  The last page visitors see before leaving your site. Ideally,
                  the booking confirmation or thank-you page should rank highly
                  here — that means people completed a booking before leaving.
                </div>
                <div className={styles.insightTip}>
                  💡 If people are exiting on your pricing or fleet page without
                  booking, consider simplifying the next step or adding trust
                  signals like reviews and guarantees.
                </div>
              </div>
            </div>
          )}
          <div className={styles.tableWrap}>
            {exitPages.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {exitPages.map((p) => (
                    <tr key={p.page}>
                      <td className={styles.pageCell}>{p.page}</td>
                      <td>
                        <div className={styles.barCell}>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFillPrimary}
                              style={{
                                width: `${Math.min(100, (p.visitors / (exitPages[0]?.visitors || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.barValue}>
                            {formatNumber(p.visitors)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <span className='miniNote'>No exit page data yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Devices, Countries, Browsers ────── */}
      <div className={styles.threeCol}>
        {/* Devices */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h3>Devices</h3>
              <InfoButton
                metricKey='devices'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </div>
          </div>
          {activeInsight === "devices" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💡 Devices</div>
                <div className={styles.insightBody}>
                  Shows what devices visitors use. For a car service, mobile is
                  likely dominant — people book on the go, at the airport, or
                  from their hotel. If mobile traffic is high but conversions
                  are low, the mobile booking experience needs work.
                </div>
                <div className={styles.insightTip}>
                  💡 Test your booking flow on a phone regularly. Make sure
                  buttons are thumb-friendly, forms are simple, and the booking
                  page loads fast on cellular connections.
                </div>
              </div>
            </div>
          )}
          <div className={styles.deviceGrid}>
            {devices.length > 0 ? (
              devices.map((d) => (
                <div key={d.device} className={styles.deviceRow}>
                  <div className={styles.deviceIcon}>
                    {DEVICE_ICONS[d.device] ?? "❓"}
                  </div>
                  <div className={styles.deviceInfo}>
                    <span className={styles.deviceName}>{d.device}</span>
                    <div className={styles.deviceStats}>
                      <div className={styles.deviceBar}>
                        <div
                          className={styles.deviceBarFill}
                          style={{ width: `${d.percentage}%` }}
                        />
                      </div>
                      <span className={styles.devicePct}>
                        {d.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.empty}>
                <span className='miniNote'>No device data yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Countries */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h3>Locations</h3>
              <InfoButton
                metricKey='locations'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </div>
          </div>
          {activeInsight === "locations" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💡 Visitor Locations</div>
                <div className={styles.insightBody}>
                  Where your visitors are physically located. For a
                  Phoenix-based car service, you want to see heavy US / Arizona
                  traffic. Lots of traffic from irrelevant locations could mean
                  ad targeting or SEO keywords need adjusting.
                </div>
                <div className={styles.insightTip}>
                  💡 Focus your SEO on local terms like &quot;Phoenix black car
                  service&quot;, &quot;Scottsdale airport transfer&quot;, and
                  &quot;Arizona executive transportation&quot;.
                </div>
              </div>
            </div>
          )}
          <div className={styles.tableWrap}>
            {countries.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((c) => (
                    <tr key={c.country}>
                      <td style={{ fontWeight: 600 }}>{c.country}</td>
                      <td>
                        <div className={styles.barCell}>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFillPrimary}
                              style={{
                                width: `${Math.min(100, (c.visitors / (countries[0]?.visitors || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.barValue}>
                            {formatNumber(c.visitors)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <span className='miniNote'>No location data yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Browsers */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h3>Browsers</h3>
              <InfoButton
                metricKey='browsers'
                activeInsight={activeInsight}
                onToggle={toggleInsight}
              />
            </div>
          </div>
          {activeInsight === "browsers" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div className={styles.insightCard}>
                <div className={styles.insightTitle}>💡 Browsers</div>
                <div className={styles.insightBody}>
                  Which web browsers your visitors use. Make sure your booking
                  flow works well in all top browsers, especially Safari (common
                  on iPhones) and Chrome.
                </div>
                <div className={styles.insightTip}>
                  💡 Always test your booking form in the top 3 browsers listed
                  here. A broken form in any popular browser means lost
                  bookings.
                </div>
              </div>
            </div>
          )}
          <div className={styles.tableWrap}>
            {browsers.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Browser</th>
                    <th>Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {browsers.map((b) => (
                    <tr key={b.browser}>
                      <td style={{ fontWeight: 600 }}>{b.browser}</td>
                      <td>
                        <div className={styles.barCell}>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFillPrimary}
                              style={{
                                width: `${Math.min(100, (b.visitors / (browsers[0]?.visitors || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className={styles.barValue}>
                            {formatNumber(b.visitors)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <span className='miniNote'>No browser data yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
