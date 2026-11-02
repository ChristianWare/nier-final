// src/lib/email/sendBalanceDueEmail.ts
//
// "We received your deposit — here's your remaining balance."
//
// Sent when a deposit booking has something paid and a balance still owed:
//   - manually, from the admin booking page ("Email balance link to client"
//     and "Send balance reminder"),
//   - automatically on the balance due date,
//   - automatically 48 hours before pickup.

import { Resend } from "resend";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { formatDueDate, dueDateKey } from "@/lib/booking/dueDates";

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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BalanceEmailKind = "manual" | "due_date" | "before_pickup";

type GroupLeg = {
  legNumber: number;
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  totalCents: number;
};

export async function sendBalanceDueEmail(args: {
  to: string;
  name?: string | null;
  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  /** Full price of the booking (or the whole trip). */
  totalCents: number;
  /** Collected so far: the deposit received. */
  paidCents: number;
  /** Still owed. */
  balanceCents: number;
  balanceDueDate: string | null;
  currency: string;
  payUrl: string;
  bookingId: string;
  kind: BalanceEmailKind;
  groupLegs?: GroupLeg[];
}) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");
  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone ?? "America/Phoenix";
  const companyName = companySettings.officeName || "Nier Transportation";

  const firstName =
    escapeHtml((args.name ?? "").trim().split(" ")[0] || "there");
  const confirmationCode = args.bookingId.slice(0, 8).toUpperCase();
  const pickupDate = formatPickupDate(args.pickupAtISO, companyTz);
  const pickupTime = formatPickupTime(args.pickupAtISO, companyTz);
  const paid = formatMoney(args.paidCents, args.currency);
  const balance = formatMoney(args.balanceCents, args.currency);
  const total = formatMoney(args.totalCents, args.currency);
  const isMultiTrip = !!args.groupLegs && args.groupLegs.length > 1;
  const rides = isMultiTrip ? "rides" : "ride";

  // The due date, and whether it has already passed (an admin can resend
  // after the date; the email shouldn't say "due by" a day in the past).
  const dueDate = formatDueDate(args.balanceDueDate);
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: companyTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const dueKey = dueDateKey(args.balanceDueDate);
  const dueToday = !!dueKey && dueKey === todayKey;
  const pastDue = !!dueKey && dueKey < todayKey;

  const dueLine = !dueDate
    ? "before your trip"
    : dueToday
      ? "today"
      : pastDue
        ? `before your trip (it was due ${dueDate})`
        : `by ${dueDate}`;

  const subject =
    args.kind === "before_pickup"
      ? `Your trip is coming up – Remaining balance of ${balance} due | ${companyName}`
      : args.kind === "due_date"
        ? `Reminder: Remaining balance of ${balance} due today | ${companyName}`
        : `Deposit received – Remaining balance of ${balance} due | ${companyName}`;

  const badge =
    args.kind === "manual" ? "✓ Deposit Received" : "Balance Due";

  const intro =
    args.kind === "before_pickup"
      ? `Your ${rides} on <strong>${pickupDate}</strong> ${isMultiTrip ? "are" : "is"} coming up. We received your deposit of <strong>${paid}</strong> – thank you! Your remaining balance of <strong>${balance}</strong> is due before your trip.`
      : `Thank you – we received your deposit of <strong>${paid}</strong>. Your remaining balance of <strong>${balance}</strong> is due ${dueLine}.`;

  const introText = intro.replace(/<[^>]+>/g, "");

  const c = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    green: "#16a34a",
    darkGreen: "#0b7547",
    lightGreen: "rgba(22, 163, 74, 0.15)",
    blue: "#1e40af",
    amber: "#f59e0b",
    amberLight: "#fffbeb",
    amberDark: "#92400e",
  };

  const row = (label: string, value: string, opts?: { strong?: boolean; color?: string }) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid ${c.stroke};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td><span style="color:${opts?.strong ? c.black : c.paragraph};font-size:${opts?.strong ? 16 : 14}px;${opts?.strong ? "font-weight:700;" : ""}">${label}</span></td>
              <td align="right"><span style="color:${opts?.color ?? c.black};font-size:${opts?.strong ? 22 : 14}px;font-weight:${opts?.strong ? 700 : 600};">${value}</span></td>
            </tr>
          </table>
        </td>
      </tr>`;

  const tripRows = isMultiTrip
    ? args
        .groupLegs!.map(
          (leg) => `
        <tr>
          <td style="padding:10px 20px;border-bottom:1px solid ${c.stroke};">
            <span style="color:${c.blue};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Ride ${leg.legNumber}${leg.serviceName ? ` – ${escapeHtml(leg.serviceName)}` : ""}</span><br>
            <span style="color:${c.black};font-size:14px;font-weight:600;">${formatPickupDate(leg.pickupAt, companyTz)} · ${formatPickupTime(leg.pickupAt, companyTz)}</span><br>
            <span style="color:${c.paragraph};font-size:13px;">${escapeHtml(leg.pickupAddress)} → ${escapeHtml(leg.dropoffAddress)}</span>
          </td>
        </tr>`,
        )
        .join("")
    : `
        <tr>
          <td style="padding:16px 20px 8px 20px;">
            <span style="color:${c.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">Confirmation</span><br>
            <span style="color:${c.black};font-size:18px;font-weight:700;font-family:monospace;letter-spacing:1px;">${confirmationCode}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 20px;">
            <span style="color:${c.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">📅 Pickup Date & Time</span><br>
            <span style="color:${c.black};font-size:15px;font-weight:600;">${pickupDate}<br>${pickupTime}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 20px;">
            <span style="color:${c.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">📍 Pickup</span><br>
            <span style="color:${c.black};font-size:15px;font-weight:500;">${escapeHtml(args.pickupAddress)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 20px 16px 20px;">
            <span style="color:${c.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">🏁 Dropoff</span><br>
            <span style="color:${c.black};font-size:15px;font-weight:500;">${escapeHtml(args.dropoffAddress)}</span>
          </td>
        </tr>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remaining Balance Due</title>
</head>
<body style="margin:0;padding:0;background-color:${c.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${c.cream};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="max-width:560px;background-color:${c.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

          <tr>
            <td style="background-color:${c.black};padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:${c.white};font-size:22px;font-weight:600;letter-spacing:-0.5px;">${companyName.toUpperCase()}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:${c.lightGreen};border:1px solid ${c.green};border-radius:50px;padding:12px 24px;">
                    <span style="color:${c.darkGreen};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${badge}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 28px 32px;text-align:center;">
              <h2 style="margin:0 0 12px 0;color:${c.black};font-size:26px;font-weight:600;letter-spacing:-1px;line-height:1.2;">Hi ${firstName}!</h2>
              <p style="margin:0;color:${c.paragraph};font-size:16px;line-height:1.5;">${intro}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${c.cream};border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${c.stroke};">
                    <span style="color:${c.black};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${isMultiTrip ? `Trip Details (${args.groupLegs!.length} Rides)` : "Trip Details"}</span>
                    ${isMultiTrip ? `<span style="margin-left:8px;color:${c.paragraph};font-size:12px;">Confirmation: <strong>${confirmationCode}</strong></span>` : ""}
                  </td>
                </tr>
                ${tripRows}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${c.cream};border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${c.stroke};">
                    <span style="color:${c.black};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Payment Summary</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${row(isMultiTrip ? "Total for all rides" : "Trip Total", total)}
                      ${row("Deposit Received ✓", `−${paid}`, { color: c.darkGreen })}
                      ${row("Remaining Balance", balance, { strong: true, color: c.amberDark })}
                      ${dueDate ? `<tr><td style="padding-top:6px;"><span style="color:${c.paragraph};font-size:12px;">${pastDue ? `Was due ${dueDate}` : `Due by ${dueDate}`}</span></td></tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 16px 32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:${c.black};border-radius:8px;">
                    <a href="${args.payUrl}" target="_blank"
                      style="display:inline-block;padding:18px 48px;color:${c.white};font-size:16px;font-weight:600;text-decoration:none;letter-spacing:-0.3px;">
                      Pay Remaining Balance (${balance}) →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px 32px;text-align:center;">
              <p style="margin:0 0 8px 0;color:${c.paragraph};font-size:12px;">Button not working? Copy and paste:</p>
              <p style="margin:0;font-size:12px;word-break:break-all;">
                <a href="${args.payUrl}" style="color:${c.blue};text-decoration:underline;">${args.payUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:${c.cream};padding:24px 32px;text-align:center;border-top:1px solid ${c.stroke};">
              <p style="margin:0 0 8px 0;color:${c.paragraph};font-size:13px;line-height:1.5;">Questions? Reply to this email or contact us anytime.</p>
              <p style="margin:0;color:${c.paragraph};font-size:12px;opacity:0.7;">
                ${companyName} &nbsp;·&nbsp; ${companySettings.supportEmail ?? ""} &nbsp;·&nbsp; ${companySettings.dispatchPhone ?? ""}
              </p>
              <p style="margin:8px 0 0 0;color:${c.paragraph};font-size:12px;opacity:0.7;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    companyName.toUpperCase(),
    "",
    args.kind === "manual" ? "DEPOSIT RECEIVED" : "REMAINING BALANCE DUE",
    "",
    `Hi ${firstName}!`,
    "",
    introText,
    "",
    `Confirmation: ${confirmationCode}`,
    `Pickup: ${pickupDate} at ${pickupTime}`,
    `From: ${args.pickupAddress}`,
    `To: ${args.dropoffAddress}`,
    "",
    `Trip Total: ${total}`,
    `Deposit Received: ${paid}`,
    `Remaining Balance: ${balance}${dueDate ? ` (${pastDue ? "was due" : "due by"} ${dueDate})` : ""}`,
    "",
    `Pay your remaining balance here: ${args.payUrl}`,
    "",
    `© ${new Date().getFullYear()} ${companyName}`,
  ].join("\n");

  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("Resend error (balance due):", error);
    throw new Error(error.message ?? "Failed to send balance email.");
  }
}
