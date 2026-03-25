"use server";

// src/actions/admin/sendEstimateEmail.ts

import { Resend } from "resend";
// import { renderToBuffer } from "@react-pdf/renderer";
// import { createElement } from "react";
import { auth } from "../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "./companySettings";
import { getBookingEstimateData } from "../bookings/getBookingEstimateData";
// import EstimatePDF from "@/lib/invoice/EstimatePDF";
import { revalidatePath } from "next/cache";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

export async function sendEstimateEmail(formData: FormData): Promise<{
  success?: true;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const bookingId = formData.get("bookingId")?.toString().trim();
  const overrideEmail =
    formData.get("overrideEmail")?.toString().trim() || null;

  if (!bookingId) return { error: "Missing booking ID" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      user: { select: { email: true, name: true } },
      guestEmail: true,
      guestName: true,
    },
  });

  if (!booking) return { error: "Booking not found" };

  const recipientEmail =
    overrideEmail ?? booking.user?.email ?? booking.guestEmail ?? null;

  if (!recipientEmail) {
    return { error: "No email address found for this booking." };
  }

  if (!isValidEmail(recipientEmail)) {
    return { error: "Invalid email address." };
  }

  const recipientName =
    booking.user?.name?.trim() || booking.guestName?.trim() || "there";
  const firstName = recipientName.split(" ")[0] || "there";

  const result = await getBookingEstimateData(bookingId);
  if (!result.ok) return { error: result.error };

  const companySettings = await getCompanySettings();
  const companyName = companySettings.officeName || "Nier Transportation";
  const confirmationCode = bookingId.slice(0, 8).toUpperCase();
  const estimatedTotal = formatMoney(
    result.data.totalCents,
    result.data.currency ?? "usd",
  );

  const pdfRes = await fetch(
    `${requireEnv("APP_URL").replace(/\/$/, "")}/api/estimate/${bookingId}/download`,
  );
  if (!pdfRes.ok) return { error: "Failed to generate estimate PDF." };
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    blue: "#1e40af",
    lightBlue: "#dbeafe",
    darkBlue: "#1e3a8a",
    warning: "#f59e0b",
    warningLight: "#fffbeb",
    warningDark: "#92400e",
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Estimate</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: ${colors.black}; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: ${colors.white}; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">NIER TRANSPORTATION</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightBlue}; border: 1px solid ${colors.blue}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkBlue}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📄 Trip Estimate</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 28px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: ${colors.black}; font-size: 26px; font-weight: 600; letter-spacing: -1px; line-height: 1.2;">Hi ${firstName}!</h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                Please find your trip estimate attached to this email. Share it with your team or company for approval.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Estimate Summary</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Reference #</span><br>
                    <span style="color: ${colors.black}; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${confirmationCode}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 10px 0; border-top: 1px solid ${colors.stroke};">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td><span style="color: ${colors.paragraph}; font-size: 14px;">Estimated Total</span></td>
                              <td align="right"><span style="color: ${colors.black}; font-size: 20px; font-weight: 700;">${estimatedTotal}</span></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.warningLight}; border: 1px solid ${colors.warning}; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: ${colors.warningDark}; font-size: 14px; line-height: 1.6;">
                      <strong>⚠ Please note:</strong> This is a non-binding estimate. The final price may vary based on
                      actual trip duration, route changes, additional stops, or other factors. A confirmed invoice will
                      be issued after payment is complete.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">What Happens Next?</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr><td style="padding: 4px 0;"><span style="color: #0c4a6e; font-size: 14px; line-height: 1.5;">1. &nbsp;Share this estimate with your team for approval</span></td></tr>
                      <tr><td style="padding: 4px 0;"><span style="color: #0c4a6e; font-size: 14px; line-height: 1.5;">2. &nbsp;We'll review your booking and send a payment link</span></td></tr>
                      <tr><td style="padding: 4px 0;"><span style="color: #0c4a6e; font-size: 14px; line-height: 1.5;">3. &nbsp;Once paid, your ride is confirmed</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">Questions? Reply to this email or contact us anytime.</p>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 12px; opacity: 0.7;">
                ${companyName} &nbsp;·&nbsp; ${companySettings.supportEmail ?? ""} &nbsp;·&nbsp; ${companySettings.dispatchPhone ?? ""}
              </p>
              <p style="margin: 8px 0 0 0; color: ${colors.paragraph}; font-size: 12px; opacity: 0.7;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = [
    "NIER TRANSPORTATION",
    "",
    "TRIP ESTIMATE",
    "",
    `Hi ${firstName},`,
    "Please find your trip estimate attached to this email.",
    "Share it with your team or company for approval.",
    "",
    `Reference #: ${confirmationCode}`,
    `Estimated Total: ${estimatedTotal}`,
    "",
    "PLEASE NOTE: This is a non-binding estimate. The final price may vary.",
    "",
    "WHAT HAPPENS NEXT:",
    "1. Share this estimate with your team for approval",
    "2. We'll review your booking and send a payment link",
    "3. Once paid, your ride is confirmed",
    "",
    `Questions? Contact us at ${companySettings.supportEmail ?? ""} or ${companySettings.dispatchPhone ?? ""}`,
    "",
    `© ${new Date().getFullYear()} ${companyName}`,
  ].join("\n");

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  await resend.emails.send({
    from,
    to: recipientEmail,
    subject: `Trip Estimate — ${companyName} (Ref #${confirmationCode})`,
    html,
    text,
    attachments: [
      {
        filename: `estimate-${confirmationCode}.pdf`,
        content: Buffer.from(pdfBuffer),
      },
    ],
  });

  // Log in activity timeline
  await db.bookingStatusEvent.create({
    data: {
      bookingId,
      status: booking.status,
      eventType: "ESTIMATE_SENT",
      metadata: {
        recipientEmail,
        estimatedTotalCents: result.data.totalCents,
        isOverrideEmail: Boolean(overrideEmail),
      },
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
