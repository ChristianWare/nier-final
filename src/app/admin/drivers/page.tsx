import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import * as tz from "@/lib/timezone";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import { describeRange, getRangeWindow } from "@/lib/booking/bookingsRange";
import {
  driverStats,
  isNotClosedOut,
  loadReportRides,
} from "@/lib/reports/rideStats";
import { loadPayPlan } from "@/lib/drivers/driverPay";
import BookingsTimeControls from "../bookings/BookingsTimeControls";
import DriverPerformanceSection from "../reports/DriverPerformanceSection";
import FillMissingPay, { type MissingPayRow } from "./FillMissingPay";
import styles from "./AdminDriversPage.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES = [
  "all",
  "month",
  "week",
  "last12",
  "ytd",
  "year",
  "today",
  "next24",
  "next7",
  "upcoming",
  "range",
];
const PICKUP_ONLY = ["next24", "next7", "upcoming"];
const CALLED_OFF: BookingStatus[] = [
  "CANCELLED",
  "DECLINED",
  "REFUNDED",
  "NO_SHOW",
  "DRAFT",
];
const MONTH_OPTIONS = [
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
].map((label, i) => ({ v: String(i + 1).padStart(2, "0"), label }));

type SP = Record<string, string | undefined>;

/** Soonest document expiry: what to show in the list. */
function documentsStatus(
  profile: {
    licenseExpiresAt: Date | null;
    permitExpiresAt: Date | null;
    insuranceExpiresAt: Date | null;
  } | null,
  now: Date,
): { text: string; tone: "bad" | "warn" | "ok" | "none" } {
  const docs = [
    ["License", profile?.licenseExpiresAt],
    ["Permit", profile?.permitExpiresAt],
    ["Insurance", profile?.insuranceExpiresAt],
  ].filter((d): d is [string, Date] => d[1] instanceof Date);
  if (docs.length === 0) return { text: "No dates on file", tone: "none" };
  docs.sort((a, b) => a[1].getTime() - b[1].getTime());
  const [name, at] = docs[0];
  const days = Math.ceil((at.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { text: `${name} expired`, tone: "bad" };
  if (days <= 30)
    return { text: `${name} expires in ${days} days`, tone: "warn" };
  return { text: "Up to date", tone: "ok" };
}

export default async function AdminDriversPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const range = RANGES.includes(sp.range ?? "") ? sp.range! : "month";
  const monthParam =
    sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : undefined;
  const basis: "pickup" | "created" =
    sp.basis === "created" && !PICKUP_ONLY.includes(range)
      ? "created"
      : "pickup";
  const basisLabel = basis === "created" ? "bookings made" : "rides happening";

  const now = new Date();
  const { timezone } = await getCompanySettings();
  const today = tz.formatIsoDate(now, timezone);
  const todayStart = tz.startOfDay(now, timezone);
  const currentMonthKey = tz.monthKey(now, timezone);
  const selectedMonthKey = monthParam ?? currentMonthKey;
  const fromYmd = sp.from ?? today;
  const toYmd = sp.to ?? today;

  const win = getRangeWindow({
    now,
    timezone,
    range,
    fromYmd,
    toYmd,
    monthKey: selectedMonthKey,
  });
  const rangeLabel = describeRange({ range, win, now, timezone });

  const thisYear = tz.toLocalParts(now, timezone).y;
  const years = Array.from({ length: 6 }, (_, i) => String(thisYear - 4 + i));

  const [rides, roster] = await Promise.all([
    loadReportRides({
      dateField: basis === "created" ? "createdAt" : "pickupAt",
      window: win ?? null,
    }),
    db.user.findMany({
      where: { roles: { has: "DRIVER" } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        driverProfile: {
          select: {
            payPercent: true,
            paidPerRide: true,
            active: true,
            licenseExpiresAt: true,
            permitExpiresAt: true,
            insuranceExpiresAt: true,
          },
        },
        driverAssignments: {
          where: {
            booking: {
              deletedAt: null,
              pickupAt: { gte: now },
              status: { notIn: CALLED_OFF },
            },
          },
          orderBy: { booking: { pickupAt: "asc" } },
          take: 1,
          select: { booking: { select: { id: true, pickupAt: true } } },
        },
      },
    }),
  ]);

  const drivers = driverStats(rides, now, todayStart);

  // Past rides nobody closed out (any driver, or none).
  const notClosedOut = rides
    .filter((r) => isNotClosedOut(r, todayStart))
    .sort((a, b) => a.pickupAt.getTime() - b.pickupAt.getTime());

  // Completed rides of per-ride drivers with no pay recorded.
  const missingIds = rides
    .filter(
      (r) =>
        r.driver &&
        r.driverPaidPerRide &&
        (r.status === "COMPLETED" || r.status === "PARTIALLY_REFUNDED") &&
        (r.driverPayCents == null || r.driverPayCents === 0),
    )
    .map((r) => r.id);
  const plan = missingIds.length ? await loadPayPlan(missingIds) : [];
  const rideById = new Map(rides.map((r) => [r.id, r]));
  const missingRows: MissingPayRow[] = plan
    .filter((p) => missingIds.includes(p.bookingId))
    .filter((p) => p.pay === "fill" || p.pay === "no_rate")
    .map((p) => {
      const r = rideById.get(p.bookingId)!;
      return {
        bookingId: p.bookingId,
        pickupLabel: tz.formatDateTime(r.pickupAt, timezone),
        driverName: r.driver?.name || r.driver?.email || "Driver",
        priceCents: p.totalCents,
        payPercent: p.payPercent,
        newPayCents: p.newPayCents,
      };
    });

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Drivers</h1>
        <p className={styles.subcopy}>
          Rides, completion and pay for every driver. Pay defaults to each
          driver&apos;s rate on the ride&apos;s full price, and tips go to the
          driver in full.
        </p>
        <BookingsTimeControls
          activeRange={range}
          basis={basis}
          basisTitle='Showing'
          years={years}
          monthOptions={MONTH_OPTIONS}
          selectedYear={selectedMonthKey.slice(0, 4)}
          selectedMonth={selectedMonthKey.slice(5, 7)}
          currentMonthKey={currentMonthKey}
          from={fromYmd}
          to={toYmd}
          rangeLabel={rangeLabel}
        />
      </header>

      {notClosedOut.length > 0 || missingRows.length > 0 ? (
        <div className={styles.attention} id='missing-pay'>
          <div className={styles.attentionItems}>
            <strong>Needs attention</strong>
            {notClosedOut.length > 0 ? (
              <span>
                {notClosedOut.length} past{" "}
                {notClosedOut.length === 1 ? "ride" : "rides"} not closed out
              </span>
            ) : null}
            {missingRows.length > 0 ? (
              <span>
                {missingRows.length} completed{" "}
                {missingRows.length === 1 ? "ride" : "rides"} with no pay
                recorded
              </span>
            ) : null}
          </div>
          <div className={styles.attentionActions}>
            {notClosedOut.length > 0 ? (
              <a className='tab' href='#not-closed-out'>
                Review rides
              </a>
            ) : null}
            {missingRows.length > 0 ? (
              <FillMissingPay rows={missingRows} />
            ) : null}
          </div>
        </div>
      ) : null}

      <DriverPerformanceSection
        drivers={drivers}
        rangeLabel={rangeLabel}
        basisLabel={basisLabel}
        currency='USD'
        linkToDrivers
      />

      {notClosedOut.length > 0 ? (
        <div className={styles.block} id='not-closed-out'>
          <div className={styles.blockHead}>
            <h2 className='cardTitle h5'>Rides not closed out</h2>
            <span className='miniNote'>
              Rides before today that were never marked completed, cancelled or
              no-show. Open each one to update its status.
            </span>
          </div>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Pickup</th>
                  <th className={styles.th}>Driver</th>
                  <th className={styles.th}>Service</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Booking</th>
                </tr>
              </thead>
              <tbody>
                {notClosedOut.map((r) => (
                  <tr key={r.id} className={styles.tr}>
                    <td className={styles.td}>
                      {tz.formatDateTime(r.pickupAt, timezone)}
                    </td>
                    <td className={styles.td}>
                      {r.driver ? (
                        <Link href={`/admin/drivers/${r.driver.id}`}>
                          {r.driver.name || r.driver.email}
                        </Link>
                      ) : (
                        "Unassigned"
                      )}
                    </td>
                    <td className={styles.td}>{r.serviceName ?? "—"}</td>
                    <td className={styles.td}>{tz.statusLabel(r.status)}</td>
                    <td className={styles.td}>
                      <Link href={`/admin/bookings/${r.id}`}>
                        {r.id.slice(0, 7).toUpperCase()}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2 className='cardTitle h5'>All drivers</h2>
          <span className='miniNote'>
            Everyone with the Driver role. To add a driver, have them sign up,
            then give them the Driver role on the{" "}
            <Link href='/admin/users'>Users</Link> page.
          </span>
        </div>
        {roster.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No drivers yet</div>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Driver</th>
                  <th className={styles.th}>Phone</th>
                  <th className={`${styles.th} ${styles.num}`}>Pay rate</th>
                  <th className={styles.th}>Next ride</th>
                  <th className={styles.th}>Documents</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((d) => {
                  const p = d.driverProfile;
                  const next = d.driverAssignments[0]?.booking;
                  const docs = documentsStatus(p, now);
                  return (
                    <tr key={d.id} className={styles.tr}>
                      <td className={styles.td}>
                        <Link href={`/admin/drivers/${d.id}`}>
                          <strong>{d.name?.trim() || d.email}</strong>
                        </Link>
                        <div className='miniNote'>{d.email}</div>
                      </td>
                      <td className={styles.td}>{d.phone ?? "—"}</td>
                      <td className={`${styles.td} ${styles.num}`}>
                        {p && !p.paidPerRide
                          ? "Not per ride"
                          : p?.payPercent == null
                            ? "Not set"
                            : `${p.payPercent}%`}
                      </td>
                      <td className={styles.td}>
                        {next ? (
                          <Link href={`/admin/bookings/${next.id}`}>
                            {tz.formatDateTime(next.pickupAt, timezone)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={styles.td}>
                        <span className={styles[`doc_${docs.tone}`]}>
                          {docs.text}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {p?.active === false ? "Inactive" : "Active"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
