import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import { formatIsoDate, startOfMonth } from "@/lib/timezone";
import { startOfNextMonth } from "@/app/admin/lib/phxDates"; 
import AdminDriversCalendarPanel, {
  type DriverInfo,
} from "@/components/admin/AdminDriversCalendarPanel/AdminDriversCalendarPanel";

function monthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const EXCLUDED = ["CANCELLED", "NO_SHOW", "REFUNDED"] as const;

export default async function AdminDriversCalendarSection({
  initialMonth,
}: {
  initialMonth: string;
}) {
  const { timezone: tz } = await getCompanySettings();
  const now = new Date();

  const [y, m] = initialMonth.split("-").map(Number);
  const baseDate =
    y && m
      ? new Date(Date.UTC(y, m - 1, 1, 12, 0, 0))
      : new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12, 0, 0),
        );

  const monthStart = startOfMonth(baseDate, tz);
  const nextMonthStart = startOfNextMonth(monthStart, tz);

  // Fetch all users with DRIVER role
  const allDriverUsers = await db.user.findMany({
    where: { roles: { has: "DRIVER" } },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });

  if (allDriverUsers.length === 0) return null;

  const driverIds = allDriverUsers.map((d) => d.id);

  // Batch: month assignments for count-by-ymd
  const monthAssignments = await db.assignment.findMany({
    where: {
      driverId: { in: driverIds },
      booking: {
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: {
          status: {
            in: EXCLUDED as unknown as (typeof EXCLUDED)[number][],
          },
        },
      },
    },
    select: {
      driverId: true,
      booking: { select: { pickupAt: true } },
    },
  });

  const countsByDriverByYmd: Record<string, Record<string, number>> = {};
  for (const a of monthAssignments) {
    const ymd = formatIsoDate(a.booking.pickupAt, tz);
    if (!countsByDriverByYmd[a.driverId]) countsByDriverByYmd[a.driverId] = {};
    countsByDriverByYmd[a.driverId][ymd] =
      (countsByDriverByYmd[a.driverId][ymd] ?? 0) + 1;
  }

  // Batch: total assignments per driver (non-cancelled)
  const totalCounts = await db.assignment.groupBy({
    by: ["driverId"],
    where: {
      driverId: { in: driverIds },
      booking: {
        NOT: {
          status: {
            in: EXCLUDED as unknown as (typeof EXCLUDED)[number][],
          },
        },
      },
    },
    _count: { id: true },
  });
  const totalByDriver: Record<string, number> = {};
  for (const row of totalCounts) totalByDriver[row.driverId] = row._count.id;

  // Batch: upcoming assignments per driver
  const upcomingCounts = await db.assignment.groupBy({
    by: ["driverId"],
    where: {
      driverId: { in: driverIds },
      booking: {
        pickupAt: { gte: now },
        status: {
          in: ["CONFIRMED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"],
        },
      },
    },
    _count: { id: true },
  });
  const upcomingByDriver: Record<string, number> = {};
  for (const row of upcomingCounts)
    upcomingByDriver[row.driverId] = row._count.id;

  // "Active" proxy: any assignment in the last 60 days
  const cutoff = new Date(now.getTime() - SIXTY_DAYS_MS);
  const recentAssignments = await db.assignment.findMany({
    where: {
      driverId: { in: driverIds },
      booking: { pickupAt: { gte: cutoff } },
    },
    select: { driverId: true },
    distinct: ["driverId"],
  });
  const recentSet = new Set(recentAssignments.map((a) => a.driverId));

  // Build DriverInfo list
  const driverInfos: DriverInfo[] = allDriverUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    totalAssignments: totalByDriver[u.id] ?? 0,
    upcomingCount: upcomingByDriver[u.id] ?? 0,
  }));

  const activeDrivers = driverInfos.filter((d) => recentSet.has(d.id));
  const inactiveDrivers = driverInfos.filter((d) => !recentSet.has(d.id));
  const mk = monthKey(baseDate);

  return (
    <section
      style={{
        marginTop: "4rem",
        paddingTop: "4rem",
        
        display: "grid",
        gap: "2rem",
      }}
    >
      <header style={{ display: "grid", gap: "1rem" }}>
        <h2 className='h3 underline'>Driver Schedules</h2>
        <p className='subheading'>
          Select a driver to view their monthly schedule.
        </p>
      </header>

      <AdminDriversCalendarPanel
        activeDrivers={activeDrivers}
        inactiveDrivers={inactiveDrivers}
        initialDataByDriver={countsByDriverByYmd}
        initialMonth={mk}
        todayYmd={formatIsoDate(now, tz)}
        timeZone={tz}
      />
    </section>
  );
}
