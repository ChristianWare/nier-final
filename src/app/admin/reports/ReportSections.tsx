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
  compact = false,
}: {
  params: Record<string, string>;
  /** Short "PDF / CSV" labels, for table rows. */
  compact?: boolean;
}) {
  return (
    <span className={styles.downloads}>
      <a className='tab' href={exportHref({ ...params, format: "pdf" })}>
        {compact ? "PDF" : "Download PDF"}
      </a>
      <a className='tab' href={exportHref({ ...params, format: "csv" })}>
        {compact ? "CSV" : "Download CSV"}
      </a>
    </span>
  );
}

/** A report section's heading: title and period on the left, actions on
 *  the right (they drop below on small screens). */
export function SectionHead({
  title,
  badge,
  children,
}: {
  title: string;
  badge: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.sectionTop}>
      <div className={styles.sectionTopText}>
        <h2 className={`cardTitle h4`}>{title}</h2>
        <span className={styles.sectionBadge}>{badge}</span>
      </div>
      {children ? (
        <div className={styles.sectionActions}>{children}</div>
      ) : null}
    </div>
  );
}

// ── Tax year package ─────────────────────────────────────────────────────────

const PACKAGE_FILES = [
  [
    "summary.pdf",
    "The year by month, driver pay by driver, and notes for your accountant",
  ],
  ["monthly-summary.csv", "Fares, tips, refunds and net, month by month"],
  ["payments.csv", "Every payment received"],
  ["refunds.csv", "Every refund"],
  [
    "driver-pay-by-driver.csv",
    "Each driver's pay and tips, with their 1099 details",
  ],
  ["driver-pay-by-ride.csv", "Driver pay and tips on every ride"],
  ["corporate-invoices.csv", "Corporate invoices issued in the year"],
] as const;

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
  const unpaidTotal = unpaid.reduce((s, i) => s + i.balance, 0);
  const driverPay = drivers.reduce((s, g) => s + g.payCents + g.tipCents, 0);
  const yearRange = `range=range&from=${year}-01-01&to=${year}-12-31`;
  const plural = (n: number, one: string, many: string) =>
    n === 1 ? one : many;

  const checks: {
    ok: boolean;
    text: string;
    people?: { href: string; label: string }[];
    action?: { href: string; label: string };
  }[] = [
    {
      ok: missingDetails.length === 0,
      text:
        missingDetails.length === 0
          ? "Every driver you paid has a legal name and W-9 date on file"
          : `${missingDetails.length} paid ${plural(missingDetails.length, "driver is", "drivers are")} missing a legal name or W-9 date`,
      people: missingDetails.map((g) => ({
        href: `/admin/drivers/${g.driverId}`,
        label: g.name,
      })),
    },
    {
      ok: missingPay === 0,
      text:
        missingPay === 0
          ? "Driver pay is recorded on every completed ride"
          : `${missingPay} completed ${plural(missingPay, "ride has", "rides have")} no driver pay recorded`,
      action: missingPay
        ? {
            href: `/admin/drivers?${yearRange}#missing-pay`,
            label: "Fill in missing pay",
          }
        : undefined,
    },
    {
      ok: notClosedOut === 0,
      text:
        notClosedOut === 0
          ? "Every past ride is closed out"
          : `${notClosedOut} past ${plural(notClosedOut, "ride isn't", "rides aren't")} closed out`,
      action: notClosedOut
        ? {
            href: `/admin/drivers?${yearRange}#not-closed-out`,
            label: "Review rides",
          }
        : undefined,
    },
    {
      ok: unpaid.length === 0,
      text:
        unpaid.length === 0
          ? "Every corporate invoice from the year is paid"
          : `${unpaid.length} corporate ${plural(unpaid.length, "invoice is", "invoices are")} unpaid (${short(unpaidTotal)})`,
      action: unpaid.length
        ? { href: "/admin/corporate", label: "Corporate accounts" }
        : undefined,
    },
  ];

  return (
    <section className={styles.section}>
      <SectionHead title='Tax year package' badge={`${year} · calendar year`}>
        <TaxYearSelect years={years} year={year} />
        <a
          className={`rangeSubmitBtn ${styles.actionBtn}`}
          href={exportHref({
            type: "tax",
            period: "year",
            year,
            format: "zip",
          })}
        >
          Download {year} package (ZIP)
        </a>
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
          sub={`${paid.length} ${plural(paid.length, "driver", "drivers")} paid per ride`}
        />
        <KpiCard
          label='Corporate outstanding'
          value={short(unpaidTotal)}
          sub={`${invoices.length} ${plural(invoices.length, "invoice", "invoices")} issued`}
          tone={unpaid.length ? "warn" : "neutral"}
        />
      </div>

      <div className={styles.twoCols}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Before you send it</h3>
          <ul className={styles.checklist}>
            {checks.map((c, i) => (
              <li key={i} className={c.ok ? styles.checkOk : styles.checkWarn}>
                <span className={styles.checkIcon} aria-hidden='true'>
                  {c.ok ? "✓" : "!"}
                </span>
                <div className={styles.checkBody}>
                  <div>{c.text}</div>
                  {c.people?.length ? (
                    <div className={styles.checkPeople}>
                      {c.people.map((p, j) => (
                        <span key={p.href}>
                          {j > 0 ? ", " : ""}
                          <Link href={p.href}>{p.label}</Link>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {c.action ? (
                  <Link className={styles.checkAction} href={c.action.href}>
                    {c.action.label} →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>What&apos;s inside</h3>
          <ul className={styles.fileList}>
            {PACKAGE_FILES.map(([file, about]) => (
              <li key={file}>
                <span className={styles.fileName}>{file}</span>
                <span className='miniNote'>{about}</span>
              </li>
            ))}
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
        <span className='miniNote'>All drivers:</span>
        <Downloads
          params={{ type: "drivers", driver: "all", ...exportParams }}
        />
      </SectionHead>
      {drivers.length === 0 ? (
        <p className={styles.emptyNote}>
          No completed rides with a driver in this period.
        </p>
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
                      compact
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
          sub={`${basisLabel.charAt(0).toUpperCase()}${basisLabel.slice(1)} in this period`}
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
          sub={
            ops.noShowRate == null
              ? "No past rides yet"
              : `${ops.noShows} no-shows`
          }
        />
      </div>
      <Link className={styles.inlineLink} href={dashboardHref}>
        Status, lead-time, peak-time and driver charts are on the
        dashboard&apos;s Reporting tab →
      </Link>
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
          tone={paid > 0 ? "good" : "neutral"}
        />
        <KpiCard
          label='Outstanding'
          value={short(outstanding)}
          sub={`${open.length} open ${open.length === 1 ? "invoice" : "invoices"}`}
          tone={open.length ? "warn" : "neutral"}
        />
      </div>
      {live.length === 0 ? (
        <p className={styles.emptyNote}>
          No corporate invoices were issued in this period.
        </p>
      ) : open.length > 0 ? (
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
