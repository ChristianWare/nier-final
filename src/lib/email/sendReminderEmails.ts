// src/lib/email/sendReminderEmails.ts
//
// Automatic reminder emails: trip reminders and payment reminders for
// customers, and the "needs attention" alert for admins. The builders return
// plain subject/HTML/text so they're easy to test; send() delivers them.

import { Resend } from "resend";

const FROM =
  process.env.EMAIL_FROM ||
  "Nier Transportation <no-reply@niertransportation.com>";

export type EmailContent = { subject: string; html: string; text: string };

export async function sendEmail(to: string | string[], content: EmailContent) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  const resend = new Resend(apiKey);
  const res = await resend.emails.send({ from: FROM, to, ...content });
  if ((res as { error?: unknown })?.error)
    throw new Error(
      String(
        (res as { error?: { message?: string } }).error?.message ??
          "Email failed",
      ),
    );
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function whenText(d: Date, timeZone: string): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${date} at ${time}`;
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

function layout(
  company: string,
  title: string,
  body: string,
  button?: { href: string; label: string },
  footer?: string,
) {
  const btn = button
    ? `<p style="margin:28px 0"><a href="${esc(button.href)}" style="background:#000;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;display:inline-block">${esc(button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f2;font-family:Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="font-weight:800;font-size:18px;margin-bottom:20px">${esc(company)}</div>
<div style="background:#fff;border-radius:12px;padding:28px">
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${body}${btn}
</div>
<p style="font-size:12px;color:#666;margin-top:20px">${footer ? esc(footer) : ""}</p>
</div></body></html>`;
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:6px 0">${esc(value)}</td></tr>`;

export type TripDetails = {
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
};

export function tripReminderEmail(a: {
  company: string;
  supportEmail?: string | null;
  name?: string | null;
  kind: "24h" | "2h";
  trip: TripDetails;
  timeZone: string;
  tripUrl?: string | null;
}): EmailContent {
  const when = whenText(a.trip.pickupAt, a.timeZone);
  const soon = a.kind === "2h" ? "in about 2 hours" : "tomorrow";
  const subject =
    a.kind === "2h"
      ? `Your ride is in about 2 hours | ${a.company}`
      : `Reminder: your ride is ${when} | ${a.company}`;
  const hi = a.name ? `Hi ${a.name.split(" ")[0]},` : "Hi,";
  const details = [
    row("Pickup", when),
    row("From", a.trip.pickupAddress),
    row("To", a.trip.dropoffAddress),
    ...(a.trip.serviceName ? [row("Service", a.trip.serviceName)] : []),
    ...(a.trip.vehicleName ? [row("Vehicle", a.trip.vehicleName)] : []),
    ...(a.trip.driverName ? [row("Driver", a.trip.driverName)] : []),
  ].join("");
  const help = a.supportEmail
    ? `Need to change something? Reply to this email or write to ${a.supportEmail}.`
    : "Need to change something? Just reply to this email.";
  const html = layout(
    a.company,
    a.kind === "2h" ? "Your ride is coming up soon" : "Your ride is tomorrow",
    `<p>${esc(hi)}</p><p>This is a reminder that your ride is ${esc(soon)}.</p><table style="border-collapse:collapse;font-size:15px">${details}</table><p style="margin-top:20px">${esc(help)}</p>`,
    a.tripUrl ? { href: a.tripUrl, label: "View your trip" } : undefined,
    `You're receiving this because you booked a ride with ${a.company}.`,
  );
  const text = [
    hi,
    `This is a reminder that your ride is ${soon}.`,
    `Pickup: ${when}`,
    `From: ${a.trip.pickupAddress}`,
    `To: ${a.trip.dropoffAddress}`,
    a.trip.driverName ? `Driver: ${a.trip.driverName}` : "",
    a.tripUrl ? `View your trip: ${a.tripUrl}` : "",
    help,
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, html, text };
}

export function paymentReminderEmail(a: {
  company: string;
  supportEmail?: string | null;
  name?: string | null;
  amountDueCents: number;
  payUrl: string;
  trips: TripDetails[];
  timeZone: string;
}): EmailContent {
  const first = a.trips[0];
  const when = whenText(first.pickupAt, a.timeZone);
  const many = a.trips.length > 1;
  const subject = `Reminder: payment needed for your ${many ? "trip" : "ride"} on ${new Intl.DateTimeFormat("en-US", { timeZone: a.timeZone, month: "short", day: "numeric" }).format(first.pickupAt)} | ${a.company}`;
  const hi = a.name ? `Hi ${a.name.split(" ")[0]},` : "Hi,";
  const list = a.trips
    .map(
      (t) =>
        `<li style="margin:6px 0">${esc(whenText(t.pickupAt, a.timeZone))}: ${esc(t.pickupAddress)} → ${esc(t.dropoffAddress)}</li>`,
    )
    .join("");
  const html = layout(
    a.company,
    "Your ride still needs payment",
    `<p>${esc(hi)}</p><p>Your ${many ? "trip is" : "ride is"} approved, but payment hasn't come through yet. Please pay ${esc(money(a.amountDueCents))} to confirm ${many ? "it" : "your ride"}.</p><ul style="padding-left:18px">${list}</ul>`,
    { href: a.payUrl, label: `Pay ${money(a.amountDueCents)}` },
    a.supportEmail ? `Questions? Write to ${a.supportEmail}.` : undefined,
  );
  const text = [
    hi,
    `Your ${many ? "trip is" : "ride is"} approved, but payment hasn't come through yet. Please pay ${money(a.amountDueCents)} to confirm.`,
    `First pickup: ${when}`,
    `Pay here: ${a.payUrl}`,
  ].join("\n");
  return { subject, html, text };
}

export type AlertRide = {
  pickupAt: Date;
  customer: string;
  serviceName?: string | null;
  reasons: ("unpaid" | "no_driver" | "needs_review")[];
  url: string;
};

const REASON_TEXT = {
  unpaid: "Not paid",
  no_driver: "No driver assigned",
  needs_review: "Still pending review",
} as const;

export function adminRideAlertEmail(a: {
  company: string;
  rides: AlertRide[];
  timeZone: string;
}): EmailContent {
  const n = a.rides.length;
  const subject = `${n} ${n === 1 ? "ride" : "rides"} in the next 24 hours ${n === 1 ? "needs" : "need"} attention`;
  const items = a.rides
    .map(
      (r) =>
        `<li style="margin:10px 0"><a href="${esc(r.url)}" style="color:#111;font-weight:700">${esc(whenText(r.pickupAt, a.timeZone))}</a> · ${esc(r.customer)}${r.serviceName ? ` · ${esc(r.serviceName)}` : ""}<br><span style="color:#b91c1c">${esc(r.reasons.map((x) => REASON_TEXT[x]).join(" · "))}</span></li>`,
    )
    .join("");
  const html = layout(
    a.company,
    subject,
    `<p>These rides start within 24 hours:</p><ul style="padding-left:18px">${items}</ul>`,
  );
  const text = [
    subject,
    ...a.rides.map(
      (r) =>
        `- ${whenText(r.pickupAt, a.timeZone)} · ${r.customer}: ${r.reasons.map((x) => REASON_TEXT[x]).join(", ")} (${r.url})`,
    ),
  ].join("\n");
  return { subject, html, text };
}

/** After a completed ride: a short thank-you with the Google review link.
 *  Worded neutrally on purpose: Google's policy forbids asking only happy
 *  customers ("review gating"), so every rider gets the same ask. */
export function reviewRequestEmail(a: {
  company: string;
  name?: string | null;
  reviewUrl: string;
}): EmailContent {
  const subject = `How was your ride? | ${a.company}`;
  const hi = a.name ? `Hi ${a.name.split(" ")[0]},` : "Hi,";
  const ask = `Thank you for riding with ${a.company}. If you have a minute, a Google review helps other travelers find us and tells our chauffeurs how they did.`;
  const html = layout(
    a.company,
    "How was your ride?",
    `<p>${esc(hi)}</p><p>${esc(ask)}</p>`,
    { href: a.reviewUrl, label: "Leave a Google review" },
    `You're receiving this because you rode with ${a.company}. We only ask once.`,
  );
  const text = [hi, ask, `Leave a review: ${a.reviewUrl}`].join("\n\n");
  return { subject, html, text };
}

/** Trip-status update for the rider when the driver taps En route, Arrived
 *  or No-show. Null for statuses that don't warrant an email. */
export function tripStatusEmail(a: {
  company: string;
  name?: string | null;
  status: "EN_ROUTE" | "ARRIVED" | "NO_SHOW" | string;
  pickupAddress: string;
  driverName: string;
  supportPhone?: string | null;
}): EmailContent | null {
  const hi = a.name ? `Hi ${a.name.split(" ")[0]},` : "Hi,";
  const call = a.supportPhone ? ` or call ${a.supportPhone}` : "";
  let title: string, body: string;
  switch (a.status) {
    case "EN_ROUTE":
      title = "Your chauffeur is on the way";
      body = `${a.driverName} is on the way to pick you up at ${a.pickupAddress}. You'll get another email when they arrive.`;
      break;
    case "ARRIVED":
      title = "Your chauffeur has arrived";
      body = `${a.driverName} has arrived at ${a.pickupAddress} and is waiting for you.`;
      break;
    case "NO_SHOW":
      title = "We couldn't find you at pickup";
      body = `Your chauffeur waited at ${a.pickupAddress} but wasn't able to locate you. If you still need a ride, reply to this email${call} and we'll sort it out.`;
      break;
    default:
      return null;
  }
  const subject = `${title} | ${a.company}`;
  const html = layout(
    a.company,
    title,
    `<p>${esc(hi)}</p><p>${esc(body)}</p>`,
    undefined,
    `You're receiving this because you booked a ride with ${a.company}.`,
  );
  return { subject, html, text: `${hi}\n\n${body}` };
}
