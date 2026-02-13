/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./CorporateDashboard.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import CorpAdminPageIntro from "@/components/corporate/CorpAdminPageIntro/CorpAdminPageIntro";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Button from "@/components/shared/Button/Button";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatPickupDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatPickupTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return styles.badgeGreen;
    case "PENDING_REVIEW":
    case "PENDING_PAYMENT":
      return styles.badgeAmber;
    case "IN_PROGRESS":
      return styles.badgeBlue;
    case "COMPLETED":
      return styles.badgeNeutral;
    case "CANCELLED":
    case "REFUNDED":
    case "NO_SHOW":
      return styles.badgeRed;
    default:
      return styles.badgeNeutral;
  }
}

function statusLabel(s: string) {
  return s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function limitLevel(pct: number): string {
  if (pct >= 100) return "danger";
  if (pct >= 80) return "warning";
  return "ok";
}

export default async function CorporateDashboardPage() {
  noStore();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { timezone: companyTz } = await getCompanySettings();

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: {
      role: true,
      corporateAccount: {
        select: {
          id: true,
          name: true,
          status: true,
          billingCycle: true,
          paymentMethod: true,
          paymentTerms: true,
          discountPercent: true,
          monthlyLimitCents: true,
        },
      },
    },
  });

  const account = contact?.corporateAccount;
  if (!account) redirect("/");

  const now = new Date();
  const monthStart = tz.startOfMonth(now, companyTz);
  const nextMonthStart = tz.addMonths(monthStart, 1, companyTz);

  const cancelledStatuses = ["CANCELLED", "REFUNDED", "NO_SHOW"] as any;

  const [
    ridesThisMonth,
    totalRidesAllTime,
    activeEmployees,
    totalEmployees,
    upcomingRidesCount,
    spendThisMonthAgg,
    recentBookings,
    upcomingRides,
  ] = await Promise.all([
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: { status: { in: cancelledStatuses } },
      },
    }),

    db.booking.count({
      where: {
        corporateAccountId: account.id,
        NOT: { status: { in: cancelledStatuses } },
      },
    }),

    db.corporatePassenger.count({
      where: { corporateAccountId: account.id, active: true },
    }),

    db.corporatePassenger.count({
      where: { corporateAccountId: account.id },
    }),

    db.booking.count({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: now },
        NOT: { status: { in: cancelledStatuses } },
      },
    }),

    (db.booking as any).aggregate({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: { status: { in: cancelledStatuses } },
      },
      _sum: { totalCents: true },
    }),

    db.booking.findMany({
      where: {
        corporateAccountId: account.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        createdAt: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        totalCents: true,
        currency: true,
        serviceType: { select: { name: true } },
        corporatePassenger: { select: { name: true } },
        assignment: {
          select: { driver: { select: { name: true } } },
        },
      },
    }),

    db.booking.findMany({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: now },
        NOT: { status: { in: cancelledStatuses } },
      },
      orderBy: { pickupAt: "asc" },
      take: 5,
      select: {
        id: true,
        status: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        totalCents: true,
        currency: true,
        serviceType: { select: { name: true } },
        corporatePassenger: { select: { name: true } },
        assignment: {
          select: { driver: { select: { name: true } } },
        },
      },
    }),
  ]);

  const spendThisMonthCents = Number(spendThisMonthAgg?._sum?.totalCents ?? 0);

  const monthlyLimitCents = account.monthlyLimitCents
    ? Number(account.monthlyLimitCents)
    : null;
  const limitPercent =
    monthlyLimitCents && monthlyLimitCents > 0
      ? Math.round((spendThisMonthCents / monthlyLimitCents) * 100)
      : null;

  return (
    <section className={styles.container}>
      <CorpAdminPageIntro companyName={account.name} />

      {account.status === "SUSPENDED" && (
        <div className={styles.suspendedBanner}>
          <span className={styles.suspendedIcon}>⚠️</span>
          <div>
            <strong>Account Suspended</strong>
            <p>
              Your corporate account is currently suspended. You cannot make new
              bookings. Please contact Nier Transportation for assistance.
            </p>
          </div>
        </div>
      )}

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Rides This Month</span>
          <span className={styles.kpiValue}>{ridesThisMonth}</span>
          <span className={styles.kpiSub}>
            {totalRidesAllTime} total all time
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Spend This Month</span>
          <span className={styles.kpiValue}>
            {tz.formatMoneyShort(spendThisMonthCents)}
          </span>
          {limitPercent !== null && (
            <div className={styles.limitBar}>
              <div className={styles.limitTrack}>
                <div
                  className={`${styles.limitFill} ${styles[`limitFill_${limitLevel(limitPercent)}`]}`}
                  style={
                    {
                      "--limit-pct": `${Math.min(limitPercent, 100)}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className={styles.limitText}>
                {limitPercent}% of {tz.formatMoneyShort(monthlyLimitCents!)}{" "}
                limit
              </span>
            </div>
          )}
          {limitPercent === null && (
            <span className={styles.kpiSub}>No monthly limit set</span>
          )}
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Employees</span>
          <span className={styles.kpiValue}>{activeEmployees}</span>
          <span className={styles.kpiSub}>
            {totalEmployees} total on roster
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Upcoming Rides</span>
          <span className={styles.kpiValue}>{upcomingRidesCount}</span>
          <span className={styles.kpiSub}>Scheduled ahead</span>
        </div>
      </div>

      <div className={styles.tableCard}>
        <h2 className={`${styles.sectionTitle} cardTitle h4`}>Quick Actions</h2>
        <div className={styles.quickActions}>
          <Button
            href='/corporate/bookings'
            text='Book a Ride'
            btnType='blackReg'
          />
          <Button
            href='/corporate/employees'
            text='Manage Employees'
            btnType='blackReg'
          />
          <Button
            href='/corporate/billing'
            text='View Billing'
            btnType='blackReg'
          />
          <Button
            href='/corporate/bookings'
            text='View Reports'
            btnType='blackReg'
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <h2 className={`${styles.sectionTitle} cardTitle h4`}>
          Upcoming Rides
        </h2>
        <Link href='/corporate/bookings' className='backBtn'>
          View All <Arrow className='rotateArrow' />
        </Link>

        {upcomingRides.length === 0 ? (
          <div className={styles.empty}>
            <p className='emptyTitle'>No upcoming rides scheduled.</p>
            <Button href='/book' text='Book a Ride' btnType='red' arrow />
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Date & Time</th>
                  <th className={styles.th}>Passenger</th>
                  <th className={styles.th}>Route</th>
                  <th className={styles.th}>Service</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.alignRight}`}>Fare</th>
                </tr>
              </thead>
              <tbody>
                {upcomingRides.map((ride: any) => (
                  <tr key={ride.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.cellStrong}>
                        {formatPickupDate(new Date(ride.pickupAt), companyTz)}
                      </div>
                      <div className={styles.cellSub}>
                        {formatPickupTime(new Date(ride.pickupAt), companyTz)}
                      </div>
                    </td>
                    <td className={styles.td}>
                      {ride.corporatePassenger?.name ?? "—"}
                    </td>
                    <td className={styles.td}>
                      <span>{shortAddress(ride.pickupAddress)}</span>
                      <span className={styles.routeArrow}> → </span>
                      <span>{shortAddress(ride.dropoffAddress)}</span>
                    </td>
                    <td className={styles.td}>
                      {ride.serviceType?.name ?? "—"}
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusBadge} ${statusBadgeClass(ride.status)}`}
                      >
                        {statusLabel(ride.status)}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.alignRight}`}>
                      {ride.totalCents
                        ? tz.formatMoneyShort(ride.totalCents)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} cardTitle h4`}>
            Recent Activity
          </h2>
        </div>

        {recentBookings.length === 0 ? (
          <div className={styles.empty}>
            <p className='emptyTitle'>No booking activity yet.</p>
          </div>
        ) : (
          <div className={styles.activityList}>
            {recentBookings.map((booking: any) => {
              const pickupDate = new Date(booking.pickupAt);
              const passenger = booking.corporatePassenger?.name;
              const driver = booking.assignment?.driver?.name;

              return (
                <div key={booking.id} className={styles.activityItem}>
                  <div className={styles.activityDot}>
                    <span
                      className={`${styles.dot} ${
                        booking.status === "CONFIRMED"
                          ? styles.dotGreen
                          : booking.status === "COMPLETED"
                            ? styles.dotNeutral
                            : booking.status === "CANCELLED" ||
                                booking.status === "REFUNDED"
                              ? styles.dotRed
                              : styles.dotAmber
                      }`}
                    />
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTop}>
                      <span className={styles.activityTitle}>
                        {shortAddress(booking.pickupAddress)} →{" "}
                        {shortAddress(booking.dropoffAddress)}
                      </span>
                      <span
                        className={`${styles.statusBadge} ${statusBadgeClass(booking.status)}`}
                      >
                        {statusLabel(booking.status)}
                      </span>
                    </div>
                    <div className={styles.activityMeta}>
                      <span>
                        {formatPickupDate(pickupDate, companyTz)} at{" "}
                        {formatPickupTime(pickupDate, companyTz)}
                      </span>
                      {passenger && <span> · {passenger}</span>}
                      {driver && <span> · Driver: {driver}</span>}
                      {booking.totalCents > 0 && (
                        <span>
                          {" "}
                          · {tz.formatMoneyShort(booking.totalCents)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.accountInfo}>
        <div className={styles.accountInfoGrid}>
          <div>
            <span className={styles.accountInfoLabel}>Payment Method</span>
            <span className={styles.accountInfoValue}>
              {account.paymentMethod === "INVOICE"
                ? "Electronic Invoice"
                : account.paymentMethod === "CHECK"
                  ? "Physical Check"
                  : "Card on File"}
            </span>
          </div>
          <div>
            <span className={styles.accountInfoLabel}>Billing Cycle</span>
            <span className={styles.accountInfoValue}>
              {account.billingCycle === "MONTHLY"
                ? "Monthly"
                : account.billingCycle === "WEEKLY"
                  ? "Weekly"
                  : "Per Ride"}
            </span>
          </div>
          <div>
            <span className={styles.accountInfoLabel}>Payment Terms</span>
            <span className={styles.accountInfoValue}>
              {account.paymentTerms === "NET_30"
                ? "Due within 30 days"
                : account.paymentTerms === "NET_15"
                  ? "Due within 15 days"
                  : account.paymentTerms === "NET_45"
                    ? "Due within 45 days"
                    : "Due upon receipt"}
            </span>
          </div>
          {account.discountPercent && Number(account.discountPercent) > 0 && (
            <div>
              <span className={styles.accountInfoLabel}>Discount</span>
              <span className={`${styles.accountInfoValue} ${styles.green}`}>
                {Number(account.discountPercent)}% off all rides
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
