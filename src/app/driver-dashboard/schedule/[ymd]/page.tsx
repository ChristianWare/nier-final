/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { BookingStatus } from "@prisma/client";
import styles from "./DriverScheduleDayPage.module.css";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Button from "@/components/shared/Button/Button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEZONE = "America/Phoenix";

function parseYmd(ymd: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function startOfDayFromYmd(ymd: { y: number; m: number; d: number }) {
  return new Date(ymd.y, ymd.m - 1, ymd.d, 0, 0, 0, 0);
}

function endOfDayFromYmd(ymd: { y: number; m: number; d: number }) {
  return new Date(ymd.y, ymd.m - 1, ymd.d, 23, 59, 59, 999);
}

function formatDayLabel(ymd: { y: number; m: number; d: number }) {
  const date = new Date(ymd.y, ymd.m - 1, ymd.d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(date);
}

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_REVIEW: "Pending",
    PENDING_PAYMENT: "Payment due",
    CONFIRMED: "Confirmed",
    ASSIGNED: "Assigned",
    EN_ROUTE: "En route",
    ARRIVED: "Arrived",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-show",
  };
  return labels[status] || status.replaceAll("_", " ");
}

function badgeTone(status: string) {
  if (status === "COMPLETED") return "good";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  return "neutral";
}

async function resolveSessionUserId(session: any): Promise<string | null> {
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

export default async function DriverScheduleDayPage({
  params,
}: {
  params: Promise<{ ymd: string }>;
}) {
  const { ymd } = await params;

  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard");

  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) redirect("/");

  const driverId = await resolveSessionUserId(session);
  if (!driverId) redirect("/");

  const parsed = parseYmd(ymd);
  if (!parsed) notFound();

  const dayStart = startOfDayFromYmd(parsed);
  const dayEnd = endOfDayFromYmd(parsed);
  const dayLabel = formatDayLabel(parsed);

  const trips = await db.booking.findMany({
    where: {
      pickupAt: { gte: dayStart, lte: dayEnd },
      status: {
        notIn: [
          BookingStatus.CANCELLED,
          BookingStatus.REFUNDED,
          BookingStatus.NO_SHOW,
        ],
      },
      assignment: { driverId },
    },
    orderBy: { pickupAt: "asc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: {
          vehicleUnit: { select: { name: true } },
        },
      },
    },
  });

  const totalEarnings = trips.reduce(
    (sum, t) => sum + (t.assignment?.driverPaymentCents ?? 0),
    0,
  );

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <Link href='/driver-dashboard' className={`${styles.backBtn} backBtn`}>
          <Arrow className='backArrow' /> Back to Dashboard
        </Link>

        <div className={styles.headerTop}>
          <div className={styles.top}>
            <h1 className={`${styles.heading} h2`}>{dayLabel}</h1>
            <div className={styles.meta}>
              <span>
                <strong>{trips.length}</strong> trip
                {trips.length !== 1 ? "s" : ""}
              </span>
              {totalEarnings > 0 && (
                <span className={styles.metaSep}>
                  • <strong>{formatMoney(totalEarnings)}</strong> earnings
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {trips.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No trips scheduled</p>
          <p className={styles.emptyCopy}>
            You don&apos;t have any trips assigned for this day.
          </p>
        </div>
      ) : (
        <div className={styles.tripsList}>
          {trips.map((trip) => {
            const customerName =
              trip.user?.name?.trim() || trip.guestName?.trim() || "Customer";
            const customerPhone = trip.user?.phone || trip.guestPhone || null;
            const vehicleName =
              trip.assignment?.vehicleUnit?.name || trip.vehicle?.name || null;
            const driverPay = trip.assignment?.driverPaymentCents ?? 0;

            return (
              <div key={trip.id} className={styles.tripCard}>
                <div className={styles.tripHeader}>
                  <div className={styles.tripTime}>
                    {formatTime(trip.pickupAt)}
                  </div>
                  <span className={`badge badge_${badgeTone(trip.status)}`}>
                    {statusLabel(trip.status)}
                  </span>
                </div>

                <div className={styles.tripBody}>
                  <div className={styles.tripRoute}>
                    <div className={styles.tripRouteItem}>
                      <span className={styles.routeIcon}>📍</span>
                      <div>
                        <div className={styles.routeLabel}>Pickup</div>
                        <div className={styles.routeAddress}>
                          {trip.pickupAddress}
                        </div>
                      </div>
                    </div>
                    <div className={styles.tripRouteItem}>
                      <span className={styles.routeIcon}>🏁</span>
                      <div>
                        <div className={styles.routeLabel}>Dropoff</div>
                        <div className={styles.routeAddress}>
                          {trip.dropoffAddress}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.tripDetails}>
                    <div className={styles.tripDetail}>
                      <span className={styles.detailLabel}>Customer</span>
                      <span className={styles.detailValue}>{customerName}</span>
                    </div>
                    <div className={styles.tripDetail}>
                      <span className={styles.detailLabel}>Phone</span>
                      {customerPhone ? (
                        <a
                          href={`tel:${customerPhone}`}
                          className={styles.detailValueLink}
                        >
                          {customerPhone}
                        </a>
                      ) : (
                        <span className={styles.detailValueMuted}>
                          Not provided
                        </span>
                      )}
                    </div>
                    <div className={styles.tripDetail}>
                      <span className={styles.detailLabel}>Service</span>
                      <span className={styles.detailValue}>
                        {trip.serviceType?.name ?? "—"}
                      </span>
                    </div>
                    {vehicleName && (
                      <div className={styles.tripDetail}>
                        <span className={styles.detailLabel}>Vehicle</span>
                        <span className={styles.detailValue}>
                          {vehicleName}
                        </span>
                      </div>
                    )}
                    {driverPay > 0 && (
                      <div className={styles.tripDetail}>
                        <span className={styles.detailLabel}>Your Pay</span>
                        <span
                          className={`${styles.detailValue} ${styles.detailValueGood}`}
                        >
                          {formatMoney(driverPay)}
                        </span>
                      </div>
                    )}
                  </div>

                  {(trip.passengers ||
                    trip.luggage ||
                    trip.specialRequests) && (
                    <div className={styles.tripExtras}>
                      {trip.passengers && (
                        <span className={styles.extraPill}>
                          👤 {trip.passengers} passenger
                          {trip.passengers !== 1 ? "s" : ""}
                        </span>
                      )}
                      {trip.luggage && (
                        <span className={styles.extraPill}>
                          🧳 {trip.luggage} bag{trip.luggage !== 1 ? "s" : ""}
                        </span>
                      )}
                      {trip.specialRequests && (
                        <div className={styles.specialRequests}>
                          <span className={styles.detailLabel}>Notes:</span>{" "}
                          {trip.specialRequests}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.tripActions}>
                    <Button
                      href={`/driver-dashboard/trips/${trip.id}`}
                      text='More Details'
                      btnType='blackReg'
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
