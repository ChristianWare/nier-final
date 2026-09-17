import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRASH_RETENTION_DAYS = 7;

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV === "development") return true;
  const auth = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET || "";
  return Boolean(cronSecret) && auth === `Bearer ${cronSecret}`;
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(
    Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  // Hard-delete expired trash — but NEVER a booking that has a payment
  // record. Those are accounting history; they stay in the trash.
  const purged = await db.booking.deleteMany({
    where: { deletedAt: { lt: cutoff }, payment: { is: null } },
  });

  const retainedWithPayments = await db.booking.count({
    where: { deletedAt: { lt: cutoff } },
  });

  return NextResponse.json({
    ok: true,
    purged: purged.count,
    retainedWithPayments,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
