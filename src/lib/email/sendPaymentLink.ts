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

function formatPickup(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

  const subject = "Complete payment for your Nier Transportation ride";
  const when = formatPickup(args.pickupAtISO);
  const total = formatMoney(args.totalCents, args.currency);
  const name = (args.name ?? "").trim();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4;">
      <h2 style="margin: 0 0 12px;">Payment link</h2>
      <p style="margin: 0 0 12px;">${name ? `Hi ${name},` : "Hi,"} please use the link below to complete payment for your ride.</p>
      <div style="margin: 12px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <div><strong>Pickup:</strong> ${when}</div>
        <div><strong>Route:</strong> ${args.pickupAddress} → ${args.dropoffAddress}</div>
        <div><strong>Total:</strong> ${total}</div>
        <div><strong>Booking ID:</strong> ${args.bookingId}</div>
      </div>
      <p style="margin: 14px 0;">
        <a href="${args.payUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;text-decoration:none;">
          Pay now
        </a>
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px;">If the button doesn’t work, copy and paste this link:</p>
      <p style="margin: 6px 0 0; font-size: 12px; word-break: break-all;">${args.payUrl}</p>
    </div>
  `;

  const text = [
    "Complete payment for your Nier Transportation ride",
    "",
    name ? `Hi ${name},` : "Hi,",
    "Use this link to pay:",
    args.payUrl,
    "",
    `Pickup: ${when}`,
    `Route: ${args.pickupAddress} -> ${args.dropoffAddress}`,
    `Total: ${total}`,
    `Booking ID: ${args.bookingId}`,
  ].join("\n");

  await resend.emails.send({
    from,
    to: args.to,
    subject,
    html,
    text,
  });
}
