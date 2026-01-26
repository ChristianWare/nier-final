import { Resend } from "resend";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function formatMoney(cents: number, currency: string) {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(n);
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

export async function sendPaymentLinkEmail(args: {
  to: string;
  name?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalCents: number;
  currency: string;
  payUrl: string;
  bookingId: string;
}) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const name = (args.name ?? "").trim();
  const firstName = name.split(" ")[0] || "there";
  const pickupDate = formatPickupDate(args.pickupAtISO);
  const pickupTime = formatPickupTime(args.pickupAtISO);
  const total = formatMoney(args.totalCents, args.currency);
  const confirmationCode = args.bookingId.slice(0, 8).toUpperCase();

  // ✅ Updated subject line indicating approval
  const subject = `✅ Booking Approved – Complete Your Payment | Nier Transportation`;

  // ✅ Brand colors from your globals.css
  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    accent: "#d0311e",
    accent600: "#b21a15",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    green: "#16a34a",
    darkGreen: "#0b7547",
    lightGreen: "rgba(22, 163, 74, 0.15)",
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Approved</title>
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

          <!-- Approval Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightGreen}; border: 1px solid ${colors.green}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkGreen}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✓ Booking Approved
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
                Hi ${firstName}!
              </h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                Great news – your reservation has been approved and is ready for payment. Complete your payment to confirm your ride.
              </p>
            </td>
          </tr>

          <!-- Trip Details Card -->
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Trip Details
                    </span>
                  </td>
                </tr>

                <!-- Confirmation Code -->
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Confirmation</span>
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
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Pickup Date & Time</span>
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

          <!-- Total Amount -->
          <tr>
            <td style="padding: 0 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 2px solid ${colors.stroke}; border-bottom: 2px solid ${colors.stroke};">
                <tr>
                  <td style="padding: 20px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <span style="color: ${colors.black}; font-size: 16px; font-weight: 600;">Amount Due</span>
                        </td>
                        <td align="right">
                          <span style="color: ${colors.black}; font-size: 28px; font-weight: 700; letter-spacing: -1px;">${total}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${args.payUrl}" target="_blank" style="display: inline-block; padding: 18px 48px; color: ${colors.white}; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">
                      Complete Payment →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tip Note -->
          <tr>
            <td style="padding: 0 32px 24px 32px; text-align: center;">
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                You'll have the option to add a tip for your driver during checkout.
              </p>
            </td>
          </tr>

          <!-- Fallback Link -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 12px;">
                Button not working? Copy and paste this link:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${args.payUrl}" style="color: ${colors.accent}; text-decoration: underline;">${args.payUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                Questions? Reply to this email or contact us anytime.
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
    "✅ BOOKING APPROVED",
    "",
    `Hi ${firstName}!`,
    "",
    "Great news – your reservation has been approved and is ready for payment.",
    "Complete your payment to confirm your ride.",
    "",
    "───────────────────────────────────────",
    "TRIP DETAILS",
    "───────────────────────────────────────",
    "",
    `Confirmation: ${confirmationCode}`,
    "",
    `📅 Pickup Date: ${pickupDate}`,
    `⏰ Pickup Time: ${pickupTime}`,
    "",
    `📍 Pickup: ${args.pickupAddress}`,
    `🏁 Dropoff: ${args.dropoffAddress}`,
    "",
    "───────────────────────────────────────",
    `AMOUNT DUE: ${total}`,
    "───────────────────────────────────────",
    "",
    "Complete your payment here:",
    args.payUrl,
    "",
    "(You'll have the option to add a tip for your driver during checkout)",
    "",
    "───────────────────────────────────────",
    "",
    "Questions? Reply to this email or contact us anytime.",
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
