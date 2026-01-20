import { NextResponse } from "next/server";
import { processPendingNotificationJobs } from "@/lib/notifications/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await processPendingNotificationJobs({ limit: 50 });
  return NextResponse.json({ ok: true, ...res });
}
