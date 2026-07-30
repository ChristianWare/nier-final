// src/lib/sms/sendSmsViaEmailGateway.ts
//
// Sends a text message by emailing the recipient's carrier email-to-SMS
// gateway (e.g. 9177691192@vtext.com) through Resend. Free, no SMS vendor,
// no A2P/10DLC registration.
//
// Tradeoffs vs. a real SMS API: delivery is usually seconds but is NOT
// guaranteed, and there is no delivery receipt. Treat this as an interrupt,
// not a system of record — the email notification remains the reliable copy.
//
// The Twilio sender at ./sendSms.ts is intentionally left in place. To
// upgrade later, swap the call in src/lib/notifications/queue.ts.

import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * RESEND_FROM is stored in friendly-name form for normal email
 * ("Nier Transportation <no-reply@niertransportation.com>"). Carrier
 * gateways are stricter and some reject the display-name form, so we
 * send from the bare address.
 */
function bareFromAddress(): string {
  const raw = (process.env.RESEND_FROM ?? "").trim();
  const angled = raw.match(/<([^>]+)>/);
  const address = (angled ? angled[1] : raw).trim();

  if (!address || !address.includes("@")) {
    throw new Error(
      "Missing or invalid RESEND_FROM env var (needed for SMS gateway sends)",
    );
  }
  return address;
}

export async function sendSmsViaEmailGateway(args: {
  /** Full gateway address, e.g. "9177691192@vtext.com" */
  to: string;
  body: string;
}) {
  const { to, body } = args;

  if (!to || !to.includes("@")) {
    throw new Error(`Invalid SMS gateway address: "${to}"`);
  }

  // Gateways prepend the subject to the message body on some carriers, so
  // keep it empty — the body carries everything.
  await resend.emails.send({
    from: bareFromAddress(),
    to,
    subject: "",
    text: body,
  });
}
