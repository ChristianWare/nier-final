/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import styles from "./AdminCalendarDay.module.css";
import {
  PHX_TZ,
  startOfPhoenixDayFromYmd,
  ymdInPhoenix,
} from "../../lib/phxDates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidYmd(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function formatDateTitle(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: PHX_TZ,
  }).format(dt);
}

function formatTime(dt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function badgeTone(status: string) {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "good";
  if (status === "COMPLETED") return "good";
  return "neutral";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default async function AdminCalendarDayPage(props: {
  params: Promise<{ ymd?: string; date?: string }>;
}) {
  const params = await props.params;
  const ymd = params.ymd ?? params.date;

  if (!ymd || !isValidYmd(ymd)) notFound();

  const start = startOfPhoenixDayFromYmd(ymd);
  if (!start) notFound();

  const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const excluded = ["CANCELLED", "NO_SHOW", "REFUNDED"] as const;

  const rides = await db.booking.findMany({
    where: {
      pickupAt: { gte: start, lt: next },
      NOT: { status: { in: excluded as any } },
    },
    orderBy: [{ pickupAt: "asc" }],
    select: {
      id: true,
      status: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      userId: true,
      user: { select: { name: true, email: true } },
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        select: { driver: { select: { name: true, email: true } } },
      },
    },
  });

  const title = formatDateTitle(ymd);
  const todayKey = ymdInPhoenix(new Date());
  const isToday = ymd === todayKey;

  return (
    <section className='container' aria-label='Rides for day'>
      <header className='header'>
        <h1 className='heading h2'>
          {title}
          {isToday ? " (Today)" : ""}
        </h1>
        <p className='subheading'>
          {rides.length > 0
            ? `${rides.length} ride${rides.length === 1 ? "" : "s"} scheduled`
            : "No rides scheduled"}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href='/admin/calendar' className='miniNote'>
            ← Back to calendar
          </Link>
          <div className='miniNote'>Time zone: {PHX_TZ}</div>
        </div>
      </header>

      <div className={styles.wrap}>
        {rides.length === 0 ? (
          <div className={styles.card}>
            <div className='miniNote'>No rides scheduled for {ymd}.</div>
          </div>
        ) : (
          rides.map((b: any) => {
            const customer =
              (b.user?.name ?? "").trim() ||
              b.user?.email ||
              (b.guestName ?? "").trim() ||
              b.guestEmail ||
              "Customer";

            const driver =
              (b.assignment?.driver?.name ?? "").trim() ||
              b.assignment?.driver?.email ||
              null;

            const route = `${shortAddress(b.pickupAddress)} → ${shortAddress(
              b.dropoffAddress,
            )}`;

            const time = formatTime(b.pickupAt);
            const tone = badgeTone(b.status);

            return (
              <div key={b.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.titleBlock}>
                    <div className='emptyTitle underline'>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={styles.link}
                      >
                        {time} • {customer}
                      </Link>
                    </div>
                    <div className='miniNote'>{route}</div>
                  </div>

                  <span
                    className={`${styles.badge} ${styles[`badge_${tone}`]}`}
                  >
                    {statusLabel(b.status)}
                  </span>
                </div>

                <div className={styles.row}>
                  <div className={styles.metaLine}>
                    <div className='miniNote'>
                      Service:{" "}
                      <span className={styles.mono}>
                        {b.serviceType?.name ?? "—"}
                      </span>
                    </div>
                    <div className='miniNote'>
                      Vehicle:{" "}
                      <span className={styles.mono}>
                        {b.vehicle?.name ?? "—"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.metaLine}>
                    <div className='miniNote'>
                      Booking ID: <span className={styles.mono}>{b.id}</span>
                    </div>
                    <div className='miniNote'>
                      Driver:{" "}
                      <span className={styles.mono}>
                        {driver ?? "Unassigned"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
