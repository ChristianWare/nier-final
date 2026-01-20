import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

type ViewMode = "month" | "ytd" | "all" | "range";

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

function cleanView(v: string | null): ViewMode {
  if (v === "month" || v === "ytd" || v === "all" || v === "range") return v;
  return "month";
}

function csvEscape(v: string) {
  const needs = /[",\n\r]/.test(v);
  const s = v.replaceAll('"', '""');
  return needs ? `"${s}"` : s;
}

export async function GET(req: Request) {
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

  if (!session || !isAdmin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const view = cleanView(url.searchParams.get("view"));
  const now = new Date();

  const currentMonthStart = startOfMonthPhoenix(now);
  const monthParam = url.searchParams.get("month");
  const rangeFromParam = url.searchParams.get("from");
  const rangeToParam = url.searchParams.get("to");

  let fromUtc = currentMonthStart;
  let toUtc = addMonthsPhoenix(currentMonthStart, 1);
  let filename = "earnings.csv";

  if (view === "month") {
    const ms = monthParam ? monthStartFromKeyPhoenix(monthParam) : null;
    const start = ms ?? currentMonthStart;
    fromUtc = start;
    toUtc = addMonthsPhoenix(start, 1);
    filename = `earnings_${monthParam ?? "month"}.csv`;
  }

  if (view === "ytd") {
    fromUtc = startOfYearPhoenix(now);
    toUtc = addMonthsPhoenix(currentMonthStart, 1);
    filename = "earnings_ytd.csv";
  }

  if (view === "range") {
    const f = parseYMD(rangeFromParam);
    const t = parseYMD(rangeToParam);
    const fUtc = f ? startOfDayFromYMDPhoenix(f) : startOfDayPhoenix(now);
    const tUtc0 = t ? startOfDayFromYMDPhoenix(t) : startOfDayPhoenix(now);
    const tUtc = new Date(tUtc0.getTime() + 24 * 60 * 60 * 1000);
    fromUtc = fUtc;
    toUtc = tUtc;
    filename = `earnings_${rangeFromParam ?? "from"}_${rangeToParam ?? "to"}.csv`;
  }

  if (view === "all") {
    const earliest = await db.payment.findFirst({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "asc" },
      select: { paidAt: true },
    });

    fromUtc = earliest?.paidAt
      ? startOfDayPhoenix(earliest.paidAt)
      : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    toUtc = new Date(startOfDayPhoenix(now).getTime() + 24 * 60 * 60 * 1000);
    filename = "earnings_all_time.csv";
  }

  const rows = await db.payment.findMany({
    where: { paidAt: { gte: fromUtc, lt: toUtc } },
    orderBy: { paidAt: "desc" },
    take: 50000,
    select: {
      id: true,
      paidAt: true,
      status: true,
      currency: true,
      amountSubtotalCents: true,
      amountTotalCents: true,
      bookingId: true,
      booking: {
        select: {
          id: true,
          pickupAt: true,
          pickupAddress: true,
          dropoffAddress: true,
          userId: true,
          user: { select: { name: true, email: true } },
          guestName: true,
          guestEmail: true,
          guestPhone: true,
        },
      },
    },
  });

  const header = [
    "paymentId",
    "paidAtUtc",
    "paymentStatus",
    "currency",
    "amountSubtotalCents",
    "amountTotalCents",
    "bookingId",
    "customerName",
    "customerEmail",
    "guestEmail",
    "guestPhone",
    "pickupAtUtc",
    "pickupAddress",
    "dropoffAddress",
  ].join(",");

  const lines = rows.map((p) => {
    const b = p.booking;
    const customerName =
      (b?.user?.name?.trim() || "").trim() ||
      (b?.guestName?.trim() || "").trim() ||
      "Customer";
    const customerEmail = (b?.user?.email || "").trim();
    const guestEmail = (b?.guestEmail || "").trim();
    const guestPhone = (b?.guestPhone || "").trim();

    const paidAtUtc = p.paidAt ? new Date(p.paidAt).toISOString() : "";
    const pickupAtUtc = b?.pickupAt ? new Date(b.pickupAt).toISOString() : "";

    return [
      csvEscape(String(p.id)),
      csvEscape(paidAtUtc),
      csvEscape(String(p.status)),
      csvEscape(String(p.currency ?? "")),
      csvEscape(String(p.amountSubtotalCents ?? 0)),
      csvEscape(String(p.amountTotalCents ?? 0)),
      csvEscape(String(b?.id ?? p.bookingId ?? "")),
      csvEscape(customerName),
      csvEscape(customerEmail),
      csvEscape(guestEmail),
      csvEscape(guestPhone),
      csvEscape(pickupAtUtc),
      csvEscape(b?.pickupAddress ?? ""),
      csvEscape(b?.dropoffAddress ?? ""),
    ].join(",");
  });

  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
