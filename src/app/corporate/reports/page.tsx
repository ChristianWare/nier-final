/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import ReportsClient from "./ReportsClient";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import { startOfMonth } from "@/lib/timezone";

export const metadata = { title: "Reports | Corporate" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CorporateReportsPage() {
  noStore();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: { corporateAccountId: true },
  });

  if (!contact) redirect("/");

  const accountId = contact.corporateAccountId;
  const { timezone: companyTimezone } = await getCompanySettings();
  const now = new Date();
  const monthStart = startOfMonth(now, companyTimezone);

  const cancelledStatuses = ["CANCELLED", "REFUNDED", "NO_SHOW"] as any;

  // ─── Fetch all non-cancelled bookings with relevant fields ───
  const [bookings, passengers] = await Promise.all([
    db.booking.findMany({
      where: {
        corporateAccountId: accountId,
        NOT: { status: { in: cancelledStatuses } },
      },
      orderBy: { pickupAt: "desc" },
      select: {
        id: true,
        pickupAt: true,
        totalCents: true,
        status: true,
        serviceType: { select: { name: true } },
        corporatePassenger: {
          select: { id: true, name: true, department: true },
        },
      },
    }),

    db.corporatePassenger.findMany({
      where: { corporateAccountId: accountId },
      select: { id: true, name: true, department: true, active: true },
    }),
  ]);

  // Serialize
  const serializedBookings = bookings.map((b) => ({
    id: b.id,
    pickupAt: b.pickupAt.toISOString(),
    totalCents: b.totalCents ? Number(b.totalCents) : 0,
    status: b.status,
    service: b.serviceType?.name ?? "Other",
    passengerId: b.corporatePassenger?.id ?? "",
    passengerName: b.corporatePassenger?.name ?? "Unassigned",
    department: b.corporatePassenger?.department ?? "No Department",
  }));

  const departments = [
    ...new Set(passengers.map((p) => p.department).filter(Boolean)),
  ].sort() as string[];

  return (
    <ReportsClient
      bookings={serializedBookings}
      departments={departments}
      monthStartIso={monthStart.toISOString()}
      companyTimezone={companyTimezone}
    />
  );
}
