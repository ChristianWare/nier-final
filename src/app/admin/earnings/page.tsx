/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import Button from "@/components/shared/Button/Button";
import { db } from "@/lib/db";
import base from "../AdminStyles.module.css";
import styles from "./AdminEarningsPage.module.css";
import EarningsControls from "./EarningsControls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

type ViewMode = "month" | "ytd" | "all" | "range";

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateShortPhx(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTimePhx(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDatePhx(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMonthLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: PHX_TZ,
  }).format(dateUtc);
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function shortId(id: string | null | undefined, n = 7) {
  if (!id) return "—";
  if (id.length <= n) return id;
  return `${id.slice(0, n)}…`;
}

function toPhoenixParts(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  return { y: phx.getUTCFullYear(), m: phx.getUTCMonth(), d: phx.getUTCDate() };
}

function startOfDayPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfMonthPhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfYearPhoenix(dateUtc: Date) {
  const { y } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, 0, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;
  return new Date(nextStartUtcMs);
}

function monthKeyFromDatePhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const mm = String(m + 1).padStart(2, "0");
  return `${y}-${mm}`;
}

function monthStartFromKeyPhoenix(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12)
    return null;
  const startLocalMs = Date.UTC(y, m - 1, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function parseYMD(s: string | null) {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function startOfDayFromYMDPhoenix(ymd: { y: number; m: number; d: number }) {
  const startLocalMs = Date.UTC(ymd.y, ymd.m - 1, ymd.d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function ymdForInputPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function cleanView(v: string | undefined): ViewMode {
  if (v === "month" || v === "ytd" || v === "all" || v === "range") return v;
  return "month";
}

function buildHref(
  basePath: string,
  params: Record<string, string | undefined | null>,
) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v.trim().length > 0) usp.set(k, v);
  }
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

async function capturedAgg(from: Date, to: Date) {
  const agg = await db.payment.aggregate({
    where: { paidAt: { gte: from, lt: to } },
    _sum: { amountTotalCents: true },
    _avg: { amountTotalCents: true },
    _count: { _all: true },
  });

  return {
    sumCents: agg._sum.amountTotalCents ?? 0,
    avgCents: Math.round(agg._avg.amountTotalCents ?? 0),
    count: agg._count._all ?? 0,
  };
}

async function refundAgg(from: Date, to: Date) {
  const agg = await db.payment.aggregate({
    where: {
      status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
      updatedAt: { gte: from, lt: to },
    },
    _sum: { amountTotalCents: true },
    _count: { _all: true },
  });

  return {
    sumCents: agg._sum.amountTotalCents ?? 0,
    count: agg._count._all ?? 0,
  };
}

function resolveMonthYear({
  view,
  searchParams,
  now,
}: {
  view: ViewMode;
  searchParams?: Record<string, string | string[] | undefined>;
  now: Date;
}) {
  const currentKey = monthKeyFromDatePhoenix(now);
  const currentYear = currentKey.slice(0, 4);
  const currentMonth = currentKey.slice(5, 7);

  const legacyKey =
    typeof searchParams?.month === "string" &&
    monthStartFromKeyPhoenix(searchParams.month)
      ? searchParams.month
      : null;

  const yearParam =
    typeof searchParams?.year === "string" ? searchParams.year : null;
  const monthParam =
    typeof searchParams?.month === "string" ? searchParams.month : null;

  if (view !== "month") {
    return { year: currentYear, month: currentMonth, key: currentKey };
  }

  if (legacyKey) {
    return {
      year: legacyKey.slice(0, 4),
      month: legacyKey.slice(5, 7),
      key: legacyKey,
    };
  }

  const y = yearParam && /^\d{4}$/.test(yearParam) ? yearParam : currentYear;
  const m =
    monthParam && /^(0[1-9]|1[0-2])$/.test(monthParam)
      ? monthParam
      : currentMonth;

  return { year: y, month: m, key: `${y}-${m}` };
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const now = new Date();
  const view = cleanView(
    typeof searchParams?.view === "string" ? searchParams.view : undefined,
  );

  const currentMonthStart = startOfMonthPhoenix(now);

  const rangeFromParam =
    typeof searchParams?.from === "string" ? searchParams.from : null;
  const rangeToParam =
    typeof searchParams?.to === "string" ? searchParams.to : null;

  const defaultTo = ymdForInputPhoenix(now);
  const defaultFrom = ymdForInputPhoenix(
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  );

  const resolvedMY = resolveMonthYear({ view, searchParams, now });
  const resolvedMonthKey = resolvedMY.key;

  let fromUtc = currentMonthStart;
  let toUtc = addMonthsPhoenix(currentMonthStart, 1);
  let rangeLabel = formatMonthLabelPhoenix(currentMonthStart);

  if (view === "month") {
    const ms = monthStartFromKeyPhoenix(resolvedMonthKey) ?? currentMonthStart;
    fromUtc = ms;
    toUtc = addMonthsPhoenix(ms, 1);
    rangeLabel = formatMonthLabelPhoenix(ms);
  }

  if (view === "ytd") {
    fromUtc = startOfYearPhoenix(now);
    toUtc = addMonthsPhoenix(currentMonthStart, 1);
    rangeLabel = "Year to date";
  }

  if (view === "range") {
    const f = parseYMD(rangeFromParam ?? defaultFrom);
    const t = parseYMD(rangeToParam ?? defaultTo);
    const fUtc = f
      ? startOfDayFromYMDPhoenix(f)
      : startOfDayFromYMDPhoenix(parseYMD(defaultFrom)!);
    const tUtc0 = t
      ? startOfDayFromYMDPhoenix(t)
      : startOfDayFromYMDPhoenix(parseYMD(defaultTo)!);
    const tUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    fromUtc = fUtc;
    toUtc = tUtc;
    rangeLabel = `${formatDatePhx(fromUtc)} → ${formatDatePhx(new Date(toUtc.getTime() - 1))}`;
  }

  if (view === "all") {
    const earliest = await db.payment.findFirst({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    });

    fromUtc = earliest?.paidAt
      ? startOfDayPhoenix(earliest.paidAt)
      : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    toUtc = new Date(startOfDayPhoenix(now).getTime() + 24 * 60 * 60 * 1000);
    rangeLabel = "All time";
  }

  const [earliestPaid, latestPaid] = await Promise.all([
    db.payment.findFirst({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    }),
    db.payment.findFirst({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true },
    }),
  ]);

  const earliestYear = earliestPaid?.paidAt
    ? toPhoenixParts(earliestPaid.paidAt).y
    : toPhoenixParts(now).y;
  const latestYear = latestPaid?.paidAt
    ? toPhoenixParts(latestPaid.paidAt).y
    : toPhoenixParts(now).y;

  const years = Array.from({
    length: Math.max(1, latestYear - earliestYear + 1),
  }).map((_, i) => String(latestYear - i));

  const monthOptions = [
    { v: "01", label: "Jan" },
    { v: "02", label: "Feb" },
    { v: "03", label: "Mar" },
    { v: "04", label: "Apr" },
    { v: "05", label: "May" },
    { v: "06", label: "Jun" },
    { v: "07", label: "Jul" },
    { v: "08", label: "Aug" },
    { v: "09", label: "Sep" },
    { v: "10", label: "Oct" },
    { v: "11", label: "Nov" },
    { v: "12", label: "Dec" },
  ];

  const currency = "USD";

  const [captured, refunded, payments] = await Promise.all([
    capturedAgg(fromUtc, toUtc),
    refundAgg(fromUtc, toUtc),
    db.payment.findMany({
      where: { paidAt: { gte: fromUtc, lt: toUtc } },
      orderBy: { paidAt: "desc" },
      take: 250,
      select: {
        id: true,
        paidAt: true,
        amountTotalCents: true,
        currency: true,
        bookingId: true,
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            userId: true,
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
            guestPhone: true,
          },
        },
      },
    }),
  ]);

  const netCents = Math.max(0, captured.sumCents - refunded.sumCents);

  const monthMenuStarts = Array.from({ length: 12 }).map((_, i) =>
    addMonthsPhoenix(startOfMonthPhoenix(now), -i),
  );
  const oldestMonthStart =
    monthMenuStarts[monthMenuStarts.length - 1] ?? startOfMonthPhoenix(now);
  const nextAfterCurrent = addMonthsPhoenix(startOfMonthPhoenix(now), 1);

  const last12Rows = await db.payment.findMany({
    where: { paidAt: { gte: oldestMonthStart, lt: nextAfterCurrent } },
    select: { paidAt: true, amountTotalCents: true },
  });

  const bucket = new Map<string, { sumCents: number; count: number }>();
  for (const r of last12Rows) {
    if (!r.paidAt) continue;
    const key = monthKeyFromDatePhoenix(r.paidAt);
    const prev = bucket.get(key) ?? { sumCents: 0, count: 0 };
    bucket.set(key, {
      sumCents: prev.sumCents + (r.amountTotalCents ?? 0),
      count: prev.count + 1,
    });
  }

  const monthSummary = monthMenuStarts
    .map((ms) => {
      const key = monthKeyFromDatePhoenix(ms);
      const label = formatMonthLabelPhoenix(ms);
      const v = bucket.get(key) ?? { sumCents: 0, count: 0 };
      const avgCents = v.count > 0 ? Math.round(v.sumCents / v.count) : 0;
      return { key, label, sumCents: v.sumCents, count: v.count, avgCents };
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  const exportHref = buildHref("/admin/earnings/export", {
    view,
    year: view === "month" ? resolvedMY.year : undefined,
    month: view === "month" ? resolvedMY.month : undefined,
    from: view === "range" ? (rangeFromParam ?? defaultFrom) : undefined,
    to: view === "range" ? (rangeToParam ?? defaultTo) : undefined,
  });

  return (
    <section className={`${base.content} ${styles.container}`}>
      <header className='header'>
        <h1 className='heading h2'>Earnings</h1>

        <div className={styles.earningsTop}>
          <p className='subheading'>
            View captured revenue, refunds, and net totals by month, range,
            year-to-date, or all time.
          </p>
          <div className={styles.headerActions}>
            <Button
              href={exportHref}
              text='Download CSV'
              btnType='black'
              downloadIcon
            />
          </div>
        </div>

        <EarningsControls
          years={years}
          monthOptions={monthOptions}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
          initialView={view}
          initialYear={resolvedMY.year}
          initialMonth={resolvedMY.month}
          initialFrom={rangeFromParam ?? defaultFrom}
          initialTo={rangeToParam ?? defaultTo}
          rangeLabel={rangeLabel}
        />
      </header>

      <div className={styles.kpiGrid}>
        <KpiCard
          label='Captured'
          value={formatMoney(captured.sumCents, currency)}
          sub={`${captured.count} payment${captured.count === 1 ? "" : "s"}`}
        />
        <KpiCard
          label='Avg order value'
          value={formatMoney(captured.avgCents, currency)}
          sub='Selected period'
        />
        <KpiCard
          label='Refunded'
          value={formatMoney(refunded.sumCents, currency)}
          sub={`${refunded.count} refund${refunded.count === 1 ? "" : "s"}`}
          tone='warn'
        />
        <KpiCard
          label='Net'
          value={formatMoney(netCents, currency)}
          sub='Captured minus refunded'
          tone='good'
        />
      </div>

      <div className={styles.twoCol}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className='cardTitle h4'>Monthly breakdown</div>
            <div className='miniNote'>Last 12 months</div>
          </div>
          <div className={styles.cardHeaderRight}>
            <span className='miniNote'>Selected</span>
            <span className={styles.selectedMonth}>
              {view === "month" ? resolvedMonthKey : "—"}
            </span>
          </div>

          <div className={styles.monthTableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className={styles.right}>Captured</th>
                  <th className={styles.right}>Payments</th>
                  <th className={styles.right}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {monthSummary.map((m) => {
                  const active = view === "month" && m.key === resolvedMonthKey;
                  const y = m.key.slice(0, 4);
                  const mo = m.key.slice(5, 7);
                  return (
                    <tr key={m.key} className={active ? styles.rowActive : ""}>
                      <td>
                        <Link
                          className={styles.rowLink}
                          href={buildHref("/admin/earnings", {
                            view: "month",
                            year: y,
                            month: mo,
                          })}
                        >
                          {m.label}
                        </Link>
                      </td>
                      <td className={styles.right}>
                        {formatMoney(m.sumCents, currency)}
                      </td>
                      <td className={styles.right}>{m.count}</td>
                      <td className={styles.right}>
                        {formatMoney(m.avgCents, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.cardFooter}>
            <Button
              href={exportHref}
              text='Download CSV for current view'
              btnType='black'
              downloadIcon
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className='cardTitle h4'>Payments</div>
            <div className='miniNote'>Most recent 250 for selected period</div>
          </div>
          <div className={styles.cardHeaderRight}>
            <span className='miniNote'>Phoenix time</span>
            <span className={styles.tzPill}>{PHX_TZ}</span>
          </div>

          {payments.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No payments found</div>
              <div className='miniNote'>
                Try a different filter or expand the date range.
              </div>
            </div>
          ) : (
            <div className={styles.paymentsTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paid</th>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th className={styles.right}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const paidAt = p.paidAt ? new Date(p.paidAt) : null;
                    const b = p.booking;
                    const cust =
                      (b?.user?.name?.trim() || b?.user?.email || "").trim() ||
                      (b?.guestName?.trim() || b?.guestEmail || "").trim() ||
                      "Customer";

                    const bookingHref = b?.id
                      ? buildHref("/admin/bookings", { bookingId: b.id })
                      : "/admin/bookings";
                    const bookingId = b?.id ?? p.bookingId ?? null;

                    return (
                      <tr key={p.id}>
                        <td>{paidAt ? formatDateShortPhx(paidAt) : "—"}</td>
                        <td>
                          <Link className={styles.rowLink} href={bookingHref}>
                            <div className={styles.bookingId}>
                              {shortId(bookingId, 7)}
                            </div>
                          </Link>
                        </td>
                        <td>
                          <div className={styles.customerName}>{cust}</div>
                          {b?.pickupAt ? (
                            <div className='miniNote'>
                              Pickup: {formatDateTimePhx(new Date(b.pickupAt))}
                            </div>
                          ) : (
                            <div className='miniNote' />
                          )}
                        </td>
                        <td className={styles.right}>
                          {formatMoney(p.amountTotalCents ?? 0, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.cardFooter}>
            <Button
              href={exportHref}
              text='Download CSV'
              btnType='black'
              downloadIcon
            />
          </div>
        </section>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div className={`${styles.kpiCard} ${styles[`tone_${tone}`]}`}>
      <div className={styles.kpiTop}>
        <div className='emptyTitle underline'>{label}</div>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className='miniNote'>{sub}</div>
    </div>
  );
}
