// src/lib/reports/build.ts
//
// The data behind each generated report. Every number comes from the same
// shared calculations as the Earnings, Bookings, Reports and Drivers pages.

import { db } from "@/lib/db";
import * as tz from "@/lib/timezone";
import {
  chartAggDaily,
  chartAggMonthly,
  getRevenueByServiceType,
  getRevenueByVehicle,
  kpisFromChartData,
} from "@/lib/earnings/moneyIn";
import { findTripCashPayments } from "@/lib/earnings/tripCash";
import {
  driverStats,
  leadTimeBuckets,
  loadReportRides,
  operationalStats,
  peakTimes,
  type ReportRide,
} from "@/lib/reports/rideStats";
import { PAYABLE_STATUSES, isPayMissing } from "@/lib/drivers/driverPay";
import { dollars, type CsvFile } from "./csv";
import type { BuiltReport, ReportModel, ReportSection } from "./model";
import type { Period } from "./period";

export type ReportContext = {
  timezone: string;
  companyName: string;
  now: Date;
};

const fmt = (cents: number) => tz.formatMoney(cents, "USD");
const short = (cents: number) => tz.formatMoneyShort(cents, "USD");
const bookingRef = (id: string) => id.slice(0, 7).toUpperCase();

function header(
  ctx: ReportContext,
  title: string,
  period: Period,
  sections: ReportSection[],
): ReportModel {
  return {
    title,
    companyName: ctx.companyName,
    periodLabel: period.label,
    generatedLabel: `Generated ${tz.formatDateTime(ctx.now, ctx.timezone)}`,
    sections,
  };
}

/** Money reports need real dates; "all time" starts at the first payment. */
async function moneyBounds(period: Period, ctx: ReportContext) {
  if (period.fromUtc && period.toUtc) {
    return { from: period.fromUtc, to: period.toUtc };
  }
  const first = await db.payment.findFirst({
    where: { paidAt: { not: null } },
    orderBy: { paidAt: "asc" },
    select: { paidAt: true },
  });
  const tomorrow = new Date(
    tz.startOfDay(ctx.now, ctx.timezone).getTime() + 86_400_000,
  );
  return {
    from: first?.paidAt
      ? tz.startOfDay(first.paidAt, ctx.timezone)
      : new Date(tomorrow.getTime() - 365 * 86_400_000),
    to: tomorrow,
  };
}

function customerOf(
  b: {
    guestName?: string | null;
    guestEmail?: string | null;
    user?: { name: string | null; email: string } | null;
  } | null,
): string {
  return (
    b?.user?.name?.trim() ||
    b?.guestName?.trim() ||
    b?.user?.email ||
    b?.guestEmail ||
    "Customer"
  );
}

// ── Money received ───────────────────────────────────────────────────────────

type LedgerRow = {
  paidAt: Date;
  bookingId: string;
  customer: string;
  method: string;
  fareCents: number;
  tipCents: number;
  refundedCents: number;
};

async function loadLedger(from: Date, to: Date): Promise<LedgerRow[]> {
  const [payments, tripCash] = await Promise.all([
    db.payment.findMany({
      where: { paidAt: { gte: from, lt: to } },
      orderBy: { paidAt: "asc" },
      select: {
        paidAt: true,
        amountPaidCents: true,
        tipCents: true,
        amountRefundedCents: true,
        stripePaymentIntentId: true,
        bookingId: true,
        booking: {
          select: {
            guestName: true,
            guestEmail: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    findTripCashPayments(from, to),
  ]);
  const rows: LedgerRow[] = payments.map((p) => ({
    paidAt: p.paidAt!,
    bookingId: p.bookingId,
    customer: customerOf(p.booking),
    method: p.stripePaymentIntentId ? "Card" : "Recorded by admin",
    fareCents: p.amountPaidCents ?? 0,
    tipCents: p.tipCents ?? 0,
    refundedCents: p.amountRefundedCents ?? 0,
  }));
  for (const t of tripCash) {
    const b = t.trip.bookings[0];
    rows.push({
      paidAt: t.paidAt,
      bookingId: b?.id ?? t.tripId,
      customer: customerOf(b ?? null),
      method: "Cash (trip)",
      fareCents: t.cents,
      tipCents: 0,
      refundedCents: 0,
    });
  }
  return rows.sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
}

async function loadRefunds(from: Date, to: Date) {
  const rows = await db.payment.findMany({
    where: {
      status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
      updatedAt: { gte: from, lt: to },
      amountRefundedCents: { gt: 0 },
    },
    orderBy: { updatedAt: "asc" },
    select: {
      updatedAt: true,
      amountRefundedCents: true,
      bookingId: true,
      booking: {
        select: {
          guestName: true,
          guestEmail: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    at: r.updatedAt,
    bookingId: r.bookingId,
    customer: customerOf(r.booking),
    cents: r.amountRefundedCents,
  }));
}

const MONEY_NOTES = [
  "Money is counted by payment date: fare plus tip, plus cash recorded on trips, minus refunds.",
  "Amounts are gross, before card processing fees. Stripe's own reports show fees, and Stripe may send you a 1099-K to reconcile against.",
  "Each booking has one payment record. A deposit and a later balance on the same booking appear together, on the date of the latest payment.",
];

export async function buildIncomeReport(
  period: Period,
  ctx: ReportContext,
): Promise<BuiltReport> {
  const { from, to } = await moneyBounds(period, ctx);
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  const [points, services, vehicles, ledger, refunds] = await Promise.all([
    days <= 62
      ? chartAggDaily(from, to, ctx.timezone)
      : chartAggMonthly(from, to, ctx.timezone),
    getRevenueByServiceType(from, to),
    getRevenueByVehicle(from, to),
    loadLedger(from, to),
    loadRefunds(from, to),
  ]);
  const kpi = kpisFromChartData(points);
  const tripCash = ledger.filter((r) => r.method === "Cash (trip)");
  const cashSlice = tripCash.length
    ? [
        {
          label: "Cash on trips",
          value: tripCash.reduce((s, r) => s + r.fareCents, 0),
        },
      ]
    : [];

  const sums = ledger.reduce(
    (t, r) => ({ fare: t.fare + r.fareCents, tip: t.tip + r.tipCents }),
    { fare: 0, tip: 0 },
  );

  const sections: ReportSection[] = [
    {
      kind: "kpis",
      items: [
        {
          label: "Money received",
          value: short(kpi.capturedSumCents),
          sub: "Fares + tips",
        },
        { label: "Fares", value: short(kpi.baseSumCents) },
        { label: "Tips", value: short(kpi.tipSumCents) },
        {
          label: "Refunds",
          value: short(kpi.refundedSumCents),
          sub: `${kpi.refundCount} refunds`,
        },
        {
          label: "Net",
          value: short(kpi.netSumCents),
          sub: "Received minus refunds",
        },
        {
          label: "Payments",
          value: String(kpi.payCount),
          sub: `Average ${short(kpi.avgCents)}`,
        },
      ],
    },
    {
      kind: "bar",
      title: days <= 62 ? "Money received by day" : "Money received by month",
      points: points.map((p) => ({ label: p.tick, value: p.capturedCents })),
      money: true,
    },
    {
      kind: "donut",
      title: "By service",
      slices: [
        ...services.map((x) => ({ label: x.name, value: x.value })),
        ...cashSlice,
      ],
      money: true,
    },
    {
      kind: "donut",
      title: "By vehicle",
      slices: [
        ...vehicles.map((x) => ({ label: x.name, value: x.value })),
        ...cashSlice,
      ],
      money: true,
    },
    {
      kind: "table",
      title: "Payments",
      columns: [
        { label: "Date", flex: 1.2 },
        { label: "Booking", flex: 0.9 },
        { label: "Customer", flex: 2 },
        { label: "Method", flex: 1.3 },
        { label: "Fare", align: "right" },
        { label: "Tip", align: "right" },
        { label: "Total", align: "right" },
      ],
      rows: ledger.map((r) => [
        tz.formatDate(r.paidAt, ctx.timezone),
        bookingRef(r.bookingId),
        r.customer,
        r.method,
        fmt(r.fareCents),
        r.tipCents ? fmt(r.tipCents) : "—",
        fmt(r.fareCents + r.tipCents),
      ]),
      totals: [
        "Total",
        "",
        "",
        "",
        fmt(sums.fare),
        fmt(sums.tip),
        fmt(sums.fare + sums.tip),
      ],
    },
    {
      kind: "table",
      title: "Refunds",
      columns: [
        { label: "Date", flex: 1.2 },
        { label: "Booking", flex: 0.9 },
        { label: "Customer", flex: 2 },
        { label: "Refunded", align: "right" },
      ],
      rows: refunds.map((r) => [
        tz.formatDate(r.at, ctx.timezone),
        bookingRef(r.bookingId),
        r.customer,
        fmt(r.cents),
      ]),
      emptyText: "No refunds in this period.",
    },
    {
      kind: "notes",
      title: "How these numbers are counted",
      lines: MONEY_NOTES,
    },
  ];

  const csvs: CsvFile[] = [
    paymentsCsv(ledger, ctx),
    ...(refunds.length ? [refundsCsv(refunds, ctx)] : []),
  ];
  return {
    model: header(ctx, "Income summary", period, sections),
    csvs,
    baseName: `income-${period.fileLabel}`,
  };
}

function paymentsCsv(ledger: LedgerRow[], ctx: ReportContext): CsvFile {
  return {
    name: "payments.csv",
    header: [
      "Date",
      "Booking ID",
      "Customer",
      "Method",
      "Fare ($)",
      "Tip ($)",
      "Total ($)",
      "Refunded ($)",
    ],
    rows: ledger.map((r) => [
      tz.formatIsoDate(r.paidAt, ctx.timezone),
      r.bookingId,
      r.customer,
      r.method,
      dollars(r.fareCents),
      dollars(r.tipCents),
      dollars(r.fareCents + r.tipCents),
      dollars(r.refundedCents),
    ]),
  };
}

function refundsCsv(
  refunds: { at: Date; bookingId: string; customer: string; cents: number }[],
  ctx: ReportContext,
): CsvFile {
  return {
    name: "refunds.csv",
    header: ["Date", "Booking ID", "Customer", "Refunded ($)"],
    rows: refunds.map((r) => [
      tz.formatIsoDate(r.at, ctx.timezone),
      r.bookingId,
      r.customer,
      dollars(r.cents),
    ]),
  };
}

// ── Driver pay ───────────────────────────────────────────────────────────────

export type DriverPayGroup = {
  driverId: string;
  name: string;
  email: string;
  legalName: string | null;
  mailingAddress: string | null;
  w9ReceivedAt: Date | null;
  paidPerRide: boolean;
  rides: ReportRide[];
  payCents: number;
  tipCents: number;
  missing: number;
};

export async function loadDriverPay(
  period: Period,
  driverId?: string,
): Promise<DriverPayGroup[]> {
  const rides = await loadReportRides({
    dateField: "pickupAt",
    window:
      period.fromUtc && period.toUtc
        ? { gte: period.fromUtc, lt: period.toUtc }
        : null,
    driverId,
  });
  const done = rides
    .filter((r) => r.driver && PAYABLE_STATUSES.includes(r.status))
    .sort((a, b) => a.pickupAt.getTime() - b.pickupAt.getTime());

  const ids = [...new Set(done.map((r) => r.driver!.id))];
  if (driverId && !ids.includes(driverId)) ids.push(driverId);
  const people = ids.length
    ? await db.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          email: true,
          driverProfile: {
            select: {
              legalName: true,
              mailingAddress: true,
              w9ReceivedAt: true,
              paidPerRide: true,
            },
          },
        },
      })
    : [];

  // Only the drivers asked for: a single-driver statement never includes
  // anyone else, whatever the lookup returns.
  const wanted = new Set(driverId ? [driverId] : ids);
  return people
    .filter((p) => wanted.has(p.id))
    .map((p) => {
      const mine = done.filter((r) => r.driver!.id === p.id);
      return {
        driverId: p.id,
        name: p.name?.trim() || p.email,
        email: p.email,
        legalName: p.driverProfile?.legalName ?? null,
        mailingAddress: p.driverProfile?.mailingAddress ?? null,
        w9ReceivedAt: p.driverProfile?.w9ReceivedAt ?? null,
        paidPerRide: p.driverProfile?.paidPerRide ?? true,
        rides: mine,
        payCents: mine.reduce((s, r) => s + (r.driverPayCents ?? 0), 0),
        tipCents: mine.reduce((s, r) => s + (r.driverTipCents ?? 0), 0),
        missing: mine.filter(
          (r) => r.driverPaidPerRide && isPayMissing(r.driverPayCents),
        ).length,
      };
    })
    .sort(
      (a, b) =>
        b.payCents + b.tipCents - (a.payCents + a.tipCents) ||
        a.name.localeCompare(b.name),
    );
}

const DRIVER_NOTES = [
  "Pay is counted for completed rides, by pickup date: each driver's pay plus every tip on their rides (tips go to the driver in full).",
  "For 1099s, what counts is when you actually paid the driver. If you pay later than the ride (for example the following week), check year-end rides with your accountant.",
  "Legal name, mailing address and the W-9 date come from each driver's page. No tax ID numbers are stored in the app.",
];

function driverByDriverCsv(groups: DriverPayGroup[]): CsvFile {
  return {
    name: "driver-pay-by-driver.csv",
    header: [
      "Driver",
      "Email",
      "Legal name",
      "Mailing address",
      "W-9 received",
      "Paid per ride",
      "Completed rides",
      "Pay ($)",
      "Tips ($)",
      "Total ($)",
      "Rides missing pay",
    ],
    rows: groups.map((g) => [
      g.name,
      g.email,
      g.legalName ?? "",
      g.mailingAddress ?? "",
      g.w9ReceivedAt ? g.w9ReceivedAt.toISOString().slice(0, 10) : "",
      g.paidPerRide ? "Yes" : "No",
      g.rides.length,
      dollars(g.payCents),
      dollars(g.tipCents),
      dollars(g.payCents + g.tipCents),
      g.missing,
    ]),
  };
}

function driverByRideCsv(
  groups: DriverPayGroup[],
  ctx: ReportContext,
): CsvFile {
  return {
    name: "driver-pay-by-ride.csv",
    header: [
      "Driver",
      "Pickup",
      "Booking ID",
      "Service",
      "Ride price ($)",
      "Pay ($)",
      "Tip ($)",
      "Total ($)",
    ],
    rows: groups.flatMap((g) =>
      g.rides.map((r) => [
        g.name,
        tz.formatIsoDate(r.pickupAt, ctx.timezone),
        r.id,
        r.serviceName ?? "",
        dollars(r.totalCents),
        r.driverPayCents == null ? "" : dollars(r.driverPayCents),
        dollars(r.driverTipCents ?? 0),
        dollars((r.driverPayCents ?? 0) + (r.driverTipCents ?? 0)),
      ]),
    ),
  };
}

export async function buildDriverPayReport(
  period: Period,
  ctx: ReportContext,
  driverId?: string,
): Promise<BuiltReport> {
  const groups = await loadDriverPay(period, driverId);
  const pay = groups.reduce((s, g) => s + g.payCents, 0);
  const tips = groups.reduce((s, g) => s + g.tipCents, 0);
  const rides = groups.reduce((s, g) => s + g.rides.length, 0);
  const missing = groups.reduce((s, g) => s + g.missing, 0);

  const sections: ReportSection[] = [
    {
      kind: "kpis",
      items: [
        ...(driverId
          ? []
          : [{ label: "Drivers", value: String(groups.length) }]),
        { label: "Completed rides", value: String(rides) },
        {
          label: "Pay",
          value: short(pay),
          sub: missing ? `Not recorded on ${missing} rides` : undefined,
        },
        { label: "Tips", value: short(tips) },
        { label: "Total", value: short(pay + tips) },
      ],
    },
  ];
  if (!driverId && groups.length > 1) {
    sections.push({
      kind: "donut",
      title: "Pay + tips by driver",
      slices: groups.map((g) => ({
        label: g.name,
        value: g.payCents + g.tipCents,
      })),
      money: true,
    });
  }
  groups.forEach((g, i) => {
    if (i > 0 || sections.length > 1) sections.push({ kind: "pageBreak" });
    const details = [
      g.legalName ? `Legal name: ${g.legalName}` : "Legal name: not on file",
      g.mailingAddress ? `Address: ${g.mailingAddress}` : null,
      g.w9ReceivedAt
        ? `W-9 received ${tz.formatDateMedium(g.w9ReceivedAt, "UTC")}`
        : "W-9: not recorded",
      g.paidPerRide ? null : "Not paid per ride",
    ].filter(Boolean);
    sections.push({
      kind: "table",
      title: `${g.name} · pay statement`,
      subtitle: details.join(" · "),
      columns: [
        { label: "Pickup", flex: 1.4 },
        { label: "Booking", flex: 0.9 },
        { label: "Service", flex: 1.6 },
        { label: "Price", align: "right" },
        { label: "Pay", align: "right" },
        { label: "Tip", align: "right" },
        { label: "Total", align: "right" },
      ],
      rows: g.rides.map((r) => [
        tz.formatDateTime(r.pickupAt, ctx.timezone),
        bookingRef(r.id),
        r.serviceName ?? "—",
        fmt(r.totalCents),
        r.driverPayCents == null ? "—" : fmt(r.driverPayCents),
        r.driverTipCents ? fmt(r.driverTipCents) : "—",
        fmt((r.driverPayCents ?? 0) + (r.driverTipCents ?? 0)),
      ]),
      totals: [
        `${g.rides.length} rides`,
        "",
        "",
        fmt(g.rides.reduce((s, r) => s + r.totalCents, 0)),
        fmt(g.payCents),
        fmt(g.tipCents),
        fmt(g.payCents + g.tipCents),
      ],
      emptyText: "No completed rides in this period.",
    });
  });
  sections.push({
    kind: "notes",
    title: "How driver pay is counted",
    lines: DRIVER_NOTES,
  });

  const single = driverId ? groups[0] : null;
  return {
    model: header(
      ctx,
      single ? `Pay statement · ${single.name}` : "Driver pay",
      period,
      sections,
    ),
    csvs: single
      ? [driverByRideCsv(groups, ctx)]
      : [driverByDriverCsv(groups), driverByRideCsv(groups, ctx)],
    baseName: single
      ? `pay-statement-${single.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${period.fileLabel}`
      : `driver-pay-${period.fileLabel}`,
  };
}

// ── Bookings & operations ────────────────────────────────────────────────────

export async function buildOperationsReport(
  period: Period,
  ctx: ReportContext,
  basis: "pickup" | "created",
): Promise<BuiltReport> {
  const dateField = basis === "created" ? "createdAt" : "pickupAt";
  const rides = await loadReportRides({
    dateField,
    window:
      period.fromUtc && period.toUtc
        ? { gte: period.fromUtc, lt: period.toUtc }
        : null,
  });
  const todayStart = tz.startOfDay(ctx.now, ctx.timezone);
  const ops = operationalStats(rides, todayStart);
  const drivers = driverStats(rides, ctx.now, todayStart);
  const peaks = peakTimes(rides, ctx.timezone);
  const byService = new Map<string, number>();
  for (const r of rides) {
    const k = r.serviceName ?? "No service";
    byService.set(k, (byService.get(k) ?? 0) + 1);
  }
  const sorted = [...rides].sort(
    (a, b) => a[dateField].getTime() - b[dateField].getTime(),
  );
  const basisLabel = basis === "created" ? "by booked date" : "by pickup date";
  const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

  const sections: ReportSection[] = [
    {
      kind: "kpis",
      items: [
        { label: "Rides", value: String(ops.total), sub: basisLabel },
        {
          label: "Completion rate",
          value: pct(ops.completionRate),
          sub: `${ops.completed} completed · ${ops.notClosedOut} not closed out`,
        },
        {
          label: "Cancellation rate",
          value: pct(ops.cancellationRate),
          sub: `${ops.cancelled} cancelled`,
        },
        {
          label: "No-show rate",
          value: pct(ops.noShowRate),
          sub: `${ops.noShows} no-shows`,
        },
        {
          label: "Booked value",
          value: short(
            rides
              .filter(
                (r) =>
                  !["CANCELLED", "DECLINED", "REFUNDED"].includes(r.status),
              )
              .reduce((s, r) => s + r.totalCents, 0),
          ),
          sub: "Excludes cancelled rides",
        },
        {
          label: "Drivers",
          value: String(drivers.length),
          sub: "With rides in this period",
        },
      ],
    },
    {
      kind: "donut",
      title: "Rides by status",
      slices: ops.byStatus.map((x) => ({
        label: tz.statusLabel(x.status),
        value: x.count,
      })),
    },
    {
      kind: "donut",
      title: "Rides by service",
      slices: [...byService.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
    },
    {
      kind: "bar",
      title: "How far ahead rides were booked",
      points: leadTimeBuckets(rides).map((x) => ({
        label: x.name,
        value: x.value,
      })),
    },
    {
      kind: "bar",
      title: "Pickups by day of the week",
      points: peaks.dayData.map((x) => ({ label: x.name, value: x.value })),
    },
    {
      kind: "bar",
      title: "Pickups by time of day",
      points: peaks.hourData.map((x) => ({
        label: x.name.split(" ")[0],
        value: x.value,
      })),
    },
    {
      kind: "table",
      title: "Rides",
      subtitle: basisLabel,
      columns: [
        { label: "Pickup", flex: 1.4 },
        { label: "Booked", flex: 1 },
        { label: "Status", flex: 1.1 },
        { label: "Service", flex: 1.5 },
        { label: "Driver", flex: 1.4 },
        { label: "Price", align: "right" },
      ],
      rows: sorted.map((r) => [
        tz.formatDateTime(r.pickupAt, ctx.timezone),
        tz.formatDate(r.createdAt, ctx.timezone),
        tz.statusLabel(r.status),
        r.serviceName ?? "—",
        r.driver ? r.driver.name || r.driver.email : "Unassigned",
        fmt(r.totalCents),
      ]),
    },
    {
      kind: "notes",
      lines: [
        "Drafts and trashed bookings are not counted.",
        "Completion and no-show rates only look at rides before today, so upcoming rides don't lower them.",
      ],
    },
  ];

  return {
    model: header(ctx, "Bookings & operations", period, sections),
    csvs: [
      {
        name: "rides.csv",
        header: [
          "Pickup",
          "Booked",
          "Booking ID",
          "Status",
          "Service",
          "Vehicle",
          "Driver",
          "Price ($)",
        ],
        rows: sorted.map((r) => [
          tz.formatIsoDate(r.pickupAt, ctx.timezone),
          tz.formatIsoDate(r.createdAt, ctx.timezone),
          r.id,
          tz.statusLabel(r.status),
          r.serviceName ?? "",
          r.vehicleName ?? "",
          r.driver ? r.driver.name || r.driver.email : "",
          dollars(r.totalCents),
        ]),
      },
    ],
    baseName: `bookings-${period.fileLabel}`,
  };
}

// ── Corporate invoices ───────────────────────────────────────────────────────

export async function loadCorporateInvoices(period: Period) {
  const invoices = await db.corporateInvoice.findMany({
    where:
      period.fromUtc && period.toUtc
        ? { createdAt: { gte: period.fromUtc, lt: period.toUtc } }
        : {},
    orderBy: { createdAt: "asc" },
    select: {
      invoiceNumber: true,
      createdAt: true,
      periodStart: true,
      periodEnd: true,
      dueDate: true,
      paidAt: true,
      totalCents: true,
      amountPaidCents: true,
      status: true,
      corporateAccount: { select: { name: true } },
    },
  });
  return invoices.map((i) => ({
    ...i,
    account: i.corporateAccount?.name ?? "—",
    balance:
      i.status === "VOID" ? 0 : Math.max(0, i.totalCents - i.amountPaidCents),
  }));
}

function corporateCsv(
  rows: Awaited<ReturnType<typeof loadCorporateInvoices>>,
): CsvFile {
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
  return {
    name: "corporate-invoices.csv",
    header: [
      "Invoice",
      "Account",
      "Issued",
      "Service from",
      "Service to",
      "Due",
      "Paid on",
      "Status",
      "Total ($)",
      "Paid ($)",
      "Balance ($)",
    ],
    rows: rows.map((i) => [
      i.invoiceNumber,
      i.account,
      d(i.createdAt),
      d(i.periodStart),
      d(i.periodEnd),
      d(i.dueDate),
      d(i.paidAt),
      i.status,
      dollars(i.totalCents),
      dollars(i.amountPaidCents),
      dollars(i.balance),
    ]),
  };
}

export async function buildCorporateReport(
  period: Period,
  ctx: ReportContext,
): Promise<BuiltReport> {
  const rows = await loadCorporateInvoices(period);
  const live = rows.filter((i) => i.status !== "VOID");
  const invoiced = live.reduce((s, i) => s + i.totalCents, 0);
  const paid = live.reduce((s, i) => s + i.amountPaidCents, 0);
  const outstanding = live.reduce((s, i) => s + i.balance, 0);
  const byAccount = new Map<string, number>();
  for (const i of live)
    byAccount.set(i.account, (byAccount.get(i.account) ?? 0) + i.totalCents);

  const sections: ReportSection[] = [
    {
      kind: "kpis",
      items: [
        { label: "Invoices issued", value: String(live.length) },
        { label: "Invoiced", value: short(invoiced) },
        { label: "Paid", value: short(paid) },
        { label: "Outstanding", value: short(outstanding) },
      ],
    },
    {
      kind: "donut",
      title: "Invoiced by account",
      slices: [...byAccount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
      money: true,
    },
    {
      kind: "table",
      title: "Invoices issued in this period",
      columns: [
        { label: "Invoice", flex: 1.1 },
        { label: "Account", flex: 1.8 },
        { label: "Issued", flex: 1 },
        { label: "Due", flex: 1 },
        { label: "Status", flex: 1 },
        { label: "Total", align: "right" },
        { label: "Balance", align: "right" },
      ],
      rows: rows.map((i) => [
        i.invoiceNumber,
        i.account,
        tz.formatDate(i.createdAt, ctx.timezone),
        i.dueDate ? tz.formatDate(i.dueDate, ctx.timezone) : "—",
        tz.statusLabel(i.status),
        fmt(i.totalCents),
        fmt(i.balance),
      ]),
      totals: ["Total", "", "", "", "", fmt(invoiced), fmt(outstanding)],
      emptyText: "No corporate invoices issued in this period.",
    },
  ];
  return {
    model: header(ctx, "Corporate invoices", period, sections),
    csvs: [corporateCsv(rows)],
    baseName: `corporate-invoices-${period.fileLabel}`,
  };
}

// ── Tax year package ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function buildTaxPackage(
  period: Period,
  ctx: ReportContext,
): Promise<BuiltReport> {
  const from = period.fromUtc!;
  const to = period.toUtc!;
  const [months, ledger, refunds, drivers, invoices] = await Promise.all([
    chartAggMonthly(from, to, ctx.timezone),
    loadLedger(from, to),
    loadRefunds(from, to),
    loadDriverPay(period),
    loadCorporateInvoices(period),
  ]);
  const kpi = kpisFromChartData(months);
  const live = invoices.filter((i) => i.status !== "VOID");
  const driverPay = drivers.reduce((s, g) => s + g.payCents, 0);
  const driverTips = drivers.reduce((s, g) => s + g.tipCents, 0);

  const monthRows = months.map((m, i) => ({
    label: MONTH_NAMES[i] ?? m.label,
    fares: m.baseCents,
    tips: m.tipCents,
    received: m.capturedCents,
    refunds: m.refundedCents,
    net: m.netCents,
    count: m.count,
  }));

  const sections: ReportSection[] = [
    {
      kind: "kpis",
      items: [
        {
          label: "Money received",
          value: short(kpi.capturedSumCents),
          sub: "Fares + tips, gross",
        },
        { label: "Fares", value: short(kpi.baseSumCents) },
        { label: "Tips", value: short(kpi.tipSumCents) },
        { label: "Refunds", value: short(kpi.refundedSumCents) },
        { label: "Net", value: short(kpi.netSumCents) },
        {
          label: "Driver pay",
          value: short(driverPay),
          sub: `Plus ${short(driverTips)} in tips`,
        },
        {
          label: "Corporate invoiced",
          value: short(live.reduce((s, i) => s + i.totalCents, 0)),
        },
        {
          label: "Corporate outstanding",
          value: short(live.reduce((s, i) => s + i.balance, 0)),
        },
      ],
    },
    {
      kind: "bar",
      title: "Money received by month",
      points: monthRows.map((m) => ({ label: m.label, value: m.received })),
      money: true,
    },
    {
      kind: "table",
      title: "Monthly summary",
      columns: [
        { label: "Month" },
        { label: "Fares", align: "right" },
        { label: "Tips", align: "right" },
        { label: "Received", align: "right" },
        { label: "Refunds", align: "right" },
        { label: "Net", align: "right" },
        { label: "Payments", align: "right" },
      ],
      rows: monthRows.map((m) => [
        m.label,
        fmt(m.fares),
        fmt(m.tips),
        fmt(m.received),
        fmt(m.refunds),
        fmt(m.net),
        String(m.count),
      ]),
      totals: [
        "Year",
        fmt(kpi.baseSumCents),
        fmt(kpi.tipSumCents),
        fmt(kpi.capturedSumCents),
        fmt(kpi.refundedSumCents),
        fmt(kpi.netSumCents),
        String(kpi.payCount),
      ],
    },
    {
      kind: "table",
      title: "Driver pay by driver",
      subtitle:
        "Completed rides in the year, by pickup date. See driver-pay-by-ride.csv for every ride.",
      columns: [
        { label: "Driver", flex: 1.5 },
        { label: "Legal name", flex: 1.5 },
        { label: "W-9", flex: 0.8 },
        { label: "Rides", align: "right", flex: 0.6 },
        { label: "Pay", align: "right" },
        { label: "Tips", align: "right" },
        { label: "Total", align: "right" },
      ],
      rows: drivers.map((g) => [
        g.name,
        g.legalName ?? "—",
        g.w9ReceivedAt ? g.w9ReceivedAt.toISOString().slice(0, 10) : "—",
        String(g.rides.length),
        fmt(g.payCents),
        fmt(g.tipCents),
        fmt(g.payCents + g.tipCents),
      ]),
      totals: [
        "Total",
        "",
        "",
        String(drivers.reduce((s, g) => s + g.rides.length, 0)),
        fmt(driverPay),
        fmt(driverTips),
        fmt(driverPay + driverTips),
      ],
      emptyText: "No completed rides with a driver this year.",
    },
    {
      kind: "notes",
      title: "Notes for your accountant",
      lines: [
        ...MONEY_NOTES,
        ...DRIVER_NOTES,
        "Corporate invoices are listed by the date they were issued; the outstanding figure is what was still unpaid when this package was generated.",
        "This package summarizes the records in the app. It is not tax advice; review it with your accountant.",
      ],
    },
  ];

  const csvs: CsvFile[] = [
    {
      name: "monthly-summary.csv",
      header: [
        "Month",
        "Fares ($)",
        "Tips ($)",
        "Money received ($)",
        "Refunds ($)",
        "Net ($)",
        "Payments",
      ],
      rows: monthRows.map((m) => [
        m.label,
        dollars(m.fares),
        dollars(m.tips),
        dollars(m.received),
        dollars(m.refunds),
        dollars(m.net),
        m.count,
      ]),
    },
    paymentsCsv(ledger, ctx),
    refundsCsv(refunds, ctx),
    driverByDriverCsv(drivers),
    driverByRideCsv(drivers, ctx),
    corporateCsv(invoices),
  ];

  return {
    model: header(ctx, "Tax year package", period, sections),
    csvs,
    baseName: `tax-package-${period.fileLabel}`,
  };
}
