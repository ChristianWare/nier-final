import { Resend } from "resend";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function formatPickupDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatPickupTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export async function sendBookingDeclinedEmail(args: {
  to: string;
  name?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  bookingId: string;
  declineReason?: string | null;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const name = (args.name ?? "").trim();
  const firstName = name.split(" ")[0] || "there";
  const pickupDate = formatPickupDate(args.pickupAtISO);
  const pickupTime = formatPickupTime(args.pickupAtISO);
  const confirmationCode = args.bookingId.slice(0, 8).toUpperCase();
  const declineReason = args.declineReason?.trim() || null;
  const contactEmail = args.contactEmail || "support@niertransportation.com";
  const contactPhone = args.contactPhone || null;

  const subject = `Booking Update – Unable to Accommodate Your Request | Nier Transportation`;

  // Brand colors
  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    accent: "#d0311e",
    accent600: "#b21a15",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    red: "#dc2626",
    darkRed: "#991b1b",
    lightRed: "rgba(220, 38, 38, 0.1)",
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: ${colors.black}; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: ${colors.white}; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">
                NIER TRANSPORTATION
              </h1>
            </td>
          </tr>

          <!-- Status Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightRed}; border: 1px solid ${colors.red}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkRed}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Unable to Accommodate
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 32px 0 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: ${colors.black}; font-size: 26px; font-weight: 600; letter-spacing: -1px; line-height: 1.2;">
                Hi ${firstName},
              </h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.6;">
                Thank you for considering Nier Transportation. Unfortunately, we are unable to accommodate your booking request at this time.
              </p>
            </td>
          </tr>

          ${
            declineReason
              ? `
          <!-- Reason Box -->
          <tr>
            <td style="padding: 24px 32px 0 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.lightRed}; border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="color: ${colors.darkRed}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
                      Reason
                    </span>
                    <span style="color: ${colors.black}; font-size: 15px; line-height: 1.5;">
                      ${declineReason}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Trip Details Card -->
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Request Details
                    </span>
                  </td>
                </tr>

                <!-- Confirmation Code -->
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Reference</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${confirmationCode}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Date & Time -->
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">📅</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Requested Date & Time</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${pickupDate}</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${pickupTime}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Pickup Location -->
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">📍</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Pickup</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${args.pickupAddress}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Dropoff Location -->
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🏁</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Dropoff</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${args.dropoffAddress}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- What's Next -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid ${colors.stroke}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="color: ${colors.black}; font-size: 14px; font-weight: 700; display: block; margin-bottom: 12px;">
                      💡 What's Next?
                    </span>
                    <ul style="margin: 0; padding-left: 20px; color: ${colors.paragraph}; font-size: 14px; line-height: 1.7;">
                      <li style="margin-bottom: 8px;">If you'd like to request a different date or time, please submit a new booking request.</li>
                      <li style="margin-bottom: 8px;">Have questions? Reply to this email and we'll be happy to help.</li>
                      <li>We appreciate your understanding and hope to serve you in the future.</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contact Section -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0 0 16px 0; color: ${colors.paragraph}; font-size: 14px;">
                Need assistance? We're here to help.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="mailto:${contactEmail}" target="_blank" style="display: inline-block; padding: 14px 32px; color: ${colors.white}; font-size: 14px; font-weight: 600; text-decoration: none;">
                      Contact Us
                    </a>
                  </td>
                </tr>
              </table>
              ${
                contactPhone
                  ? `
              <p style="margin: 16px 0 0 0; color: ${colors.paragraph}; font-size: 13px;">
                or call us at <a href="tel:${contactPhone.replace(/[^0-9+]/g, "")}" style="color: ${colors.black}; font-weight: 600; text-decoration: none;">${contactPhone}</a>
              </p>
              `
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                We sincerely apologize for any inconvenience this may cause.
              </p>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 12px; opacity: 0.7;">
                © ${new Date().getFullYear()} Nier Transportation. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();

  // Plain text version
  const text = [
    "═══════════════════════════════════════",
    "NIER TRANSPORTATION",
    "═══════════════════════════════════════",
    "",
    "BOOKING UPDATE",
    "",
    `Hi ${firstName},`,
    "",
    "Thank you for considering Nier Transportation. Unfortunately, we are",
    "unable to accommodate your booking request at this time.",
    "",
    ...(declineReason
      ? ["───────────────────────────────────────", `REASON: ${declineReason}`, ""]
      : []),
    "───────────────────────────────────────",
    "YOUR REQUEST DETAILS",
    "───────────────────────────────────────",
    "",
    `Reference: ${confirmationCode}`,
    "",
    `📅 Requested Date: ${pickupDate}`,
    `⏰ Requested Time: ${pickupTime}`,
    "",
    `📍 Pickup: ${args.pickupAddress}`,
    `🏁 Dropoff: ${args.dropoffAddress}`,
    "",
    "───────────────────────────────────────",
    "WHAT'S NEXT?",
    "───────────────────────────────────────",
    "",
    "• If you'd like to request a different date or time, please submit",
    "  a new booking request.",
    "",
    "• Have questions? Reply to this email and we'll be happy to help.",
    "",
    "• We appreciate your understanding and hope to serve you in the future.",
    "",
    "───────────────────────────────────────",
    "",
    "Need assistance? Contact us:",
    `Email: ${contactEmail}`,
    ...(contactPhone ? [`Phone: ${contactPhone}`] : []),
    "",
    "We sincerely apologize for any inconvenience this may cause.",
    "",
    `© ${new Date().getFullYear()} Nier Transportation`,
  ].join("\n");

  await resend.emails.send({
    from,
    to: args.to,
    subject,
    html,
    text,
  });
}