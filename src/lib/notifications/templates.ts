import { NotificationEvent } from "./events";
import { formatPhoenixDateTime, safeOneLine } from "./format";

// ✅ Brand colors from globals.css
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
  blue: "#3b82f6",
  darkBlue: "#1d4ed8",
  lightBlue: "rgba(59, 130, 246, 0.15)",
  yellow: "#f59e0b",
  darkYellow: "#d97706",
  lightYellow: "rgba(245, 158, 11, 0.15)",
  red: "#ef4444",
  darkRed: "#dc2626",
  lightRed: "rgba(239, 68, 68, 0.15)",
};

// Event to badge color mapping
const eventBadgeColors: Record<
  NotificationEvent,
  { bg: string; border: string; text: string }
> = {
  BOOKING_REQUESTED: {
    bg: colors.lightBlue,
    border: colors.blue,
    text: colors.darkBlue,
  },
  BOOKING_DECLINED: {
    bg: colors.lightRed,
    border: colors.red,
    text: colors.darkRed,
  },
  PAYMENT_LINK_SENT: {
    bg: colors.lightYellow,
    border: colors.yellow,
    text: colors.darkYellow,
  },
  PAYMENT_RECEIVED: {
    bg: colors.lightGreen,
    border: colors.green,
    text: colors.darkGreen,
  },
  DRIVER_ASSIGNED: {
    bg: colors.lightBlue,
    border: colors.blue,
    text: colors.darkBlue,
  },
  DRIVER_EN_ROUTE: {
    bg: colors.lightYellow,
    border: colors.yellow,
    text: colors.darkYellow,
  },
  DRIVER_ARRIVED: {
    bg: colors.lightGreen,
    border: colors.green,
    text: colors.darkGreen,
  },
  DRIVER_PICKED_UP: {
    bg: colors.lightGreen,
    border: colors.green,
    text: colors.darkGreen,
  },
  TRIP_COMPLETED: {
    bg: colors.lightGreen,
    border: colors.green,
    text: colors.darkGreen,
  },
  BOOKING_CANCELLED: {
    bg: colors.lightRed,
    border: colors.red,
    text: colors.darkRed,
  },
  NO_SHOW: {
    bg: colors.lightRed,
    border: colors.red,
    text: colors.darkRed,
  },
  REFUND_ISSUED: {
    bg: colors.lightYellow,
    border: colors.yellow,
    text: colors.darkYellow,
  },
};

// Event to emoji mapping
const eventEmoji: Record<NotificationEvent, string> = {
  BOOKING_REQUESTED: "🔔",
  BOOKING_DECLINED: "❌",
  PAYMENT_LINK_SENT: "💳",
  PAYMENT_RECEIVED: "✅",
  DRIVER_ASSIGNED: "🚗",
  DRIVER_EN_ROUTE: "🛣️",
  DRIVER_ARRIVED: "📍",
  DRIVER_PICKED_UP: "👋",
  TRIP_COMPLETED: "🏁",
  BOOKING_CANCELLED: "🚫",
  NO_SHOW: "🚷",
  REFUND_ISSUED: "💰",
};

export function buildAdminNotification(args: {
  event: NotificationEvent;
  appUrl: string;
  timeZone: string;
  booking: {
    id: string;
    pickupAt: Date;
    pickupAddress: string;
    dropoffAddress: string;
    serviceName: string;
    customerName: string;
    totalCents?: number | null;
    currency?: string | null;
    legCount?: number | null;
  };
}) {
  const { event, appUrl, timeZone, booking } = args;

  const when = formatPhoenixDateTime(new Date(booking.pickupAt), timeZone);
  const pickup = safeOneLine(booking.pickupAddress);
  const dropoff = safeOneLine(booking.dropoffAddress);
  const svc = safeOneLine(booking.serviceName);
  const name = safeOneLine(booking.customerName);
  const confirmationCode = booking.id.slice(0, 8).toUpperCase();

  // Quoted total, e.g. "$95" or "$95.50". Empty string when there's no
  // price yet, so it drops cleanly out of the joined lines below.
  const money =
    typeof booking.totalCents === "number" && booking.totalCents > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: (booking.currency || "usd").toUpperCase(),
          minimumFractionDigits: booking.totalCents % 100 === 0 ? 0 : 2,
        }).format(booking.totalCents / 100)
      : "";

  // "Sunday - 10/18/26 at 5:00 AM" — the pickup time matters operationally,
  // so it rides along with the date. Drop the last line if you want date only.
  const pickupDate = new Date(booking.pickupAt);

  const adminUrl = `${appUrl}/admin/bookings/${encodeURIComponent(booking.id)}`;

  const baseLine = `${when} • ${svc}`;

  const subjectMap: Record<NotificationEvent, string> = {
    BOOKING_REQUESTED: `🔔 New booking request • ${baseLine}`,
    BOOKING_DECLINED: `❌ Booking declined • ${baseLine}`,
    PAYMENT_LINK_SENT: `💳 Payment link sent • ${baseLine}`,
    PAYMENT_RECEIVED: `✅ Payment received • ${baseLine}`,
    DRIVER_ASSIGNED: `🚗 Driver assigned • ${baseLine}`,
    DRIVER_EN_ROUTE: `🛣️ Driver en route • ${baseLine}`,
    DRIVER_ARRIVED: `📍 Driver arrived • ${baseLine}`,
    DRIVER_PICKED_UP: `👋 Client picked up • ${baseLine}`,
    TRIP_COMPLETED: `🏁 Trip completed • ${baseLine}`,
    BOOKING_CANCELLED: `🚫 Booking cancelled • ${baseLine}`,
    NO_SHOW: `🚷 No-show recorded • ${baseLine}`,
    REFUND_ISSUED: `💰 Refund issued • ${baseLine}`,
  };

  const titleMap: Record<NotificationEvent, string> = {
    BOOKING_REQUESTED: "New Booking Request",
    BOOKING_DECLINED: "Booking Declined",
    PAYMENT_LINK_SENT: "Payment Link Sent",
    PAYMENT_RECEIVED: "Payment Received",
    DRIVER_ASSIGNED: "Driver Assigned",
    DRIVER_EN_ROUTE: "Driver En Route",
    DRIVER_ARRIVED: "Driver Arrived",
    DRIVER_PICKED_UP: "Client Picked Up",
    TRIP_COMPLETED: "Trip Completed",
    BOOKING_CANCELLED: "Booking Cancelled",
    NO_SHOW: "No-Show Recorded",
    REFUND_ISSUED: "Refund Issued",
  };

  const descriptionMap: Record<NotificationEvent, string> = {
    BOOKING_REQUESTED:
      "A new booking request has been submitted and is awaiting your review.",
    BOOKING_DECLINED: "This booking has been declined.",
    PAYMENT_LINK_SENT: "A payment link has been sent to the customer.",
    PAYMENT_RECEIVED: "Payment has been received for this booking.",
    DRIVER_ASSIGNED: "A driver has been assigned to this trip.",
    DRIVER_EN_ROUTE: "The driver is now en route to the pickup location.",
    DRIVER_ARRIVED: "The driver has arrived at the pickup location.",
    DRIVER_PICKED_UP: "The client has been picked up. Trip is in progress.",
    TRIP_COMPLETED: "This trip has been completed successfully.",
    BOOKING_CANCELLED: "This booking has been cancelled.",
    NO_SHOW: "The customer did not show up for this booking.",
    REFUND_ISSUED: "A refund has been issued for this booking.",
  };

  const badge = eventBadgeColors[event];
  const emoji = eventEmoji[event];

  // ✅ HTML email body
  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleMap[event]}</title>
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
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.7); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                Admin Notification
              </p>
            </td>
          </tr>

          <!-- Event Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${badge.bg}; border: 1px solid ${badge.border}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${badge.text}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${emoji} ${titleMap[event]}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding: 24px 32px 0 32px; text-align: center;">
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                ${descriptionMap[event]}
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
                      Booking Details
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

                <!-- Customer -->
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">👤</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Customer</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${name || "—"}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Service -->
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🚐</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Service</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${svc}</span>
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
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${when}</span>
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
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${pickup}</span>
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
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${dropoff}</span>
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
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${adminUrl}" target="_blank" style="display: inline-block; padding: 18px 48px; color: ${colors.white}; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">
                      View in Admin →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback Link -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 12px;">
                Button not working? Copy and paste this link:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${adminUrl}" style="color: ${colors.accent}; text-decoration: underline;">${adminUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
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

  // Plain text email body (fallback)
  const emailBody = [
    "═══════════════════════════════════════",
    "NIER TRANSPORTATION",
    "Admin Notification",
    "═══════════════════════════════════════",
    "",
    `${emoji} ${titleMap[event].toUpperCase()}`,
    "",
    descriptionMap[event],
    "",
    "───────────────────────────────────────",
    "BOOKING DETAILS",
    "───────────────────────────────────────",
    "",
    `Confirmation: ${confirmationCode}`,
    `Customer: ${name || "—"}`,
    `Service: ${svc}`,
    `Quoted: ${money || "—"}`,
    "",
    `📅 When: ${when}`,
    `📍 Pickup: ${pickup}`,
    `🏁 Dropoff: ${dropoff}`,
    "",
    "───────────────────────────────────────",
    "",
    "View in Admin:",
    adminUrl,
    "",
    "───────────────────────────────────────",
    `© ${new Date().getFullYear()} Nier Transportation`,
  ].join("\n");

  // Keep the whole message under ~120 chars so it clears the carrier's
  // truncation point in a single text. ASCII only — emoji or typographic
  // punctuation force UCS-2 encoding and halve the per-message budget.
  const clip = (s: string, max: number) =>
    s.length > max ? `${s.slice(0, max - 1).trimEnd()}.` : s;

  const smsDate = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    timeZone,
  }).format(new Date(booking.pickupAt));

  const smsBody = [
    `${titleMap[event]} for ${smsDate}:`,
    "",
    `Client: ${clip(name || "-", 22)}`,
    "",
    `Service: ${clip(svc, 20)}`,
    "",
    `Amount: ${money || "-"}`,
    "",
    "Log in to review",
  ].join("\n");

  return {
    subject: subjectMap[event],
    emailBody,
    htmlBody,
    smsBody,
  };
}
