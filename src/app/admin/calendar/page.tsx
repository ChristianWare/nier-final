/* eslint-disable @typescript-eslint/no-explicit-any */
import AdminRideCalendar from "@/components/admin/AdminRideCalendar/AdminRideCalendar";
import { db } from "@/lib/db";
import {
  PHX_TZ,
  startOfMonthPhoenix,
  startOfNextMonthPhoenix,
  ymdInPhoenix,
} from "../lib/phxDates";
import AdminBlackoutDatesSection from "@/components/admin/AdminBlackoutDates/AdminBlackoutDatesSection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMonthParam(v: string | undefined) {
  if (!v) return null;
  const [y, m] = v.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
}

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default async function AdminCalendarPage(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  const searchParams = await props.searchParams;

  const now = new Date();
  const parsed = parseMonthParam(searchParams?.month);
  const baseMonth =
    parsed ??
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0));

  const monthStart = startOfMonthPhoenix(baseMonth);
  const nextMonthStart = startOfNextMonthPhoenix(monthStart);

  const excluded = ["CANCELLED", "NO_SHOW", "REFUNDED"] as const;

  const rows = await db.booking.findMany({
    where: {
      pickupAt: { gte: monthStart, lt: nextMonthStart },
      NOT: { status: { in: excluded as any } },
    },
    select: { pickupAt: true },
  });

  const countsByYmd: Record<string, number> = {};
  for (const r of rows) {
    const key = ymdInPhoenix(r.pickupAt);
    countsByYmd[key] = (countsByYmd[key] ?? 0) + 1;
  }

  return (
    <section className='container' aria-label='Admin calendar'>
      <header className='header'>
        <h1 className='heading h2'>Calendar</h1>
        <p className='subheading'>
          Click a day to view rides scheduled for that date.
        </p>
      </header>

      <AdminRideCalendar
        initialMonth={monthKey(baseMonth)}
        countsByYmd={countsByYmd}
        todayYmd={ymdInPhoenix(now)}
      />

      <div className='miniNote' style={{ marginTop: 10 }}>
        Time zone: {PHX_TZ}
      </div>
      <AdminBlackoutDatesSection />
    </section>
  );
}
