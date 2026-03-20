/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/email/sendBookingRequestedEmail.ts
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { getBookingEstimateData } from "../../../actions/bookings/getBookingEstimateData";
import EstimatePDF from "@/lib/invoice/EstimatePDF";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function formatPickupDate(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatPickupTime(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export async function sendBookingRequestedEmail(args: {
  to: string;
  name?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName: string;
  passengers: number;
  luggage: number;
  bookingId: string;
  trackingUrl?: string | null;
}) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const name = (args.name ?? "").trim();
  const firstName = name.split(" ")[0] || "there";
  const { timezone: companyTz } = await getCompanySettings();
  const pickupDate = formatPickupDate(args.pickupAtISO, companyTz);
  const pickupTime = formatPickupTime(args.pickupAtISO, companyTz);
  const confirmationCode = args.bookingId.slice(0, 8).toUpperCase();

  const subject = `📨 Request Received – ${pickupDate} | Nier Transportation`;

  // ── Generate estimate PDF attachment ──
  let pdfAttachment: { filename: string; content: Buffer } | undefined;

  try {
    const estimateResult = await getBookingEstimateData(args.bookingId);
    if (estimateResult.ok) {
      const pdfBuffer = await renderToBuffer(
        createElement(EstimatePDF, { invoice: estimateResult.data }) as any,
      );
      pdfAttachment = {
        filename: `estimate-${confirmationCode}.pdf`,
        content: Buffer.from(pdfBuffer),
      };
    }
  } catch (e) {
    // Non-critical — log but don't fail the email
    console.error(
      "[sendBookingRequestedEmail] Estimate PDF generation failed:",
      e,
    );
  }

  // Brand colors
  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    accent: "#d0311e",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    blue: "#2563eb",
    lightBlue: "rgba(37, 99, 235, 0.1)",
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
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
                    <span style="color: ${colors.blue}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📨 Request Received</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 0 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: ${colors.black}; font-size: 26px; font-weight: 600; letter-spacing: -1px; line-height: 1.2;">Hi ${firstName}!</h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                Thank you for your reservation request! We've received your booking and our team will review it shortly.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Trip Details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Confirmation</span><br>
                    <span style="color: ${colors.black}; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${confirmationCode}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">📅</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Pickup Date & Time</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${pickupDate}</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${pickupTime}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">🚗</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Service & Vehicle</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${args.serviceName} • ${args.vehicleName}</span><br>
                          <span style="color: ${colors.paragraph}; font-size: 13px;">${args.passengers} passenger${args.passengers !== 1 ? "s" : ""} • ${args.luggage} bag${args.luggage !== 1 ? "s" : ""}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">📍</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Pickup</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${args.pickupAddress}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">🏁</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Dropoff</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${args.dropoffAddress}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            pdfAttachment
              ? `
          <!-- Estimate notice -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.6;">
                      📄 <strong>Your price estimate is attached</strong> to this email. If you need internal approval before paying, you can share the attached PDF with your team.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 16px 0; color: ${colors.black}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">What Happens Next?</h3>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="32" valign="top">
                          <div style="width: 24px; height: 24px; background-color: #22c55e; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: 700;">✓</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">Request Received</span><br>
                          <span style="color: ${colors.paragraph}; font-size: 13px;">We've got your booking request</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="32" valign="top">
                          <div style="width: 24px; height: 24px; background-color: ${colors.blue}; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: 700;">2</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">Review</span><br>
                          <span style="color: ${colors.paragraph}; font-size: 13px;">Our team reviews within 24 hours</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="32" valign="top">
                          <div style="width: 24px; height: 24px; background-color: #94a3b8; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: 700;">3</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">Payment Link</span><br>
                          <span style="color: ${colors.paragraph}; font-size: 13px;">Once approved, we'll email you a secure payment link</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="32" valign="top">
                          <div style="width: 24px; height: 24px; background-color: #94a3b8; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: 700;">4</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">Confirmed!</span><br>
                          <span style="color: ${colors.paragraph}; font-size: 13px;">After payment, your ride is confirmed</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            args.trackingUrl
              ? `
          <tr>
            <td style="padding: 0 32px 28px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${args.trackingUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: ${colors.white}; font-size: 15px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">Track Your Request →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <tr>
            <td style="padding: 0 32px 28px 32px; text-align: center;">
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5; background-color: #fef3c7; padding: 12px 16px; border-radius: 8px; border: 1px solid #fcd34d;">
                ⏰ <strong>No payment required yet.</strong> We'll send you a payment link after we review and approve your request.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">Questions? Reply to this email or contact us anytime.</p>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 12px; opacity: 0.7;">© ${new Date().getFullYear()} Nier Transportation. All rights reserved.</p>
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
    "📨 REQUEST RECEIVED",
    "",
    `Hi ${firstName}!`,
    "",
    "Thank you for your reservation request! We've received your booking",
    "and our team will review it shortly.",
    "",
    `Confirmation: ${confirmationCode}`,
    "",
    `📅 Pickup Date: ${pickupDate}`,
    `⏰ Pickup Time: ${pickupTime}`,
    "",
    `🚗 Service: ${args.serviceName} • ${args.vehicleName}`,
    `   ${args.passengers} passenger${args.passengers !== 1 ? "s" : ""} • ${args.luggage} bag${args.luggage !== 1 ? "s" : ""}`,
    "",
    `📍 Pickup: ${args.pickupAddress}`,
    `🏁 Dropoff: ${args.dropoffAddress}`,
    "",
    pdfAttachment ? "📄 Your price estimate is attached to this email." : "",
    "",
    "WHAT HAPPENS NEXT?",
    "✓ Request Received",
    "2. Review - Our team reviews within 24 hours",
    "3. Payment Link - Once approved, we'll email you a secure payment link",
    "4. Confirmed! - After payment, your ride is confirmed",
    "",
    "⏰ No payment required yet.",
    "",
    args.trackingUrl ? `Track your request: ${args.trackingUrl}` : "",
    "",
    `© ${new Date().getFullYear()} Nier Transportation`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  await resend.emails.send({
    from,
    to: args.to,
    subject,
    html,
    text,
    ...(pdfAttachment
      ? {
          attachments: [
            {
              filename: pdfAttachment.filename,
              content: pdfAttachment.content,
            },
          ],
        }
      : {}),
  });
}
