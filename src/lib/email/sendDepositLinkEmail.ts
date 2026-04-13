import { Resend } from "resend";
import { getCompanySettings } from "../../../actions/admin/companySettings";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);
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

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

type GroupLeg = {
  legNumber: number;
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  totalCents: number;
};

export async function sendDepositLinkEmail(args: {
  to: string;
  name?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalCents: number;
  depositCents: number;
  depositPercent: number;
  balanceCents: number;
  depositDueDate: string | null;
  balanceDueDate: string | null;
  currency: string;
  payUrl: string;
  bookingId: string;
  groupLegs?: GroupLeg[];
}) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");
  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone ?? "America/Phoenix";
  const companyName = companySettings.officeName || "Nier Transportation";

  const name = (args.name ?? "").trim();
  const firstName = name.split(" ")[0] || "there";
  const confirmationCode = args.bookingId.slice(0, 8).toUpperCase();
  const pickupDate = formatPickupDate(args.pickupAtISO, companyTz);
  const pickupTime = formatPickupTime(args.pickupAtISO, companyTz);
  const depositFormatted = formatMoney(args.depositCents, args.currency);
  const balanceFormatted = formatMoney(args.balanceCents, args.currency);
  const totalFormatted = formatMoney(args.totalCents, args.currency);
  const depositDueDateFormatted = args.depositDueDate
    ? formatDateShort(args.depositDueDate)
    : null;
  const balanceDueDateFormatted = args.balanceDueDate
    ? formatDateShort(args.balanceDueDate)
    : null;
  const is100 = args.depositPercent === 100;
  const isMultiTrip = args.groupLegs && args.groupLegs.length > 1;

  const subject = `\u2705 Booking Approved \u2013 ${is100 ? "Complete Your Payment" : `Deposit of ${depositFormatted} Due`} | ${companyName}`;

  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    green: "#16a34a",
    darkGreen: "#0b7547",
    lightGreen: "rgba(22, 163, 74, 0.15)",
    blue: "#1e40af",
    lightBlue: "#dbeafe",
    darkBlue: "#1e3a8a",
    amber: "#f59e0b",
    amberLight: "#fffbeb",
    amberDark: "#92400e",
  };

  // \u2500\u2500 Trip details section: multi-leg or single \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const tripDetailsHtml = isMultiTrip
    ? args
        .groupLegs!.map((leg) => {
          const legDate = formatPickupDate(leg.pickupAt, companyTz);
          const legTime = formatPickupTime(leg.pickupAt, companyTz);
          return `
        <tr>
          <td style="padding: 10px 20px 0 20px;">
            <span style="color: ${colors.blue}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              Ride ${leg.legNumber}${leg.serviceName ? ` \u2013 ${leg.serviceName}` : ""}
              <span style="color: ${colors.paragraph}; font-weight: 400;">\u00a0\u00b7\u00a0${formatMoney(leg.totalCents, args.currency)}</span>
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 20px 12px 20px; border-bottom: 1px solid ${colors.stroke};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 16px;">\ud83d\udcc5</span></td>
                <td>
                  <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">${legDate}</span><br>
                  <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">${legTime}</span>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
              <tr>
                <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 16px;">\ud83d\udccd</span></td>
                <td>
                  <span style="color: ${colors.paragraph}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Pickup</span><br>
                  <span style="color: ${colors.black}; font-size: 14px; font-weight: 500;">${leg.pickupAddress}</span>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
              <tr>
                <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 16px;">\ud83c\udfc1</span></td>
                <td>
                  <span style="color: ${colors.paragraph}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Dropoff</span><br>
                  <span style="color: ${colors.black}; font-size: 14px; font-weight: 500;">${leg.dropoffAddress}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
        })
        .join("")
    : `
      <tr>
        <td style="padding:16px 20px 12px 20px;">
          <span style="color:${colors.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">Confirmation</span><br>
          <span style="color:${colors.black};font-size:18px;font-weight:700;font-family:monospace;letter-spacing:1px;">${confirmationCode}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="28" valign="top" style="padding-right:12px;"><span style="font-size:18px;">\ud83d\udcc5</span></td>
              <td>
                <span style="color:${colors.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">Pickup Date & Time</span><br>
                <span style="color:${colors.black};font-size:15px;font-weight:600;">${pickupDate}</span><br>
                <span style="color:${colors.black};font-size:15px;font-weight:600;">${pickupTime}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="28" valign="top" style="padding-right:12px;"><span style="font-size:18px;">\ud83d\udccd</span></td>
              <td>
                <span style="color:${colors.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">Pickup</span><br>
                <span style="color:${colors.black};font-size:15px;font-weight:500;line-height:1.4;">${args.pickupAddress}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 20px 16px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="28" valign="top" style="padding-right:12px;"><span style="font-size:18px;">\ud83c\udfc1</span></td>
              <td>
                <span style="color:${colors.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">Dropoff</span><br>
                <span style="color:${colors.black};font-size:15px;font-weight:500;line-height:1.4;">${args.dropoffAddress}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;

  const balanceSectionHtml = !is100
    ? `
    <tr>
      <td style="padding: 0 32px 28px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="background-color: ${colors.amberLight}; border: 1px solid ${colors.amber}; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.amber};">
              <span style="color: ${colors.amberDark}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Remaining Balance</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td><span style="color: ${colors.amberDark}; font-size: 14px;">Balance after deposit</span></td>
                  <td align="right"><span style="color: ${colors.amberDark}; font-size: 20px; font-weight: 700;">${balanceFormatted}</span></td>
                </tr>
                ${
                  balanceDueDateFormatted
                    ? `<tr><td colspan="2" style="padding-top: 8px;"><span style="color: ${colors.amberDark}; font-size: 13px;">Due by <strong>${balanceDueDateFormatted}</strong>. You'll receive a separate payment link closer to your trip.</span></td></tr>`
                    : `<tr><td colspan="2" style="padding-top: 8px;"><span style="color: ${colors.amberDark}; font-size: 13px;">A balance payment link will be sent closer to your trip date.</span></td></tr>`
                }
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  const paymentSummaryHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${
        !is100
          ? `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px solid ${colors.stroke};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td><span style="color: ${colors.paragraph}; font-size: 14px;">${isMultiTrip ? "Total for all rides" : "Trip Total"}</span></td>
              <td align="right"><span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">${totalFormatted}</span></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px solid ${colors.stroke};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td><span style="color: ${colors.paragraph}; font-size: 14px;">Balance after deposit</span></td>
              <td align="right"><span style="color: ${colors.paragraph}; font-size: 14px;">${balanceFormatted}${balanceDueDateFormatted ? ` (due ${balanceDueDateFormatted})` : ""}</span></td>
            </tr>
          </table>
        </td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 12px 0 6px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td><span style="color: ${colors.black}; font-size: 16px; font-weight: 700;">${is100 ? "Amount Due Today" : `Deposit Due Today (${args.depositPercent}%)`}</span></td>
              <td align="right"><span style="color: ${colors.darkGreen}; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${depositFormatted}</span></td>
            </tr>
            ${depositDueDateFormatted ? `<tr><td colspan="2"><span style="color: ${colors.paragraph}; font-size: 12px;">Due by ${depositDueDateFormatted}</span></td></tr>` : ""}
          </table>
        </td>
      </tr>
    </table>`;

  const tripSectionTitle = isMultiTrip
    ? `Multi-Trip Details (${args.groupLegs!.length} Rides)`
    : "Trip Details";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${is100 ? "Complete Payment" : "Deposit Due"}</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${colors.cream};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:560px;background-color:${colors.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

          <tr>
            <td style="background-color:${colors.black};padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:${colors.white};font-size:22px;font-weight:600;letter-spacing:-0.5px;">${companyName.toUpperCase()}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:${colors.lightGreen};border:1px solid ${colors.green};border-radius:50px;padding:12px 24px;">
                    <span style="color:${colors.darkGreen};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">\u2713 Booking Approved</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 28px 32px;text-align:center;">
              <h2 style="margin:0 0 12px 0;color:${colors.black};font-size:26px;font-weight:600;letter-spacing:-1px;line-height:1.2;">Hi ${firstName}!</h2>
              <p style="margin:0;color:${colors.paragraph};font-size:16px;line-height:1.5;">
                ${
                  is100
                    ? "Your reservation has been approved. Complete your payment below to confirm your ride."
                    : `Your reservation has been approved. A <strong>${args.depositPercent}% deposit of ${depositFormatted}</strong> is required to secure your ride${isMultiTrip ? "s" : ""}. The remaining ${balanceFormatted} will be due later.`
                }
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="background-color:${colors.cream};border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${colors.stroke};">
                    <span style="color:${colors.black};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${tripSectionTitle}</span>
                    ${isMultiTrip ? `<span style="margin-left:8px;color:${colors.paragraph};font-size:12px;">Confirmation: <strong>${confirmationCode}</strong></span>` : ""}
                  </td>
                </tr>
                ${tripDetailsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="background-color:${colors.cream};border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${colors.stroke};">
                    <span style="color:${colors.black};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Payment Summary</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">${paymentSummaryHtml}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${balanceSectionHtml}

          <tr>
            <td style="padding:0 32px 16px 32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:${colors.black};border-radius:8px;">
                    <a href="${args.payUrl}" target="_blank"
                      style="display:inline-block;padding:18px 48px;color:${colors.white};font-size:16px;font-weight:600;text-decoration:none;letter-spacing:-0.3px;">
                      ${is100 ? "Complete Payment \u2192" : `Pay Deposit (${depositFormatted}) \u2192`}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            !is100
              ? `<tr><td style="padding:0 32px 24px 32px;text-align:center;"><p style="margin:0;color:${colors.paragraph};font-size:13px;line-height:1.5;">You'll also have the option to <strong>pay the full amount (${totalFormatted})</strong> at checkout if you prefer.</p></td></tr>`
              : `<tr><td style="padding:0 32px 24px 32px;text-align:center;"><p style="margin:0;color:${colors.paragraph};font-size:13px;line-height:1.5;">You'll have the option to add a tip for your driver during checkout.</p></td></tr>`
          }

          <tr>
            <td style="padding:0 32px 32px 32px;text-align:center;">
              <p style="margin:0 0 8px 0;color:${colors.paragraph};font-size:12px;">Button not working? Copy and paste:</p>
              <p style="margin:0;font-size:12px;word-break:break-all;">
                <a href="${args.payUrl}" style="color:#1e40af;text-decoration:underline;">${args.payUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:${colors.cream};padding:24px 32px;text-align:center;border-top:1px solid ${colors.stroke};">
              <p style="margin:0 0 8px 0;color:${colors.paragraph};font-size:13px;line-height:1.5;">Questions? Reply to this email or contact us anytime.</p>
              <p style="margin:0;color:${colors.paragraph};font-size:12px;opacity:0.7;">
                ${companyName} &nbsp;\u00b7&nbsp; ${companySettings.supportEmail ?? ""} &nbsp;\u00b7&nbsp; ${companySettings.dispatchPhone ?? ""}
              </p>
              <p style="margin:8px 0 0 0;color:${colors.paragraph};font-size:12px;opacity:0.7;">
                \u00a9 ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const legsText = isMultiTrip
    ? args
        .groupLegs!.map((leg) => {
          const legDate = formatPickupDate(leg.pickupAt, companyTz);
          const legTime = formatPickupTime(leg.pickupAt, companyTz);
          return `  Ride ${leg.legNumber}${leg.serviceName ? ` \u2013 ${leg.serviceName}` : ""} (${formatMoney(leg.totalCents, args.currency)})\n  ${legDate} at ${legTime}\n  From: ${leg.pickupAddress}\n  To: ${leg.dropoffAddress}`;
        })
        .join("\n\n")
    : `Pickup: ${pickupDate} at ${pickupTime}\nFrom: ${args.pickupAddress}\nTo: ${args.dropoffAddress}`;

  const text = [
    companyName.toUpperCase(),
    "",
    is100
      ? "COMPLETE YOUR PAYMENT"
      : `DEPOSIT DUE \u2014 ${args.depositPercent}% (${depositFormatted})`,
    "",
    `Hi ${firstName}!`,
    "",
    is100
      ? `Your reservation has been approved. Pay ${depositFormatted} to confirm your ride.`
      : `Your reservation has been approved. A ${args.depositPercent}% deposit of ${depositFormatted} is required to secure your booking.`,
    "",
    `Confirmation: ${confirmationCode}`,
    ...(isMultiTrip
      ? [`\nTrip Details (${args.groupLegs!.length} rides):`, legsText]
      : [legsText]),
    "",
    `Total: ${totalFormatted}`,
    ...(is100
      ? []
      : [
          `Deposit Due Now: ${depositFormatted}${depositDueDateFormatted ? ` (by ${depositDueDateFormatted})` : ""}`,
          `Balance Later: ${balanceFormatted}${balanceDueDateFormatted ? ` (by ${balanceDueDateFormatted})` : ""}`,
        ]),
    "",
    `${is100 ? "Pay here" : "Pay deposit (or full amount) here"}: ${args.payUrl}`,
    "",
    `\u00a9 ${new Date().getFullYear()} ${companyName}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("Resend error (deposit link):", error);
    throw new Error(error.message ?? "Failed to send deposit email.");
  }
}
