import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "../../../../../auth";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { formatIsoDate, startOfMonth } from "@/lib/timezone";
import { startOfNextMonth } from "../../../admin/lib/phxDates";

/* eslint-disable @typescript-eslint/no-explicit-any */

function getSessionRoles(session: any): string[] {
  const roles = session?.user?.roles;
  return Array.isArray(roles) && roles.length > 0 ? roles : [];
}

function parseMonthParam(v: string | null) {
  if (!v) return null;
  const [y, m] = v.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
}

const EXCLUDED = ["CANCELLED", "NO_SHOW", "REFUNDED"] as const;

export async function GET(req: NextRequest) {
  // Auth: admin only
  const session = await auth();
  const roles = getSessionRoles(session);

  if (!session?.user || !roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const driverId = searchParams.get("driverId");
  const monthParam = searchParams.get("month");

  if (!driverId || !monthParam) {
    return NextResponse.json(
      { error: "Missing driverId or month" },
      { status: 400 },
    );
  }

  // Verify the driverId belongs to an actual driver
  const driver = await db.user.findUnique({
    where: { id: driverId },
    select: { id: true, roles: true },
  });

  if (!driver || !driver.roles.includes("DRIVER")) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const { timezone: tz } = await getCompanySettings();

  const baseDate = parseMonthParam(monthParam);
  if (!baseDate) {
    return NextResponse.json(
      { error: "Invalid month format" },
      { status: 400 },
    );
  }

  const monthStart = startOfMonth(baseDate, tz);
  const nextMonthStart = startOfNextMonth(monthStart, tz);

  const assignments = await db.assignment.findMany({
    where: {
      driverId,
      booking: {
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: {
          status: { in: EXCLUDED as unknown as (typeof EXCLUDED)[number][] },
        },
      },
    },
    select: {
      booking: { select: { pickupAt: true } },
    },
  });

  const countsByYmd: Record<string, number> = {};
  for (const a of assignments) {
    const ymd = formatIsoDate(a.booking.pickupAt, tz);
    countsByYmd[ymd] = (countsByYmd[ymd] ?? 0) + 1;
  }

  return NextResponse.json({ countsByYmd });
}
