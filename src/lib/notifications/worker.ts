import { db } from "@/lib/db";
import { sendSms } from "../sms/sendSms";
import { sendAdminNotificationEmail } from "../email/sendAdminNotificationEmail";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;

/**
 * Process pending notification jobs
 * Call this from a cron job or API route
 */
export async function processNotificationJobs() {
  // Get pending jobs (or failed jobs that haven't exceeded max attempts)
  const jobs = await db.notificationJob.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        {
          status: "FAILED",
          attempts: { lt: MAX_ATTEMPTS },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  if (jobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    // Mark as sending
    await db.notificationJob.update({
      where: { id: job.id },
      data: {
        status: "SENDING",
        attempts: { increment: 1 },
      },
    });

    try {
      if (job.channel === "EMAIL") {
        await sendAdminNotificationEmail({
          to: job.to,
          subject: job.subject || "Notification",
          text: job.body,
        });
      } else if (job.channel === "SMS") {
        await sendSms({
          to: job.to,
          body: job.body,
        });
      }

      // Mark as sent
      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
        },
      });

      succeeded++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error(
        `Failed to send ${job.channel} notification (job ${job.id}):`,
        errorMessage,
      );

      // Check if we've exceeded max attempts
      const newAttempts = job.attempts + 1;
      const newStatus = newAttempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING";

      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: newStatus,
          lastError: errorMessage,
        },
      });

      failed++;
    }
  }

  return {
    processed: jobs.length,
    succeeded,
    failed,
  };
}

/**
 * Process a single notification job by ID
 * Useful for retrying specific jobs
 */
export async function processNotificationJobById(jobId: string) {
  const job = await db.notificationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return { error: "Job not found" };
  }

  if (job.status === "SENT") {
    return { error: "Job already sent" };
  }

  // Mark as sending
  await db.notificationJob.update({
    where: { id: job.id },
    data: {
      status: "SENDING",
      attempts: { increment: 1 },
    },
  });

  try {
    if (job.channel === "EMAIL") {
      await sendAdminNotificationEmail({
        to: job.to,
        subject: job.subject || "Notification",
        text: job.body,
      });
    } else if (job.channel === "SMS") {
      await sendSms({
        to: job.to,
        body: job.body,
      });
    }

    await db.notificationJob.update({
      where: { id: job.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        lastError: null,
      },
    });

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db.notificationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        lastError: errorMessage,
      },
    });

    return { error: errorMessage };
  }
}
