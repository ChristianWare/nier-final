import { formatClock, formatMdy } from "@/lib/booking/statusBadge";
import Button from "@/components/shared/Button/Button";
import { paymentTag, statusBadge } from "@/lib/booking/rideBadges";
import RideBadges from "@/components/admin/RideBadges/RideBadges";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import * as tz from "@/lib/timezone";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { describeRange, getRangeWindow } from "@/lib/booking/bookingsRange";
import {
  driverStats,
  isNotClosedOut,
  loadReportRides,
} from "@/lib/reports/rideStats";
import BookingsTimeControls from "../../bookings/BookingsTimeControls";
import KpiCard from "../../reports/KpiCard";
import reportStyles from "../../reports/AdminReportsPage.module.css";
import DriverProfileForm from "./DriverProfileForm";
import styles from "../AdminDriversPage.module.css";

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

const ymd = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";
const money = (cents: number) => tz.formatMoney(cents, "USD");

export default async function AdminDriverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const driver = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      roles: true,
      driverProfile: true,
    },
  });
  if (!driver || !driver.roles.includes("DRIVER")) notFound();
  const profile = driver.driverProfile;

  const range = RANGES.includes(sp.range ?? "") ? sp.range! : "month";
  const monthParam =
    sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : undefined;
  const basis: "pickup" | "created" =
    sp.basis === "created" && !PICKUP_ONLY.includes(range)
      ? "created"
      : "pickup";

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

  const [rides, upcoming] = await Promise.all([
    loadReportRides({
      dateField: basis === "created" ? "createdAt" : "pickupAt",
      window: win ?? null,
      driverId: id,
    }),
    db.booking.findMany({
      where: {
        assignment: { driverId: id },
        pickupAt: { gte: now },
        status: { notIn: CALLED_OFF },
      },
      orderBy: { pickupAt: "asc" },
      take: 10,
      select: {
        id: true,
        pickupAt: true,
        status: true,
        pickupAddress: true,
        dropoffAddress: true,
        serviceType: { select: { name: true } },
        payment: { select: { status: true } },
        tripGroup: { select: { paymentStatus: true, amountPaidCents: true } },
      },
    }),
  ]);

  const stats = driverStats(rides, now, todayStart)[0];
  const sorted = [...rides].sort(
    (a, b) => b.pickupAt.getTime() - a.pickupAt.getTime(),
  );
  const payable = rides.filter(
    (r) => r.status === "COMPLETED" || r.status === "PARTIALLY_REFUNDED",
  );
  const totals = payable.reduce(
    (t, r) => ({
      price: t.price + r.totalCents,
      pay: t.pay + (r.driverPayCents ?? 0),
      tip: t.tip + (r.driverTipCents ?? 0),
    }),
    { price: 0, pay: 0, tip: 0 },
  );

  // Statement downloads cover the same rides as this page.
  const period: Record<string, string> = win?.lt
    ? {
        period: "range",
        from: tz.formatIsoDate(win.gte, timezone),
        to: tz.formatIsoDate(new Date(win.lt.getTime() - 1), timezone),
      }
    : { period: "all" };
  const statementHref = (format: "pdf" | "csv") =>
    `/admin/reports/export?${new URLSearchParams({
      type: "drivers",
      driver: id,
      ...period,
      basis,
      format,
    }).toString()}`;

  const name = driver.name?.trim() || driver.email;

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className='miniNote'>
          <Link href='/admin/drivers'>← All drivers</Link>
        </div>
        <h1 className={`${styles.heading} h2`}>{name}</h1>
        <p className={styles.subcopy}>
          {driver.email}
          {driver.phone ? ` · ${driver.phone}` : ""} ·{" "}
          {profile && !profile.paidPerRide
            ? "Not paid per ride"
            : profile?.payPercent == null
              ? "No pay rate set"
              : `Pay rate ${profile.payPercent}% of the ride's full price`}
          {profile?.active === false ? " · Inactive" : ""}
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

      <div className={reportStyles.kpiGrid}>
        <KpiCard
          label='Trips'
          value={String(stats?.trips ?? 0)}
          sub={rangeLabel}
        />
        <KpiCard
          label='Completed'
          value={String(stats?.completed ?? 0)}
          sub={`${stats?.upcoming ?? 0} upcoming`}
          tone='good'
        />
        <KpiCard
          label='Not closed out'
          value={String(stats?.notClosedOut ?? 0)}
          sub='Past rides still open'
          tone={(stats?.notClosedOut ?? 0) > 0 ? "warn" : "neutral"}
        />
        <KpiCard
          label='Completion rate'
          value={
            stats?.completionRate == null ? "—" : `${stats.completionRate}%`
          }
          sub='Of rides that should have happened'
        />
        <KpiCard
          label='Pay'
          value={tz.formatMoneyShort(stats?.basePayCents ?? 0, "USD")}
          sub={
            (stats?.payMissing ?? 0) > 0
              ? `Not recorded on ${stats!.payMissing} completed rides`
              : "Recorded on completed rides"
          }
        />
        <KpiCard
          label='Tips'
          value={tz.formatMoneyShort(stats?.tipCents ?? 0, "USD")}
          sub='Go to the driver in full'
          tone='good'
        />
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2 className='cardTitle h5'>Rides & pay · {rangeLabel}</h2>
          <div className={styles.downloads}>
            <span className='miniNote'>Pay statement:</span>
            <a className='tab' href={statementHref("pdf")}>
              Download PDF
            </a>
            <a className='tab' href={statementHref("csv")}>
              Download CSV
            </a>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No rides in this period</div>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Pickup</th>
                  <th className={styles.th}>Booking</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.num}`}>Price</th>
                  <th className={`${styles.th} ${styles.num}`}>Rate</th>
                  <th className={`${styles.th} ${styles.num}`}>Pay</th>
                  <th className={`${styles.th} ${styles.num}`}>Tip</th>
                  <th className={`${styles.th} ${styles.num}`}>Total</th>
                  <th
                    className={`${styles.th} ${styles.num}`}
                    aria-label='Details'
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const open = isNotClosedOut(r, todayStart);
                  const pay = r.driverPayCents ?? 0;
                  const tip = r.driverTipCents ?? 0;
                  return (
                    <tr key={r.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.dateCell}>
                          {formatMdy(r.pickupAt, timezone)}
                        </div>
                        <div className='miniNote'>
                          {formatClock(r.pickupAt, timezone)}
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.code}>
                          #{r.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <RideBadges
                          status={statusBadge(r.status)}
                          payment={paymentTag({
                            status: r.status,
                            paymentStatus: r.ridePaymentStatus ?? null,
                            trip: r.trip ?? null,
                          })}
                        />
                        {open ? (
                          <div className={`miniNote ${styles.doc_warn}`}>
                            Not closed out
                          </div>
                        ) : null}
                      </td>
                      <td className={`${styles.td} ${styles.num}`}>
                        {money(r.totalCents)}
                      </td>
                      <td className={`${styles.td} ${styles.num}`}>
                        {pay > 0 && r.totalCents > 0
                          ? `${Math.round((pay / r.totalCents) * 1000) / 10}%`
                          : "—"}
                      </td>
                      <td className={`${styles.td} ${styles.num}`}>
                        {r.driverPayCents == null ? "—" : money(pay)}
                      </td>
                      <td className={`${styles.td} ${styles.num}`}>
                        {tip > 0 ? money(tip) : "—"}
                      </td>
                      <td className={`${styles.td} ${styles.num}`}>
                        {pay + tip > 0 ? money(pay + tip) : "—"}
                      </td>
                      <td className={`${styles.td} ${styles.num}`}>
                        <Button
                          href={`/admin/bookings/${r.id}`}
                          text='More Details'
                          btnType='blackReg'
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={styles.tr}>
                  <td className={styles.td} colSpan={3}>
                    <strong>Completed rides ({payable.length})</strong>
                  </td>
                  <td className={`${styles.td} ${styles.num}`}>
                    <strong>{money(totals.price)}</strong>
                  </td>
                  <td className={styles.td} />
                  <td className={`${styles.td} ${styles.num}`}>
                    <strong>{money(totals.pay)}</strong>
                  </td>
                  <td className={`${styles.td} ${styles.num}`}>
                    <strong>{money(totals.tip)}</strong>
                  </td>
                  <td className={`${styles.td} ${styles.num}`}>
                    <strong>{money(totals.pay + totals.tip)}</strong>
                  </td>
                  <td className={styles.td} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className={styles.grid2}>
        <div className={styles.block}>
          <div className={styles.blockHead}>
            <h2 className='cardTitle h5'>Upcoming schedule</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className={styles.emptyCard}>
              <div className={styles.emptyTitle}>No upcoming rides</div>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <tbody>
                  {upcoming.map((b) => (
                    <tr key={b.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.upcomingCell}`}>
                        <div>
                          <div className={styles.dateCell}>
                            {formatMdy(b.pickupAt, timezone)}
                          </div>
                          <div className='miniNote'>
                            {formatClock(b.pickupAt, timezone)} ·{" "}
                            {b.serviceType?.name ?? "Ride"}
                          </div>
                        </div>
                        <RideBadges
                          status={statusBadge(b.status)}
                          payment={paymentTag({
                            status: b.status,
                            paymentStatus: b.payment?.status ?? null,
                            trip: b.tripGroup ?? null,
                          })}
                        />
                        <div className='miniNote'>
                          {b.pickupAddress} → {b.dropoffAddress}
                        </div>
                        <div>
                          <Button
                            href={`/admin/bookings/${b.id}`}
                            text='More Details'
                            btnType='blackReg'
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.block}>
          <div className={styles.blockHead}>
            <h2 className='cardTitle h5'>Driver details</h2>
            <span className='miniNote'>
              Pay rate, documents, and what your accountant needs for 1099s.
            </span>
          </div>
          <DriverProfileForm
            userId={driver.id}
            initial={{
              payPercent:
                profile?.payPercent == null ? "" : String(profile.payPercent),
              paidPerRide: profile?.paidPerRide ?? true,
              active: profile?.active ?? true,
              phone: driver.phone ?? "",
              legalName: profile?.legalName ?? "",
              mailingAddress: profile?.mailingAddress ?? "",
              w9ReceivedAt: ymd(profile?.w9ReceivedAt),
              licenseNumber: profile?.licenseNumber ?? "",
              licenseExpiresAt: ymd(profile?.licenseExpiresAt),
              permitExpiresAt: ymd(profile?.permitExpiresAt),
              insuranceExpiresAt: ymd(profile?.insuranceExpiresAt),
              backgroundCheckAt: ymd(profile?.backgroundCheckAt),
              notes: profile?.notes ?? "",
            }}
          />
        </div>
      </div>
    </section>
  );
}
