/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./CorporateDashboard.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

function startOfMonthPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function startOfNextMonthPhoenix(monthStartUtc: Date) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextLocalMs = Date.UTC(y, m + 1, 1, 0, 0, 0);
  return new Date(nextLocalMs - PHX_OFFSET_MS);
}

function formatPickupDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatPickupTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
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

  // Get corporate account for this user
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
  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = startOfNextMonthPhoenix(monthStart);

  const cancelledStatuses = ["CANCELLED", "REFUNDED", "NO_SHOW"] as any;

  // ─── Parallel data fetching ───
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
    // Rides this month
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: { status: { in: cancelledStatuses } },
      },
    }),

    // Total rides all time
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        NOT: { status: { in: cancelledStatuses } },
      },
    }),

    // Active employees
    db.corporatePassenger.count({
      where: { corporateAccountId: account.id, active: true },
    }),

    // Total employees (including inactive)
    db.corporatePassenger.count({
      where: { corporateAccountId: account.id },
    }),

    // Upcoming rides
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: now },
        NOT: { status: { in: cancelledStatuses } },
      },
    }),

    // Spend this month (sum of totalCents for completed/confirmed bookings)
    (db.booking as any).aggregate({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: { status: { in: cancelledStatuses } },
      },
      _sum: { totalCents: true },
    }),

    // Recent bookings (last 10)
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

    // Upcoming rides (next 5)
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

  const spendThisMonthCents = Number(
    spendThisMonthAgg?._sum?.totalCents ?? 0,
  );

  // Monthly limit progress
  const monthlyLimitCents = account.monthlyLimitCents
    ? Number(account.monthlyLimitCents)
    : null;
  const limitPercent =
    monthlyLimitCents && monthlyLimitCents > 0
      ? Math.round((spendThisMonthCents / monthlyLimitCents) * 100)
      : null;

  return (
    <section className={styles.container}>
      {/* ─── Account suspended banner ─── */}
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

      {/* ─── KPI Cards ─── */}
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
            {formatMoney(spendThisMonthCents)}
          </span>
          {limitPercent !== null && (
            <div className={styles.limitBar}>
              <div className={styles.limitTrack}>
                <div
                  className={`${styles.limitFill} ${styles[`limitFill_${limitLevel(limitPercent)}`]}`}
                  style={{ '--limit-pct': `${Math.min(limitPercent, 100)}%` } as React.CSSProperties}
                />
              </div>
              <span className={styles.limitText}>
                {limitPercent}% of {formatMoney(monthlyLimitCents!)} limit
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

      {/* ─── Quick Actions ─── */}
      <div className={styles.quickActions}>
        <Link href="/corporate/bookings" className={styles.quickAction}>
          <span className={styles.qaIcon}>🚗</span>
          Book a Ride
        </Link>
        <Link href="/corporate/employees" className={styles.quickAction}>
          <span className={styles.qaIcon}>👥</span>
          Manage Employees
        </Link>
        <Link href="/corporate/billing" className={styles.quickAction}>
          <span className={styles.qaIcon}>💳</span>
          View Billing
        </Link>
        <Link href="/corporate/reports" className={styles.quickAction}>
          <span className={styles.qaIcon}>📊</span>
          View Reports
        </Link>
      </div>

      {/* ─── Upcoming Rides ─── */}
      <div className={styles.tableCard}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} h4`}>Upcoming Rides</h2>
          <Link href="/corporate/bookings" className={styles.sectionLink}>
            View All →
          </Link>
        </div>

        {upcomingRides.length === 0 ? (
          <div className={styles.empty}>
            <p className="emptyTitle">No upcoming rides scheduled.</p>
            <Link href="/corporate/bookings" className="neutralBtn">
              Book a Ride
            </Link>
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
                        {formatPickupDate(new Date(ride.pickupAt))}
                      </div>
                      <div className={styles.cellSub}>
                        {formatPickupTime(new Date(ride.pickupAt))}
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
                      {ride.totalCents ? formatMoney(ride.totalCents) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Recent Activity ─── */}
      <div className={styles.tableCard}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} h4`}>Recent Activity</h2>
        </div>

        {recentBookings.length === 0 ? (
          <div className={styles.empty}>
            <p className="emptyTitle">No booking activity yet.</p>
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
                        {formatPickupDate(pickupDate)} at{" "}
                        {formatPickupTime(pickupDate)}
                      </span>
                      {passenger && <span> · {passenger}</span>}
                      {driver && <span> · Driver: {driver}</span>}
                      {booking.totalCents > 0 && (
                        <span> · {formatMoney(booking.totalCents)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Account Info Footer ─── */}
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