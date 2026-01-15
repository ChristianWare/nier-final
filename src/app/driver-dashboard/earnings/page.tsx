/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./DriverEarningsPage.module.css";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function normalizeRoles(roles: any): AppRole[] {
  return Array.isArray(roles) && roles.length > 0 ? (roles as AppRole[]) : [];
}

async function resolveViewer(
  session: any
): Promise<{ userId: string; roles: AppRole[] }> {
  const userId =
    (session?.user?.userId as string | undefined) ??
    (session?.user?.id as string | undefined);

  const roles = normalizeRoles(session?.user?.roles);

  if (userId && roles.length) return { userId, roles };

  const email = session?.user?.email ?? null;
  if (!email) throw new Error("Missing identity");

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, roles: true },
  });

  if (!u?.id) throw new Error("User not found");
  return { userId: u.id, roles: normalizeRoles(u.roles) };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfWeekSunday(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function formatMoney(cents: number | null | undefined) {
  if (!cents || cents <= 0) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(dt: Date) {
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DriverEarningsPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/earnings");

  const { userId, roles } = await resolveViewer(session);

  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  if (!isAdmin && !isDriver) redirect("/");

  const now = new Date();
  const weekStart = startOfWeekSunday(now);
  const monthStart = startOfMonth(now);

  const scopeWhere: any = isAdmin ? {} : { assignment: { driverId: userId } };

  const [weekAgg, monthAgg, completedCountWeek, completedCountMonth, list] =
    await Promise.all([
      db.booking.aggregate({
        where: {
          ...scopeWhere,
          status: BookingStatus.COMPLETED,
          pickupAt: { gte: weekStart, lte: endOfDay(now) },
        },
        _sum: { totalCents: true },
      }),

      db.booking.aggregate({
        where: {
          ...scopeWhere,
          status: BookingStatus.COMPLETED,
          pickupAt: { gte: monthStart, lte: endOfDay(now) },
        },
        _sum: { totalCents: true },
      }),

      db.booking.count({
        where: {
          ...scopeWhere,
          status: BookingStatus.COMPLETED,
          pickupAt: { gte: weekStart, lte: endOfDay(now) },
        },
      }),

      db.booking.count({
        where: {
          ...scopeWhere,
          status: BookingStatus.COMPLETED,
          pickupAt: { gte: monthStart, lte: endOfDay(now) },
        },
      }),

      db.booking.findMany({
        where: {
          ...scopeWhere,
          status: {
            in: [
              BookingStatus.COMPLETED,
              BookingStatus.IN_PROGRESS,
              BookingStatus.ARRIVED,
              BookingStatus.EN_ROUTE,
              BookingStatus.ASSIGNED,
            ],
          },
        },
        orderBy: { pickupAt: "desc" },
        take: 120,
        select: {
          id: true,
          pickupAt: true,
          pickupAddress: true,
          dropoffAddress: true,
          status: true,
          totalCents: true,
        },
      }),
    ]);

  const weekTotal = weekAgg._sum.totalCents ?? 0;
  const monthTotal = monthAgg._sum.totalCents ?? 0;

  return (
    <section className='container' aria-label='Earnings'>
      <header className='header'>
        <h1 className='heading h2'>Earnings</h1>
        <p className='subheading'>
          Payroll is handled offline — this page shows trip totals for quick
          clarity.
        </p>
      </header>

      <div className={styles.metricsGrid}>
        <MetricCard
          label='Completed total (this week)'
          value={formatMoney(weekTotal)}
        />
        <MetricCard
          label='Completed trips (this week)'
          value={String(completedCountWeek)}
        />
        <MetricCard
          label='Completed total (this month)'
          value={formatMoney(monthTotal)}
        />
        <MetricCard
          label='Completed trips (this month)'
          value={String(completedCountMonth)}
        />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableTitle}>Trip list</div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.trHead}>
                <Th>Date</Th>
                <Th>Trip ID</Th>
                <Th>Route</Th>
                <Th>Base payout</Th>
                <Th>Tip</Th>
                <Th>Adjustments</Th>
                <Th>Status</Th>
                <Th>Gross total</Th>
              </tr>
            </thead>

            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyRow}>
                    No trips yet.
                  </td>
                </tr>
              ) : (
                list.map((t) => (
                  <tr key={t.id} className={styles.tr}>
                    <Td>{formatDateTime(t.pickupAt)}</Td>
                    <Td mono>{t.id.slice(0, 10)}…</Td>
                    <Td wide>
                      {t.pickupAddress} → {t.dropoffAddress}
                    </Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>{String(t.status).replaceAll("_", " ")}</Td>
                    <Td strong>{formatMoney(t.totalCents)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.footerNote}>
          Base payout / Tip / Adjustments aren’t stored yet. If you want to
          track payroll internally, we can add fields without any Stripe
          integration.
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className={styles.th}>{children}</th>;
}

function Td({
  children,
  mono,
  wide,
  strong,
}: {
  children: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
  strong?: boolean;
}) {
  const className = [
    styles.td,
    mono ? styles.tdMono : "",
    wide ? styles.tdWide : "",
    strong ? styles.tdStrong : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <td className={className}>{children}</td>;
}
