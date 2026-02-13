import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseYMD(s: string | null) {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]),
    m = Number(match[2]),
    d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function startOfDayFromYMD(
  ymd: { y: number; m: number; d: number },
  timeZone: string,
) {
  const isoDate = `${ymd.y}-${String(ymd.m).padStart(2, "0")}-${String(ymd.d).padStart(2, "0")}`;
  return new Date(tz.localToUtcIso(isoDate, "00:00", timeZone));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: driverId } = await params;
    const { searchParams } = new URL(request.url);
    const { timezone: companyTz } = await getCompanySettings();

    const view = searchParams.get("view") || "all";
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const currentMonthStart = tz.startOfMonth(now, companyTz);

    const user = await db.user.findUnique({
      where: { id: driverId },
      select: { id: true, name: true, email: true, roles: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.roles.includes("DRIVER")) {
      return NextResponse.json(
        { error: "User is not a driver" },
        { status: 400 },
      );
    }

    let fromUtc: Date;
    let toUtc: Date;

    if (view === "daily" && year && month) {
      const key = `${year}-${month}`;
      const ms = tz.monthStartFromKey(key, companyTz) ?? currentMonthStart;
      fromUtc = ms;
      toUtc = tz.addMonths(ms, 1, companyTz);
    } else if (view === "monthly") {
      fromUtc = tz.addMonths(currentMonthStart, -11, companyTz);
      toUtc = tz.addMonths(currentMonthStart, 1, companyTz);
    } else if (view === "ytd") {
      fromUtc = tz.startOfYear(now, companyTz);
      toUtc = tz.addMonths(currentMonthStart, 1, companyTz);
    } else if (view === "range" && fromParam && toParam) {
      const defaultTo = tz.formatIsoDate(now, companyTz);
      const defaultFrom = tz.formatIsoDate(
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        companyTz,
      );
      const f = parseYMD(fromParam ?? defaultFrom);
      const t = parseYMD(toParam ?? defaultTo);
      const fUtc = f
        ? startOfDayFromYMD(f, companyTz)
        : startOfDayFromYMD(parseYMD(defaultFrom)!, companyTz);
      const tUtc0 = t
        ? startOfDayFromYMD(t, companyTz)
        : startOfDayFromYMD(parseYMD(defaultTo)!, companyTz);
      fromUtc = fUtc;
      toUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    } else {
      const earliest = await db.assignment.findFirst({
        where: { driverId },
        orderBy: { assignedAt: "asc" },
        select: { assignedAt: true },
      });
      fromUtc = earliest?.assignedAt
        ? tz.startOfDay(earliest.assignedAt, companyTz)
        : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      toUtc = new Date(
        tz.startOfDay(now, companyTz).getTime() + 24 * 60 * 60 * 1000,
      );
    }

    const assignments = await db.assignment.findMany({
      where: {
        driverId,
        booking: {
          status: "COMPLETED",
          pickupAt: { gte: fromUtc, lt: toUtc },
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            totalCents: true,
            serviceType: { select: { name: true } },
            user: { select: { name: true, email: true } },
            guestName: true,
            guestEmail: true,
          },
        },
        vehicleUnit: { select: { name: true, plate: true } },
      },
      orderBy: { booking: { pickupAt: "desc" } },
    });

    const headers = [
      "Booking ID",
      "Pickup Date",
      "Pickup Time",
      "Customer",
      "Service",
      "Pickup Address",
      "Dropoff Address",
      "Booking Total",
      "Driver Payment",
      "Vehicle",
    ];

    const rows = assignments.map((a) => {
      const b = a.booking;
      const customerName =
        b.user?.name?.trim() ||
        b.guestName?.trim() ||
        b.user?.email ||
        b.guestEmail ||
        "Guest";

      const vehicleInfo = a.vehicleUnit
        ? `${a.vehicleUnit.name}${a.vehicleUnit.plate ? ` (${a.vehicleUnit.plate})` : ""}`
        : "";

      return [
        escapeCSV(b.id),
        tz.formatDate(b.pickupAt, companyTz),
        tz.formatDateTime(b.pickupAt, companyTz),
        escapeCSV(customerName),
        escapeCSV(b.serviceType?.name),
        escapeCSV(b.pickupAddress),
        escapeCSV(b.dropoffAddress),
        ((b.totalCents ?? 0) / 100).toFixed(2),
        ((a.driverPaymentCents ?? 0) / 100).toFixed(2),
        escapeCSV(vehicleInfo),
      ];
    });

    const totalDriverPayment = assignments.reduce(
      (sum, a) => sum + (a.driverPaymentCents ?? 0),
      0,
    );
    const totalBookingAmount = assignments.reduce(
      (sum, a) => sum + (a.booking.totalCents ?? 0),
      0,
    );

    rows.push([]);
    rows.push([
      "TOTALS",
      "",
      "",
      "",
      "",
      "",
      "",
      (totalBookingAmount / 100).toFixed(2),
      (totalDriverPayment / 100).toFixed(2),
      "",
    ]);
    rows.push([`Total Trips: ${assignments.length}`]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );

    const driverName = (user.name ?? "driver").replace(/[^a-zA-Z0-9]/g, "-");
    const filename = `driver-earnings-${driverName}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting driver earnings:", error);
    return NextResponse.json(
      { error: "Failed to export driver earnings" },
      { status: 500 },
    );
  }
}
