import { NextResponse } from "next/server";
import { processPendingNotificationJobs } from "@/lib/notifications/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const auth = req.headers.get("authorization") || "";

  // Prefer Vercel's built-in CRON_SECRET, but allow your custom name too.
  const cronSecret = process.env.CRON_SECRET || "";
  const legacySecret = process.env.NOTIFICATIONS_CRON_SECRET || "";

  const okCron = cronSecret && auth === `Bearer ${cronSecret}`;
  const okLegacy = legacySecret && auth === `Bearer ${legacySecret}`;

  return okCron || okLegacy;
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await processPendingNotificationJobs({ limit: 50 });
  return NextResponse.json({ ok: true, ...res });
}

// ✅ Vercel Cron uses GET
export async function GET(req: Request) {
  return handle(req);
}

// ✅ Keep POST for manual/testing if you want
export async function POST(req: Request) {
  return handle(req);
}
