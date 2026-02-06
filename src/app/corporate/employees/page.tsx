/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import EmployeesClient from "./EmployeesClient";

export const metadata = { title: "Employees | Corporate" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export default async function CorporateEmployeesPage() {
  noStore();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: { corporateAccountId: true },
  });

  if (!contact) redirect("/");

  const accountId = contact.corporateAccountId;
  const now = new Date();
  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = startOfNextMonthPhoenix(monthStart);

  const cancelledStatuses = ["CANCELLED", "REFUNDED", "NO_SHOW"] as any;

  // ─── Fetch employees + ride counts ───
  const [passengers, rideCountsThisMonth, rideCountsAllTime] =
    await Promise.all([
      db.corporatePassenger.findMany({
        where: { corporateAccountId: accountId },
        orderBy: [{ active: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          department: true,
          employeeId: true,
          active: true,
          createdAt: true,
        },
      }),

      // Rides this month grouped by passenger
      db.booking.groupBy({
        by: ["corporatePassengerId"],
        where: {
          corporateAccountId: accountId,
          pickupAt: { gte: monthStart, lt: nextMonthStart },
          NOT: { status: { in: cancelledStatuses } },
          corporatePassengerId: { not: null },
        },
        _count: { id: true },
      }),

      // All-time rides grouped by passenger
      db.booking.groupBy({
        by: ["corporatePassengerId"],
        where: {
          corporateAccountId: accountId,
          NOT: { status: { in: cancelledStatuses } },
          corporatePassengerId: { not: null },
        },
        _count: { id: true },
      }),
    ]);

  // Build lookup maps
  const monthMap = new Map<string, number>();
  for (const r of rideCountsThisMonth) {
    if (r.corporatePassengerId) {
      monthMap.set(r.corporatePassengerId, r._count.id);
    }
  }

  const allTimeMap = new Map<string, number>();
  for (const r of rideCountsAllTime) {
    if (r.corporatePassengerId) {
      allTimeMap.set(r.corporatePassengerId, r._count.id);
    }
  }

  // Merge into serialisable array
  const employees = passengers.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email ?? "",
    phone: p.phone ?? "",
    department: p.department ?? "",
    employeeId: p.employeeId ?? "",
    active: p.active,
    createdAt: p.createdAt.toISOString(),
    ridesThisMonth: monthMap.get(p.id) ?? 0,
    ridesAllTime: allTimeMap.get(p.id) ?? 0,
  }));

  const activeCount = employees.filter((e) => e.active).length;
  const departments = [
    ...new Set(employees.map((e) => e.department).filter(Boolean)),
  ].sort();

  return (
    <EmployeesClient
      employees={employees}
      activeCount={activeCount}
      totalCount={employees.length}
      departments={departments}
      accountId={accountId}
    />
  );
}