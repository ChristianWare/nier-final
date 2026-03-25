import { Resend } from "resend";
import { getCompanySettings } from "../../../actions/admin/companySettings";

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
    maximumFractionDigits: 2,
  }).format(n);
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

export async function sendDriverAssignedEmail(args: {
  to: string;
  driverName?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  bookingId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleName?: string | null;
  vehiclePlate?: string | null;
  driverPaymentCents?: number | null;
  tipCents?: number | null;
  currency?: string;
  specialRequests?: string | null;
  passengers?: number | null;
  luggage?: number | null;
  serviceName?: string | null;
  dashboardUrl?: string;
}) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const driverName = (args.driverName ?? "").trim();
  const firstName = driverName.split(" ")[0] || "Driver";
  const { timezone: companyTz } = await getCompanySettings();
  const pickupDate = formatPickupDate(args.pickupAtISO, companyTz);
  const pickupTime = formatPickupTime(args.pickupAtISO, companyTz);
  const confirmationCode = args.bookingId.slice(0, 8).toUpperCase();
  const currency = args.currency || "usd";

  const customerName = args.customerName?.trim() || "Customer";
  const customerPhone = args.customerPhone?.trim() || null;
  const vehicleName = args.vehicleName?.trim() || null;
  const vehiclePlate = args.vehiclePlate?.trim() || null;
  const specialRequests = args.specialRequests?.trim() || null;
  const passengers = args.passengers ?? null;
  const luggage = args.luggage ?? null;
  const serviceName = args.serviceName?.trim() || null;

  const driverPayment = args.driverPaymentCents
    ? formatMoney(args.driverPaymentCents, currency)
    : null;
  const tipAmount = args.tipCents ? formatMoney(args.tipCents, currency) : null;
  const totalEarnings =
    args.driverPaymentCents || args.tipCents
      ? formatMoney(
          (args.driverPaymentCents ?? 0) + (args.tipCents ?? 0),
          currency,
        )
      : null;

  const dashboardUrl =
    args.dashboardUrl ||
    `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/driver-dashboard/trips/${args.bookingId}`;

  const subject = `🚗 New Trip Assigned – ${pickupDate} | Nier Transportation`;

  // Brand colors
  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    accent: "#d0311e",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    blue: "#2563eb",
    darkBlue: "#1d4ed8",
    lightBlue: "rgba(37, 99, 235, 0.1)",
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
  <title>New Trip Assigned</title>
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

          <!-- Assignment Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightBlue}; border: 1px solid ${colors.blue}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkBlue}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      🚗 New Trip Assigned
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
                You've been assigned a new trip. Please review the details below and be ready for pickup.
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

          <!-- Customer Info Card -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Customer Information
                    </span>
                  </td>
                </tr>

                <!-- Customer Name -->
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">👤</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Customer</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${customerName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${
                  customerPhone
                    ? `
                <!-- Customer Phone -->
                <tr>
                  <td style="padding: 0 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">📞</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Phone</span>
                          <br>
                          <a href="tel:${customerPhone.replace(/[^0-9+]/g, "")}" style="color: ${colors.blue}; font-size: 15px; font-weight: 600; text-decoration: none;">${customerPhone}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : ""
                }

                ${
                  passengers || luggage
                    ? `
                <!-- Passengers & Luggage -->
                <tr>
                  <td style="padding: 0 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🧳</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Passengers / Luggage</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${passengers ?? "—"} passengers • ${luggage ?? "—"} luggage</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : ""
                }

              </table>
            </td>
          </tr>

          ${
            vehicleName || serviceName
              ? `
          <!-- Vehicle & Service Card -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Vehicle & Service
                    </span>
                  </td>
                </tr>

                ${
                  vehicleName
                    ? `
                <!-- Vehicle -->
                <tr>
                  <td style="padding: 16px 20px ${serviceName ? "12px" : "16px"} 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🚐</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Vehicle</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${vehicleName}${vehiclePlate ? ` (${vehiclePlate})` : ""}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : ""
                }

                ${
                  serviceName
                    ? `
                <!-- Service -->
                <tr>
                  <td style="padding: ${vehicleName ? "0" : "16px"} 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">✨</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Service Type</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${serviceName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : ""
                }

              </table>
            </td>
          </tr>
          `
              : ""
          }

          ${
            specialRequests
              ? `
          <!-- Special Requests -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <span style="color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
                      ⚠️ Special Requests
                    </span>
                    <span style="color: #78350f; font-size: 15px; line-height: 1.5;">
                      ${specialRequests}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          `
              : ""
          }

          ${
            driverPayment || tipAmount
              ? `
          <!-- Earnings Card -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.lightGreen}; border: 1px solid ${colors.green}; border-radius: 12px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid rgba(22, 163, 74, 0.2);">
                    <span style="color: ${colors.darkGreen}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      💵 Your Earnings
                    </span>
                  </td>
                </tr>

                <!-- Earnings Breakdown -->
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${
                        driverPayment
                          ? `
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: ${colors.paragraph}; font-size: 14px;">Company Payment</span>
                        </td>
                        <td align="right" style="padding-bottom: 8px;">
                          <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">${driverPayment}</span>
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        tipAmount
                          ? `
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="color: ${colors.paragraph}; font-size: 14px;">Customer Tip</span>
                        </td>
                        <td align="right" style="padding-bottom: 8px;">
                          <span style="color: ${colors.green}; font-size: 14px; font-weight: 600;">${tipAmount}</span>
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      ${
                        totalEarnings && (driverPayment || tipAmount)
                          ? `
                      <tr>
                        <td colspan="2" style="padding-top: 8px; border-top: 1px solid rgba(22, 163, 74, 0.3);">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-top: 8px;">
                                <span style="color: ${colors.darkGreen}; font-size: 16px; font-weight: 700;">Total Earnings</span>
                              </td>
                              <td align="right" style="padding-top: 8px;">
                                <span style="color: ${colors.darkGreen}; font-size: 20px; font-weight: 700;">${totalEarnings}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `
                          : ""
                      }
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
          `
              : ""
          }

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 16px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 18px 48px; color: ${colors.white}; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">
                      View Trip Details →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Reminder -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                Please arrive at the pickup location on time. Contact the customer if you have any questions.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                Questions? Reply to this email or contact dispatch.
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
    "🚗 NEW TRIP ASSIGNED",
    "",
    `Hi ${firstName}!`,
    "",
    "You've been assigned a new trip. Please review the details below.",
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
    "CUSTOMER INFORMATION",
    "───────────────────────────────────────",
    "",
    `👤 Customer: ${customerName}`,
    ...(customerPhone ? [`📞 Phone: ${customerPhone}`] : []),
    ...(passengers || luggage
      ? [`🧳 Passengers/Luggage: ${passengers ?? "—"} / ${luggage ?? "—"}`]
      : []),
    "",
    ...(vehicleName || serviceName
      ? [
          "───────────────────────────────────────",
          "VEHICLE & SERVICE",
          "───────────────────────────────────────",
          "",
          ...(vehicleName
            ? [
                `🚐 Vehicle: ${vehicleName}${vehiclePlate ? ` (${vehiclePlate})` : ""}`,
              ]
            : []),
          ...(serviceName ? [`✨ Service: ${serviceName}`] : []),
          "",
        ]
      : []),
    ...(specialRequests
      ? [
          "───────────────────────────────────────",
          "⚠️ SPECIAL REQUESTS",
          "───────────────────────────────────────",
          "",
          specialRequests,
          "",
        ]
      : []),
    ...(driverPayment || tipAmount
      ? [
          "───────────────────────────────────────",
          "💵 YOUR EARNINGS",
          "───────────────────────────────────────",
          "",
          ...(driverPayment ? [`Company Payment: ${driverPayment}`] : []),
          ...(tipAmount ? [`Customer Tip: ${tipAmount}`] : []),
          ...(totalEarnings ? [`TOTAL: ${totalEarnings}`] : []),
          "",
        ]
      : []),
    "───────────────────────────────────────",
    "",
    "View your trip details:",
    dashboardUrl,
    "",
    "Please arrive at the pickup location on time.",
    "Contact the customer if you have any questions.",
    "",
    "───────────────────────────────────────",
    "",
    "Questions? Reply to this email or contact dispatch.",
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
