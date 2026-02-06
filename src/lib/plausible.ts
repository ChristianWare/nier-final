/* ──────────────────────────────────────────────
 *  Plausible Stats API v2 – Server-side helpers
 *  Env vars required:
 *    PLAUSIBLE_API_KEY   – Stats API bearer token
 *    PLAUSIBLE_SITE_ID   – e.g. niertransportation.com
 * ────────────────────────────────────────────── */

const API_BASE = "https://plausible.io/api/v2/query";
const API_V1_BASE = "https://plausible.io/api/v1/stats";

function getCredentials() {
  const apiKey = process.env.PLAUSIBLE_API_KEY;
  const siteId = process.env.PLAUSIBLE_SITE_ID;
  if (!apiKey || !siteId) {
    throw new Error(
      "Missing PLAUSIBLE_API_KEY or PLAUSIBLE_SITE_ID environment variables",
    );
  }
  return { apiKey, siteId };
}

/* ── Generic v2 query ─────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryV2(body: Record<string, any>) {
  const { apiKey, siteId } = getCredentials();

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ site_id: siteId, ...body }),
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Plausible API error ${res.status}: ${text}`);
    return null;
  }

  return res.json();
}

/* ── Real-time visitors (v1 endpoint) ─────────── */

export async function getRealtimeVisitors(): Promise<number> {
  try {
    const { apiKey, siteId } = getCredentials();

    const res = await fetch(
      `${API_V1_BASE}/realtime/visitors?site_id=${siteId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 30 }, // refresh every 30s
      },
    );

    if (!res.ok) return 0;
    const count = await res.text();
    return parseInt(count, 10) || 0;
  } catch {
    return 0;
  }
}

/* ── Aggregate KPIs ───────────────────────────── */

export type AggregateStats = {
  visitors: number;
  pageviews: number;
  bounceRate: number;
  visitDuration: number; // seconds
  viewsPerVisit: number;
  visits: number;
};

const EMPTY_AGG: AggregateStats = {
  visitors: 0,
  pageviews: 0,
  bounceRate: 0,
  visitDuration: 0,
  viewsPerVisit: 0,
  visits: 0,
};

export async function getAggregateStats(
  dateRange: string | [string, string],
): Promise<AggregateStats> {
  const data = await queryV2({
    metrics: [
      "visitors",
      "pageviews",
      "bounce_rate",
      "visit_duration",
      "views_per_visit",
      "visits",
    ],
    date_range: dateRange,
  });

  if (!data?.results?.[0]?.metrics) return EMPTY_AGG;

  const m = data.results[0].metrics;
  return {
    visitors: m[0] ?? 0,
    pageviews: m[1] ?? 0,
    bounceRate: m[2] ?? 0,
    visitDuration: m[3] ?? 0,
    viewsPerVisit: m[4] ?? 0,
    visits: m[5] ?? 0,
  };
}

/* ── Timeseries ───────────────────────────────── */

export type TimeseriesPoint = {
  date: string;
  visitors: number;
  pageviews: number;
  visits: number;
};

export async function getTimeseries(
  dateRange: string | [string, string],
  interval: "hour" | "day" | "week" | "month" = "day",
): Promise<TimeseriesPoint[]> {
  const data = await queryV2({
    metrics: ["visitors", "pageviews", "visits"],
    date_range: dateRange,
    dimensions: [`time:${interval}`],
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => ({
    date: r.dimensions[0],
    visitors: r.metrics[0] ?? 0,
    pageviews: r.metrics[1] ?? 0,
    visits: r.metrics[2] ?? 0,
  }));
}

/* ── Top Pages ────────────────────────────────── */

export type TopPageData = {
  page: string;
  visitors: number;
  pageviews: number;
  bounceRate: number;
  visitDuration: number;
};

export async function getTopPages(
  dateRange: string | [string, string],
  limit = 10,
): Promise<TopPageData[]> {
  const data = await queryV2({
    metrics: ["visitors", "pageviews", "bounce_rate", "visit_duration"],
    date_range: dateRange,
    dimensions: ["event:page"],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => ({
    page: r.dimensions[0],
    visitors: r.metrics[0] ?? 0,
    pageviews: r.metrics[1] ?? 0,
    bounceRate: r.metrics[2] ?? 0,
    visitDuration: r.metrics[3] ?? 0,
  }));
}

/* ── Traffic Sources ──────────────────────────── */

export type TrafficSourceData = {
  source: string;
  visitors: number;
  bounceRate: number;
  visitDuration: number;
};

export async function getTrafficSources(
  dateRange: string | [string, string],
  limit = 10,
): Promise<TrafficSourceData[]> {
  const data = await queryV2({
    metrics: ["visitors", "bounce_rate", "visit_duration"],
    date_range: dateRange,
    dimensions: ["visit:source"],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => ({
    source: r.dimensions[0] || "Direct / None",
    visitors: r.metrics[0] ?? 0,
    bounceRate: r.metrics[1] ?? 0,
    visitDuration: r.metrics[2] ?? 0,
  }));
}

/* ── Flag Helper ──────────────────────────────── */

/** Convert a 2-letter ISO country code (e.g. "US") to a flag emoji (🇺🇸) */
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const cp1 = 0x1f1e6 + (upper.charCodeAt(0) - 65);
  const cp2 = 0x1f1e6 + (upper.charCodeAt(1) - 65);
  return String.fromCodePoint(cp1, cp2);
}

/* ── Countries ────────────────────────────────── */

export type CountryData = {
  country: string;
  countryCode: string;
  flag: string;
  visitors: number;
};

export async function getCountries(
  dateRange: string | [string, string],
  limit = 10,
): Promise<CountryData[]> {
  const data = await queryV2({
    metrics: ["visitors"],
    date_range: dateRange,
    dimensions: ["visit:country_name", "visit:country"],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => {
    const code = r.dimensions[1] || "";
    return {
      country: r.dimensions[0] || "Unknown",
      countryCode: code,
      flag: countryCodeToFlag(code),
      visitors: r.metrics[0] ?? 0,
    };
  });
}

/* ── Regions (States/Provinces) ────────────────── */

export type RegionData = {
  region: string;
  country: string;
  countryCode: string;
  flag: string;
  visitors: number;
};

export async function getRegions(
  dateRange: string | [string, string],
  limit = 10,
): Promise<RegionData[]> {
  const data = await queryV2({
    metrics: ["visitors"],
    date_range: dateRange,
    dimensions: ["visit:region_name", "visit:country_name", "visit:country"],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => {
    const code = r.dimensions[2] || "";
    return {
      region: r.dimensions[0] || "Unknown",
      country: r.dimensions[1] || "Unknown",
      countryCode: code,
      flag: countryCodeToFlag(code),
      visitors: r.metrics[0] ?? 0,
    };
  });
}

/* ── Cities ───────────────────────────────────── */

export type CityData = {
  city: string;
  region: string;
  countryCode: string;
  flag: string;
  visitors: number;
};

export async function getCities(
  dateRange: string | [string, string],
  limit = 10,
): Promise<CityData[]> {
  const data = await queryV2({
    metrics: ["visitors"],
    date_range: dateRange,
    dimensions: ["visit:city_name", "visit:region_name", "visit:country"],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => {
    const code = r.dimensions[2] || "";
    return {
      city: r.dimensions[0] || "Unknown",
      region: r.dimensions[1] || "Unknown",
      countryCode: code,
      flag: countryCodeToFlag(code),
      visitors: r.metrics[0] ?? 0,
    };
  });
}

/* ── Devices ──────────────────────────────────── */

export type DeviceData = {
  device: string;
  visitors: number;
  percentage: number;
};

export async function getDevices(
  dateRange: string | [string, string],
): Promise<DeviceData[]> {
  const data = await queryV2({
    metrics: ["visitors", "percentage"],
    date_range: dateRange,
    dimensions: ["visit:device"],
    order_by: [["visitors", "desc"]],
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => ({
    device: r.dimensions[0] || "Unknown",
    visitors: r.metrics[0] ?? 0,
    percentage: r.metrics[1] ?? 0,
  }));
}

/* ── Entry Pages ──────────────────────────────── */

export type EntryPageData = {
  page: string;
  visitors: number;
  visits: number;
};

export async function getEntryPages(
  dateRange: string | [string, string],
  limit = 10,
): Promise<EntryPageData[]> {
  const data = await queryV2({
    metrics: ["visitors", "visits"],
    date_range: dateRange,
    dimensions: ["visit:entry_page"],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => ({
    page: r.dimensions[0],
    visitors: r.metrics[0] ?? 0,
    visits: r.metrics[1] ?? 0,
  }));
}

/* ── Exit Pages ───────────────────────────────── */

export type ExitPageData = {
  page: string;
  visitors: number;
  visits: number;
};

export async function getExitPages(
  dateRange: string | [string, string],
  limit = 10,
): Promise<ExitPageData[]> {
  const data = await queryV2({
    metrics: ["visitors", "visits"],
    date_range: dateRange,
    dimensions: ["visit:exit_page"],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => ({
    page: r.dimensions[0],
    visitors: r.metrics[0] ?? 0,
    visits: r.metrics[1] ?? 0,
  }));
}

/* ── Browsers ─────────────────────────────────── */

export type BrowserData = {
  browser: string;
  visitors: number;
  percentage: number;
};

export async function getBrowsers(
  dateRange: string | [string, string],
): Promise<BrowserData[]> {
  const data = await queryV2({
    metrics: ["visitors", "percentage"],
    date_range: dateRange,
    dimensions: ["visit:browser"],
    order_by: [["visitors", "desc"]],
    pagination: { limit: 10 },
  });

  if (!data?.results) return [];

  return data.results.map((r: { dimensions: string[]; metrics: number[] }) => ({
    browser: r.dimensions[0] || "Unknown",
    visitors: r.metrics[0] ?? 0,
    percentage: r.metrics[1] ?? 0,
  }));
}

/* ── Helper: compute previous period date range ── */

export function getPreviousPeriodRange(
  range: string,
): string | [string, string] {
  const today = new Date();

  switch (range) {
    case "day": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const ymd = yesterday.toISOString().split("T")[0];
      return [ymd, ymd];
    }
    case "7d": {
      const end = new Date(today);
      end.setDate(end.getDate() - 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return [
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0],
      ];
    }
    case "30d": {
      const end = new Date(today);
      end.setDate(end.getDate() - 30);
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return [
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0],
      ];
    }
    case "month": {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const prevMonthEnd = new Date(firstOfMonth);
      prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);
      const prevMonthStart = new Date(
        prevMonthEnd.getFullYear(),
        prevMonthEnd.getMonth(),
        1,
      );
      return [
        prevMonthStart.toISOString().split("T")[0],
        prevMonthEnd.toISOString().split("T")[0],
      ];
    }
    case "12mo": {
      const end = new Date(today);
      end.setFullYear(end.getFullYear() - 1);
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      return [
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0],
      ];
    }
    default:
      return "30d";
  }
}

/* ── Helper: get timeseries interval for range ── */

export function getIntervalForRange(
  range: string,
): "hour" | "day" | "week" | "month" {
  switch (range) {
    case "day":
      return "hour";
    case "7d":
      return "day";
    case "30d":
      return "day";
    case "month":
      return "day";
    case "12mo":
      return "month";
    default:
      return "day";
  }
}
