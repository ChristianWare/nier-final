import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toPhoenixParts(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  return { y: phx.getUTCFullYear(), m: phx.getUTCMonth(), d: phx.getUTCDate() };
}

function startOfDayPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfMonthPhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function startOfYearPhoenix(dateUtc: Date) {
  const { y } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, 0, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  const nextStartUtcMs = nextStartLocalMs - PHX_OFFSET_MS;
  return new Date(nextStartUtcMs);
}

function monthStartFromKeyPhoenix(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12)
    return null;
  const startLocalMs = Date.UTC(y, m - 1, 1, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function parseYMD(s: string | null) {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function startOfDayFromYMDPhoenix(ymd: { y: number; m: number; d: number }) {
  const startLocalMs = Date.UTC(ymd.y, ymd.m - 1, ymd.d, 0, 0, 0);
  const startUtcMs = startLocalMs - PHX_OFFSET_MS;
  return new Date(startUtcMs);
}

function ymdForInputPhoenix(dateUtc: Date) {
  const { y, m, d } = toPhoenixParts(dateUtc);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: driverId } = await params;
    const { searchParams } = new URL(request.url);

    const view = searchParams.get("view") || "all";
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const currentMonthStart = startOfMonthPhoenix(now);

    // Check if user exists and is a driver
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

    // Determine date range based on view
    let fromUtc: Date;
    let toUtc: Date;

    if (view === "daily" && year && month) {
      const key = `${year}-${month}`;
      const ms = monthStartFromKeyPhoenix(key) ?? currentMonthStart;
      fromUtc = ms;
      toUtc = addMonthsPhoenix(ms, 1);
    } else if (view === "monthly") {
      fromUtc = addMonthsPhoenix(currentMonthStart, -11);
      toUtc = addMonthsPhoenix(currentMonthStart, 1);
    } else if (view === "ytd") {
      fromUtc = startOfYearPhoenix(now);
      toUtc = addMonthsPhoenix(currentMonthStart, 1);
    } else if (view === "range" && fromParam && toParam) {
      const defaultTo = ymdForInputPhoenix(now);
      const defaultFrom = ymdForInputPhoenix(
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      );
      const f = parseYMD(fromParam ?? defaultFrom);
      const t = parseYMD(toParam ?? defaultTo);
      const fUtc = f
        ? startOfDayFromYMDPhoenix(f)
        : startOfDayFromYMDPhoenix(parseYMD(defaultFrom)!);
      const tUtc0 = t
        ? startOfDayFromYMDPhoenix(t)
        : startOfDayFromYMDPhoenix(parseYMD(defaultTo)!);
      fromUtc = fUtc;
      toUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    } else {
      // All time
      const earliest = await db.assignment.findFirst({
        where: { driverId },
        orderBy: { assignedAt: "asc" },
        select: { assignedAt: true },
      });
      fromUtc = earliest?.assignedAt
        ? startOfDayPhoenix(earliest.assignedAt)
        : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      toUtc = new Date(startOfDayPhoenix(now).getTime() + 24 * 60 * 60 * 1000);
    }

    // Fetch all assignments with completed bookings in the date range
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

    // Build CSV
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
        formatDate(b.pickupAt),
        formatDateTime(b.pickupAt),
        escapeCSV(customerName),
        escapeCSV(b.serviceType?.name),
        escapeCSV(b.pickupAddress),
        escapeCSV(b.dropoffAddress),
        ((b.totalCents ?? 0) / 100).toFixed(2),
        ((a.driverPaymentCents ?? 0) / 100).toFixed(2),
        escapeCSV(vehicleInfo),
      ];
    });

    // Add totals row
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
