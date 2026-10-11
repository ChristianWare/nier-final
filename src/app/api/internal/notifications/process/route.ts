import { processRideReminders } from "@/lib/reminders/rideReminders";
import { processReviewRequests } from "@/lib/reminders/reviewRequests";
import { NextResponse } from "next/server";
import { processPendingNotificationJobs } from "@/lib/notifications/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  // Skip auth in development for easy testing
  if (process.env.NODE_ENV === "development") return true;

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

  // Trip and payment reminders for customers, and "needs attention" alerts
  // for admins. A failure here never stops the notifications above.
  let reminders: Record<string, number> | { error: true } = { error: true };
  try {
    reminders = await processRideReminders();
  } catch (e) {
    console.error("Ride reminders failed:", e);
  }

  // Google review request ~2 hours after a ride is completed. Off until
  // GOOGLE_REVIEW_URL is set; a failure never stops anything above.
  let reviews:
    Awaited<ReturnType<typeof processReviewRequests>> | { error: true } = {
    error: true,
  };
  try {
    reviews = await processReviewRequests();
  } catch (e) {
    console.error("Review requests failed:", e);
  }
  return NextResponse.json({ ok: true, ...res, reminders, reviews });
}

// ✅ Vercel Cron uses GET
export async function GET(req: Request) {
  return handle(req);
}

// ✅ Keep POST for manual/testing if you want
export async function POST(req: Request) {
  return handle(req);
}
