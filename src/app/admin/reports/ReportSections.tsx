// The Reports page: one section per report in "Build a report", each with a
// preview of its numbers and downloads for the selected period. Every number
// comes from the same code the downloads use.

import Link from "next/link";
import * as tz from "@/lib/timezone";
import { chartAggMonthly, kpisFromChartData } from "@/lib/earnings/moneyIn";
import {
  isNotClosedOut,
  loadReportRides,
  operationalStats,
  type ReportRide,
} from "@/lib/reports/rideStats";
import {
  loadCorporateInvoices,
  loadDriverPay,
  type ReportContext,
} from "@/lib/reports/build";
import { resolvePeriod, type Period } from "@/lib/reports/period";
import KpiCard from "./KpiCard";
import TaxYearSelect from "./TaxYearSelect";
import styles from "./AdminReportsPage.module.css";

const short = (c: number) => tz.formatMoneyShort(c, "USD");
const money = (c: number) => tz.formatMoney(c, "USD");

function exportHref(params: Record<string, string>) {
  return `/admin/reports/export?${new URLSearchParams(params).toString()}`;
}

/** "Download PDF / CSV" for a report, for the given period. */
export function Downloads({
  params,
  label,
}: {
  params: Record<string, string>;
  label?: string;
}) {
  return (
    <span className={styles.downloads}>
      {label ? <span className='miniNote'>{label}</span> : null}
      <a className='tab' href={exportHref({ ...params, format: "pdf" })}>
        PDF
      </a>
      <a className='tab' href={exportHref({ ...params, format: "csv" })}>
        CSV
      </a>
    </span>
  );
}

function SectionHead({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`header ${styles.sectionHead}`}>
      <div>
        <h2 className={`cardTitle h4`}>{title}</h2>
        <span className={styles.sectionBadge}>{badge}</span>
      </div>
      {children}
    </div>
  );
}

// ── Tax year package ─────────────────────────────────────────────────────────

export async function TaxPackageSection({
  year,
  years,
  ctx,
}: {
  year: string;
  years: string[];
  ctx: ReportContext;
}) {
  const period = resolvePeriod({ period: "year", year }, ctx.timezone, ctx.now);
  const from = period.fromUtc!;
  const to = period.toUtc!;
  const [months, drivers, invoices, rides] = await Promise.all([
    chartAggMonthly(from, to, ctx.timezone),
    loadDriverPay(period),
    loadCorporateInvoices(period),
    loadReportRides({ dateField: "pickupAt", window: { gte: from, lt: to } }),
  ]);
  const kpi = kpisFromChartData(months);
  const todayStart = tz.startOfDay(ctx.now, ctx.timezone);
  const notClosedOut = rides.filter((r) =>
    isNotClosedOut(r, todayStart),
  ).length;
  const missingPay = drivers.reduce((s, g) => s + g.missing, 0);
  const paid = drivers.filter(
    (g) => g.paidPerRide && g.payCents + g.tipCents > 0,
  );
  const missingDetails = paid.filter((g) => !g.legalName || !g.w9ReceivedAt);
  const unpaid = invoices.filter((i) => i.status !== "VOID" && i.balance > 0);
  const driverPay = drivers.reduce((s, g) => s + g.payCents + g.tipCents, 0);
  const yearRange = `range=range&from=${year}-01-01&to=${year}-12-31`;

  const checks = [
    {
      ok: missingDetails.length === 0,
      text:
        missingDetails.length === 0
          ? "Every driver you paid has a legal name and W-9 date on file"
          : `${missingDetails.length} paid ${missingDetails.length === 1 ? "driver is" : "drivers are"} missing a legal name or W-9 date:`,
      links: missingDetails.map((g) => ({
        href: `/admin/drivers/${g.driverId}`,
        label: g.name,
      })),
    },
    {
      ok: missingPay === 0,
      text:
        missingPay === 0
          ? "Driver pay is recorded on every completed ride"
          : `${missingPay} completed ${missingPay === 1 ? "ride has" : "rides have"} no driver pay recorded`,
      links: missingPay
        ? [
            {
              href: `/admin/drivers?${yearRange}#missing-pay`,
              label: "Fill in missing pay",
            },
          ]
        : [],
    },
    {
      ok: notClosedOut === 0,
      text:
        notClosedOut === 0
          ? "Every past ride is closed out"
          : `${notClosedOut} past ${notClosedOut === 1 ? "ride isn't" : "rides aren't"} closed out`,
      links: notClosedOut
        ? [
            {
              href: `/admin/drivers?${yearRange}#not-closed-out`,
              label: "Review rides",
            },
          ]
        : [],
    },
    {
      ok: unpaid.length === 0,
      text:
        unpaid.length === 0
          ? "Every corporate invoice from the year is paid"
          : `${unpaid.length} corporate ${unpaid.length === 1 ? "invoice is" : "invoices are"} unpaid (${short(unpaid.reduce((s, i) => s + i.balance, 0))})`,
      links: unpaid.length
        ? [{ href: "/admin/corporate", label: "Corporate accounts" }]
        : [],
    },
  ];

  return (
    <section className={styles.section}>
      <SectionHead title='Tax year package' badge={`${year} · calendar year`}>
        <span className={styles.downloads}>
          <TaxYearSelect years={years} year={year} />
          <a
            className='rangeSubmitBtn'
            href={exportHref({
              type: "tax",
              period: "year",
              year,
              format: "zip",
            })}
          >
            Download {year} package (ZIP)
          </a>
        </span>
      </SectionHead>
      <div className={styles.kpiGrid}>
        <KpiCard
          label='Money received'
          value={short(kpi.capturedSumCents)}
          sub={`Net ${short(kpi.netSumCents)} after refunds`}
          tone='good'
        />
        <KpiCard
          label='Driver pay + tips'
          value={short(driverPay)}
          sub={`${paid.length} drivers paid per ride`}
        />
        <KpiCard
          label='Corporate outstanding'
          value={short(unpaid.reduce((s, i) => s + i.balance, 0))}
          sub={`${invoices.length} invoices issued`}
          tone={unpaid.length ? "warn" : "neutral"}
        />
      </div>
      <div className={styles.twoCols}>
        <div>
          <h3 className='cardTitle h6'>Before you send it</h3>
          <ul className={styles.checklist}>
            {checks.map((c, i) => (
              <li key={i} className={c.ok ? styles.checkOk : styles.checkWarn}>
                <span aria-hidden='true'>{c.ok ? "✓" : "!"}</span>
                <span>
                  {c.text}{" "}
                  {c.links.map((l, j) => (
                    <span key={l.href}>
                      {j > 0 ? ", " : ""}
                      <Link href={l.href}>{l.label}</Link>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className='cardTitle h6'>What&apos;s inside</h3>
          <ul className={styles.contents}>
            <li>
              summary.pdf: the year by month, driver pay by driver, notes for
              your accountant
            </li>
            <li>monthly-summary.csv, payments.csv, refunds.csv</li>
            <li>driver-pay-by-driver.csv, driver-pay-by-ride.csv</li>
            <li>corporate-invoices.csv</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Driver pay statements ────────────────────────────────────────────────────

export async function DriverPaySection({
  period,
  exportParams,
}: {
  period: Period;
  exportParams: Record<string, string>;
}) {
  const drivers = await loadDriverPay(period);
  return (
    <section className={styles.section}>
      <SectionHead
        title='Driver pay statements'
        badge={`${period.label} · completed rides by pickup date`}
      >
        <Downloads
          params={{ type: "drivers", driver: "all", ...exportParams }}
          label='All drivers:'
        />
      </SectionHead>
      {drivers.length === 0 ? (
        <div className={styles.emptyState}>
          No completed rides with a driver in this period.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Driver</th>
                <th className={styles.right}>Completed rides</th>
                <th className={styles.right}>Pay</th>
                <th className={styles.right}>Tips</th>
                <th className={styles.right}>Total</th>
                <th>W-9</th>
                <th className={styles.right}>Statement</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((g) => (
                <tr key={g.driverId}>
                  <td>
                    <Link href={`/admin/drivers/${g.driverId}`}>
                      <strong>{g.name}</strong>
                    </Link>
                    {g.missing > 0 ? (
                      <div className='miniNote'>
                        {g.missing} rides missing pay
                      </div>
                    ) : null}
                    {!g.paidPerRide ? (
                      <div className='miniNote'>Not paid per ride</div>
                    ) : null}
                  </td>
                  <td className={styles.right}>{g.rides.length}</td>
                  <td className={styles.right}>{money(g.payCents)}</td>
                  <td className={styles.right}>{money(g.tipCents)}</td>
                  <td className={styles.right}>
                    <strong>{money(g.payCents + g.tipCents)}</strong>
                  </td>
                  <td>{g.w9ReceivedAt ? "On file" : "—"}</td>
                  <td className={styles.right}>
                    <Downloads
                      params={{
                        type: "drivers",
                        driver: g.driverId,
                        ...exportParams,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Bookings & operations (the charts are on the dashboard) ─────────────────

export function OperationsSummarySection({
  rides,
  todayStart,
  rangeLabel,
  basisLabel,
  basis,
  exportParams,
  dashboardHref,
}: {
  rides: ReportRide[];
  todayStart: Date;
  rangeLabel: string;
  basisLabel: string;
  basis: "pickup" | "created";
  exportParams: Record<string, string>;
  dashboardHref: string;
}) {
  const ops = operationalStats(rides, todayStart);
  const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
  return (
    <section className={styles.section}>
      <SectionHead
        title='Bookings & operations'
        badge={`${rangeLabel} · ${basisLabel}`}
      >
        <Downloads params={{ type: "operations", basis, ...exportParams }} />
      </SectionHead>
      <div className={styles.kpiGrid}>
        <KpiCard
          label='Rides'
          value={String(ops.total)}
          sub={`Rides ${basisLabel}`}
        />
        <KpiCard
          label='Completion rate'
          value={pct(ops.completionRate)}
          sub={`${ops.completed} completed · ${ops.notClosedOut} not closed out`}
          tone='good'
        />
        <KpiCard
          label='Cancellation rate'
          value={pct(ops.cancellationRate)}
          sub={`${ops.cancelled} cancelled`}
          tone='warn'
        />
        <KpiCard
          label='No-show rate'
          value={pct(ops.noShowRate)}
          sub={`${ops.noShows} no-shows`}
        />
      </div>
      <p className='miniNote'>
        The status, lead-time, peak-time and driver charts are on the dashboard:{" "}
        <Link href={dashboardHref}>open the Reporting tab →</Link>
      </p>
    </section>
  );
}

// ── Corporate invoices ───────────────────────────────────────────────────────

export async function CorporateSection({
  period,
  exportParams,
  ctx,
}: {
  period: Period;
  exportParams: Record<string, string>;
  ctx: ReportContext;
}) {
  const invoices = await loadCorporateInvoices(period);
  const live = invoices.filter((i) => i.status !== "VOID");
  const open = live.filter((i) => i.balance > 0);
  const invoiced = live.reduce((s, i) => s + i.totalCents, 0);
  const paid = live.reduce((s, i) => s + i.amountPaidCents, 0);
  const outstanding = open.reduce((s, i) => s + i.balance, 0);
  return (
    <section className={styles.section}>
      <SectionHead
        title='Corporate invoices'
        badge={`${period.label} · by date issued`}
      >
        <Downloads params={{ type: "corporate", ...exportParams }} />
      </SectionHead>
      <div className={styles.kpiGrid}>
        <KpiCard
          label='Invoices issued'
          value={String(live.length)}
          sub={period.label}
        />
        <KpiCard label='Invoiced' value={short(invoiced)} sub='Total billed' />
        <KpiCard
          label='Paid'
          value={short(paid)}
          sub='Received so far'
          tone='good'
        />
        <KpiCard
          label='Outstanding'
          value={short(outstanding)}
          sub={`${open.length} open ${open.length === 1 ? "invoice" : "invoices"}`}
          tone={open.length ? "warn" : "neutral"}
        />
      </div>
      {open.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Account</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Status</th>
                <th className={styles.right}>Total</th>
                <th className={styles.right}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {open.slice(0, 10).map((i) => (
                <tr key={i.invoiceNumber}>
                  <td>{i.invoiceNumber}</td>
                  <td>{i.account}</td>
                  <td>{tz.formatDate(i.createdAt, ctx.timezone)}</td>
                  <td>
                    {i.dueDate ? tz.formatDate(i.dueDate, ctx.timezone) : "—"}
                  </td>
                  <td>{tz.statusLabel(i.status)}</td>
                  <td className={styles.right}>{money(i.totalCents)}</td>
                  <td className={styles.right}>
                    <strong>{money(i.balance)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {open.length > 10 ? (
            <p className='miniNote'>
              And {open.length - 10} more in the download.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
