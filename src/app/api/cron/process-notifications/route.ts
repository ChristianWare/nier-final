import { NextRequest, NextResponse } from "next/server";
import { processNotificationJobs } from "@/lib/notifications/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cron/process-notifications
 *
 * Processes pending notification jobs (sends emails/SMS).
 *
 * Call this from:
 * - Vercel Cron (vercel.json)
 * - External cron service (e.g., cron-job.org)
 * - Manually for testing
 *
 * Security: Use CRON_SECRET to prevent unauthorized access
 */
export async function POST(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processNotificationJobs();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to process notifications:", error);

    return NextResponse.json(
      {
        error: "Failed to process notifications",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Also support GET for easy testing in browser
export async function GET(req: NextRequest) {
  return POST(req);
}
