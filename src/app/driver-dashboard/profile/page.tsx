/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./DriverProfilePage.module.css";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { auth } from "../../../../auth";
import DefaultProfileImg from "../../../../public/images/mesaii.jpg";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatEta(at: Date, now: Date) {
  const diffMs = at.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));
  const label = mins < 90 ? `${mins}m` : hours < 36 ? `${hours}h` : `${days}d`;
  if (diffMs >= 0) return `in ${label}`;
  return `${label} ago`;
}

function toPhoenixParts(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  return { y: phx.getUTCFullYear(), m: phx.getUTCMonth(), d: phx.getUTCDate() };
}

function startOfMonthPhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function startOfYearPhoenix(dateUtc: Date) {
  const { y } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, 0, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  return new Date(nextStartLocalMs - PHX_OFFSET_MS);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    CONFIRMED: "Confirmed",
    ASSIGNED: "Assigned",
    EN_ROUTE: "En Route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-show",
  };
  return labels[status] || String(status).replaceAll("_", " ");
}

function badgeTone(status: string) {
  if (status === "CONFIRMED" || status === "ASSIGNED" || status === "COMPLETED")
    return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  return "neutral";
}

async function resolveSessionUserId(session: any) {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

export default async function DriverProfilePage() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/profile");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverIdOrNull = await resolveSessionUserId(session);
  if (!driverIdOrNull) redirect("/");
  const driverId: string = driverIdOrNull;

  const now = new Date();

  // Fetch driver user data
  const user = await db.user.findUnique({
    where: { id: driverId },
    include: {
      _count: { select: { driverAssignments: true } },
    },
  });

  if (!user) redirect("/");

  const profileImage = user.image ?? null;

  // Get completed trips count
  const completedTripsCount = await db.assignment.count({
    where: {
      driverId,
      booking: { status: "COMPLETED" },
    },
  });

  // Get this month's stats
  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = addMonthsPhoenix(monthStart, 1);

  const monthStats = await db.$queryRaw<any[]>`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(a."driverPaymentCents"), 0) as earnings
    FROM "Assignment" a 
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId} 
      AND b.status = 'COMPLETED' 
      AND b."pickupAt" >= ${monthStart} 
      AND b."pickupAt" < ${nextMonthStart}
  `;

  const monthTrips = Number(monthStats[0]?.count || 0);
  const monthEarnings = Number(monthStats[0]?.earnings || 0);

  // Get YTD stats
  const yearStart = startOfYearPhoenix(now);

  const ytdStats = await db.$queryRaw<any[]>`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(a."driverPaymentCents"), 0) as earnings
    FROM "Assignment" a 
    JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."driverId" = ${driverId} 
      AND b.status = 'COMPLETED' 
      AND b."pickupAt" >= ${yearStart}
  `;

  const ytdTrips = Number(ytdStats[0]?.count || 0);
  const ytdEarnings = Number(ytdStats[0]?.earnings || 0);

  // Get upcoming trips count
  const upcomingTripsCount = await db.assignment.count({
    where: {
      driverId,
      booking: {
        pickupAt: { gte: now },
        status: {
          in: ["CONFIRMED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"],
        },
      },
    },
  });

  // Get recent assignments (last 10 completed)
  const recentAssignments = await db.assignment.findMany({
    where: {
      driverId,
      booking: { status: "COMPLETED" },
    },
    orderBy: { booking: { pickupAt: "desc" } },
    take: 10,
    include: {
      booking: {
        select: {
          id: true,
          pickupAt: true,
          pickupAddress: true,
          dropoffAddress: true,
          status: true,
          serviceType: { select: { name: true } },
          user: { select: { name: true } },
          guestName: true,
        },
      },
    },
  });

  // Calculate average earnings per trip
  const avgEarnings =
    completedTripsCount > 0 ? Math.round(ytdEarnings / ytdTrips) : 0;

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link href='/driver-dashboard' className={`${styles.backBtn} backBtn`}>
          <Arrow className='backArrow' /> Back to Dashboard
        </Link>
        <div className={styles.headerTop}>
          <div className={styles.top}>
            <div className={styles.profileSection}>
              <div className={styles.profileImageWrap}>
                {profileImage ? (
                  <Image
                    src={profileImage}
                    alt={user.name || "Driver"}
                    width={80}
                    height={80}
                    className={styles.profileImage}
                  />
                ) : (
                  <Image
                    src={DefaultProfileImg}
                    alt={user.name || "Driver"}
                    width={80}
                    height={80}
                    className={styles.profileImage}
                    placeholder='blur'
                  />
                )}
              </div>
              <div className={styles.profileInfo}>
                <h1 className={`${styles.heading} h2`}>
                  {user.name || "Driver"}
                </h1>
                <div className={styles.badgesRow}>
                  <span className='badge badge_good'>DRIVER</span>
                  {roles?.includes("ADMIN") && (
                    <span className='badge badge_accent'>ADMIN</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Account Details & Stats Grid */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className='cardTitle h4'>Account Details</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>{user.name || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Phone</span>
              <span className={styles.infoValue}>{user.phone || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Member Since</span>
              <span className={styles.infoValue}>
                {formatDateTime(user.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className='cardTitle h4'>Trip Statistics</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <div className={styles.statValue}>{completedTripsCount}</div>
                <div className={styles.statLabel}>Total Trips</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statValue}>{upcomingTripsCount}</div>
                <div className={styles.statLabel}>Upcoming</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className='cardTitle h4'>Quick Links</h2>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.quickLinks}>
              <Link href='/driver-dashboard/trips' className={styles.quickLink}>
                📋 View All Trips
              </Link>
              <Link
                href='/driver-dashboard/earnings'
                className={styles.quickLink}
              >
                💰 Earnings Details
              </Link>
              <Link
                href='/driver-dashboard/support'
                className={styles.quickLink}
              >
                🆘 Get Support
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className='h4'>Earnings Summary</h2>
          <p className='miniNote'>Your earnings at a glance</p>
        </div>
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.tone_good}`}>
            <div className={styles.kpiTop}>
              <div className='emptyTitle underline'>This Month</div>
            </div>
            <div className='kpiValue'>{formatMoney(monthEarnings)}</div>
            <div className='miniNote'>{monthTrips} trips completed</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <div className='emptyTitle underline'>Year to Date</div>
            </div>
            <div className='kpiValue'>{formatMoney(ytdEarnings)}</div>
            <div className='miniNote'>{ytdTrips} trips completed</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <div className='emptyTitle underline'>Avg per Trip</div>
            </div>
            <div className='kpiValue'>{formatMoney(avgEarnings)}</div>
            <div className='miniNote'>Based on {ytdTrips} YTD trips</div>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      {recentAssignments.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderTop}>
              <div>
                <h2 className='h4'>Recent Completed Trips</h2>
                <p className='miniNote'>Your last 10 completed trips</p>
              </div>
              <Link
                href='/driver-dashboard/trips?range=past'
                className='primaryBtn'
              >
                View All Trips
              </Link>
            </div>
          </div>
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead className={styles.thead}>
                  <tr className={styles.trHead}>
                    <th className={styles.th}>Date</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Customer</th>
                    <th className={styles.th}>Service</th>
                    <th className={styles.th}>Route</th>
                    <th className={`${styles.th} ${styles.thRight}`}>
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssignments.map((a) => {
                    const b = a.booking;
                    const href = `/driver-dashboard/trips/${b.id}`;
                    const customerName =
                      b.user?.name?.trim() || b.guestName?.trim() || "Guest";

                    const pickupShort =
                      b.pickupAddress.length > 25
                        ? b.pickupAddress.slice(0, 25) + "..."
                        : b.pickupAddress;
                    const dropoffShort =
                      b.dropoffAddress.length > 25
                        ? b.dropoffAddress.slice(0, 25) + "..."
                        : b.dropoffAddress;

                    return (
                      <tr key={a.id} className={styles.tr}>
                        <td
                          className={styles.td}
                          data-label='Date'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-label='Open trip'
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <Link href={href} className={styles.rowLink}>
                            {formatDate(b.pickupAt)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>
                              {formatEta(b.pickupAt, now)}
                            </span>
                          </div>
                        </td>
                        <td
                          className={styles.td}
                          data-label='Status'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <span
                            className={`badge badge_${badgeTone(b.status)}`}
                          >
                            {statusLabel(b.status)}
                          </span>
                        </td>
                        <td
                          className={styles.td}
                          data-label='Customer'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {customerName}
                        </td>
                        <td
                          className={styles.td}
                          data-label='Service'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          {b.serviceType?.name ?? "—"}
                        </td>
                        <td
                          className={styles.td}
                          data-label='Route'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <div className={styles.cellStack}>
                            <div className={styles.cellStrong}>
                              {pickupShort}
                            </div>
                            <div className={styles.cellSub}>
                              → {dropoffShort}
                            </div>
                          </div>
                        </td>
                        <td
                          className={`${styles.td} ${styles.tdRight}`}
                          data-label='Earnings'
                          style={{ position: "relative" }}
                        >
                          <Link
                            href={href}
                            className={styles.rowStretchedLink}
                            aria-hidden='true'
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              inset: 0,
                              zIndex: 5,
                            }}
                          />
                          <span className={styles.earningsValue}>
                            {a.driverPaymentCents
                              ? formatMoney(a.driverPaymentCents)
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Card */}
      <div className={styles.section}>
        <div className={styles.supportCard}>
          <div className={styles.supportContent}>
            <h3 className='h4'>Need Help?</h3>
            <p className='miniNote'>
              If you have questions about your account, trips, or payments, our
              support team is here to help.
            </p>
          </div>
          <Link href='/driver-dashboard/support' className='primaryBtn'>
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  );
}
