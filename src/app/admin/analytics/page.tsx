/* ──────────────────────────────────────────────
 *  /admin/analytics  –  Website Analytics Page
 *  Server component: fetches Plausible data
 *  and passes it to the client component.
 *
 *  Env vars required:
 *    PLAUSIBLE_API_KEY
 *    PLAUSIBLE_SITE_ID
 * ────────────────────────────────────────────── */

import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import AnalyticsClient from "./AnalyticsClient";
import styles from "./AdminAnalyticsPage.module.css";

import {
  getAggregateStats,
  getTimeseries,
  getTopPages,
  getTrafficSources,
  getCountries,
  getRegions,
  getCities,
  getDevices,
  getEntryPages,
  getExitPages,
  getBrowsers,
  getRealtimeVisitors,
  getPreviousPeriodRange,
  getIntervalForRange,
} from "@/lib/plausible";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const VALID_RANGES = [
  "day",
  "yesterday",
  "7d",
  "30d",
  "month",
  "12mo",
] as const;
type ValidRange = (typeof VALID_RANGES)[number];

const RANGE_LABELS: Record<ValidRange, string> = {
  day: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  month: "This Month",
  "12mo": "Last 12 Months",
};

function isValidRange(range: string): range is ValidRange {
  return VALID_RANGES.includes(range as ValidRange);
}

async function AnalyticsContent({ range }: { range: ValidRange }) {
  noStore();

  const siteId = process.env.PLAUSIBLE_SITE_ID ?? "niertransportation.com";
  const apiKey = process.env.PLAUSIBLE_API_KEY;

  // ── Guard: missing API key ──────────────────
  if (!apiKey) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>
          <div className={styles.errorTitle}>
            Plausible Analytics Not Configured
          </div>
          <div className={styles.errorBody}>
            To enable website analytics, add the following environment variables
            to your <code>.env</code> file:
            <br />
            <br />
            <code>PLAUSIBLE_API_KEY=your-stats-api-key-here</code>
            <br />
            <code>PLAUSIBLE_SITE_ID={siteId}</code>
            <br />
            <br />
            You can generate an API key in your Plausible account under Settings
            → API Keys → New API Key → Stats API.
          </div>
        </div>
      </div>
    );
  }

  // ── Fetch all data in parallel ──────────────
  const previousRange = getPreviousPeriodRange(range);
  const interval = getIntervalForRange(range);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYmd = yesterday.toISOString().split("T")[0];
  const resolvedRange: string | [string, string] =
    range === "yesterday" ? [yesterdayYmd, yesterdayYmd] : range;

  const [
    current,
    previous,
    timeseries,
    topPages,
    trafficSources,
    countries,
    regions,
    cities,
    devices,
    entryPages,
    exitPages,
    browsers,
    realtimeVisitors,
  ] = await Promise.all([
    getAggregateStats(resolvedRange),
    getAggregateStats(previousRange),
    getTimeseries(resolvedRange, interval),
    getTopPages(resolvedRange, 10),
    getTrafficSources(resolvedRange, 10),
    getCountries(resolvedRange, 10),
    getRegions(resolvedRange, 10),
    getCities(resolvedRange, 10),
    getDevices(resolvedRange),
    getEntryPages(resolvedRange, 10),
    getExitPages(resolvedRange, 10),
    getBrowsers(resolvedRange),
    getRealtimeVisitors(),
  ]);

  return (
    <AnalyticsClient
      range={range}
      rangeLabel={RANGE_LABELS[range]}
      current={current}
      previous={previous}
      timeseries={timeseries}
      topPages={topPages}
      trafficSources={trafficSources}
      countries={countries}
      regions={regions}
      cities={cities}
      devices={devices}
      entryPages={entryPages}
      exitPages={exitPages}
      browsers={browsers}
      realtimeVisitors={realtimeVisitors}
      siteId={siteId}
    />
  );
}

function AnalyticsLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.analyticsTop}>
        <div className={styles.headerLeft}>
          <h1>Website Analytics</h1>
          <div className={styles.headerMeta}>
            <span className={styles.sitePill}>Loading analytics data…</span>
          </div>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={styles.kpiCard}
            style={{ minHeight: 90, opacity: 0.5 }}
          >
            <div className={styles.kpiTop}>
              <span
                className='miniNote'
                style={{
                  background: "rgba(0,0,0,0.08)",
                  borderRadius: 4,
                  width: 80,
                  height: 14,
                  display: "block",
                }}
              />
            </div>
            <span
              style={{
                background: "rgba(0,0,0,0.08)",
                borderRadius: 6,
                width: 100,
                height: 28,
                display: "block",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const rangeParam = params.range ?? "day";
  const range: ValidRange = isValidRange(rangeParam) ? rangeParam : "30d";

  return (
    <Suspense fallback={<AnalyticsLoading />}>
      <AnalyticsContent range={range} />
    </Suspense>
  );
}
