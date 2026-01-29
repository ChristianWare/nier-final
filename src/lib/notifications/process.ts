/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { sendAdminNotificationEmail } from "@/lib/email/sendAdminNotificationEmail";
import { sendSms } from "@/lib/sms/sendSms";
import { getSmsFromNumber } from "../../../actions/admin/companySettings";

export async function processPendingNotificationJobs(args?: {
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(args?.limit ?? 25, 100));

  // Get the client's SMS from number (or null to use env default)
  const smsFromNumber = await getSmsFromNumber();

  // claim jobs (simple v1 claim; good enough for single worker)
  const jobs = await db.notificationJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  if (jobs.length === 0) return { processed: 0 };

  // mark them SENDING
  await db.notificationJob.updateMany({
    where: { id: { in: jobs.map((j) => j.id) }, status: "PENDING" },
    data: { status: "SENDING", attempts: { increment: 1 } as any },
  });

  let ok = 0;
  for (const j of jobs) {
    try {
      if (j.channel === "EMAIL") {
        await sendAdminNotificationEmail({
          to: j.to,
          subject: j.subject ?? "Nier Notification",
          text: j.body,
        });
      } else if (j.channel === "SMS") {
        await sendSms({
          to: j.to,
          body: j.body,
          from: smsFromNumber || undefined, // Use client's number or env default
        });
      }

      await db.notificationJob.update({
        where: { id: j.id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      ok += 1;
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);

      // retry a few times then fail
      const next = (j.attempts ?? 0) + 1;
      const isFinal = next >= 5;

      await db.notificationJob.update({
        where: { id: j.id },
        data: { status: isFinal ? "FAILED" : "PENDING", lastError: msg },
      });
    }
  }

  return { processed: jobs.length, sent: ok };
}
