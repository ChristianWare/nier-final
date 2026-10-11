// Rider-facing trip updates, sent by email when the driver (or an admin)
// moves a trip to En route, Arrived or No-show.
//
// Email only: this app sends riders nothing by text. (Admins can opt into
// text alerts, delivered through their carrier's email gateway; see
// src/lib/notifications/queue.ts.) The "trip completed" thank-you is handled
// by the review request in src/lib/reminders/reviewRequests.ts.

import type { BookingStatus } from "@prisma/client";
import { sendEmail, tripStatusEmail } from "@/lib/email/sendReminderEmails";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { companyDisplayName } from "@/lib/companyName";

type CustomerNotificationArgs = {
  status: BookingStatus;
  customerEmail: string;
  customerName: string;
  pickupAddress: string;
  driverName: string;
};

export async function sendCustomerTripNotification(
  args: CustomerNotificationArgs,
): Promise<{ sent: boolean; error?: string }> {
  const to = (args.customerEmail ?? "").trim().toLowerCase();
  if (!to) return { sent: false, error: "No customer email" };

  try {
    const settings = await getCompanySettings();
    const content = tripStatusEmail({
      company: companyDisplayName(settings),
      name: args.customerName,
      status: args.status,
      pickupAddress: args.pickupAddress,
      driverName: args.driverName,
      supportPhone: settings.dispatchPhone ?? null,
    });
    if (!content) return { sent: false }; // nothing to say for this status

    await sendEmail(to, content);
    console.log(`[CustomerNotification] Sent ${args.status} email to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error("[CustomerNotification] Failed to send email:", err);
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
