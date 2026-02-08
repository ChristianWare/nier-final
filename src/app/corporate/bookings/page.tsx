/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth"; 
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import BookingsClient from "./BookingsClient";

export const metadata = { title: "Bookings | Corporate" };
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

export default async function CorporateBookingsPage() {
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

  // ─── Parallel data fetching ───
  const [bookings, passengers, statusCounts, spendThisMonthAgg] =
    await Promise.all([
      // All bookings for this account
      db.booking.findMany({
        where: { corporateAccountId: accountId },
        orderBy: { pickupAt: "desc" },
        select: {
          id: true,
          status: true,
          pickupAt: true,
          createdAt: true,
          pickupAddress: true,
          dropoffAddress: true,
          totalCents: true,
          currency: true,
          serviceType: { select: { name: true } },
          corporatePassenger: { select: { id: true, name: true } },
          assignment: {
            select: { driver: { select: { name: true } } },
          },
        },
      }),

      // Passengers for filter dropdown
      db.corporatePassenger.findMany({
        where: { corporateAccountId: accountId, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),

      // Status counts for tabs
      db.booking.groupBy({
        by: ["status"],
        where: { corporateAccountId: accountId },
        _count: { id: true },
      }),

      // Spend this month
      (db.booking as any).aggregate({
        where: {
          corporateAccountId: accountId,
          pickupAt: { gte: monthStart, lt: nextMonthStart },
          NOT: { status: { in: cancelledStatuses } },
        },
        _sum: { totalCents: true },
      }),
    ]);

  // Build status count map
  const statusCountMap: Record<string, number> = {};
  for (const sc of statusCounts) {
    statusCountMap[sc.status] = sc._count.id;
  }

  // Serialize bookings
  const serializedBookings = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    pickupAt: b.pickupAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    pickupAddress: b.pickupAddress ?? "",
    dropoffAddress: b.dropoffAddress ?? "",
    totalCents: b.totalCents ? Number(b.totalCents) : 0,
    currency: b.currency ?? "USD",
    service: b.serviceType?.name ?? "—",
    passengerName: b.corporatePassenger?.name ?? "—",
    passengerId: b.corporatePassenger?.id ?? "",
    driverName: b.assignment?.driver?.name ?? "",
  }));

  const serializedPassengers = passengers.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const spendThisMonthCents = Number(
    spendThisMonthAgg?._sum?.totalCents ?? 0,
  );

  return (
    <BookingsClient
      bookings={serializedBookings}
      passengers={serializedPassengers}
      statusCounts={statusCountMap}
      totalCount={bookings.length}
      spendThisMonthCents={spendThisMonthCents}
    />
  );
}