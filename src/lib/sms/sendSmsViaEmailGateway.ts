// src/lib/sms/sendSmsViaEmailGateway.ts
//
// Sends a text message by emailing the recipient's carrier email-to-SMS
// gateway (e.g. 9177691192@vtext.com) through Resend. Free, no SMS vendor,
// no A2P/10DLC registration.
//
// Carrier gateways truncate rather than split — Verizon's vtext.com cuts
// around 130 characters — so anything longer is chunked here and sent as
// multiple sequential messages tagged (1/2), (2/2), etc.
//
// Tradeoffs vs. a real SMS API: delivery is usually seconds but is NOT
// guaranteed, there is no delivery receipt, and multi-part messages can
// arrive out of order (hence the part markers). Treat this as an interrupt,
// not a system of record — the email notification remains the reliable copy.
//
// The Twilio sender at ./sendSms.ts is intentionally left in place. To
// upgrade later, swap the call in src/lib/notifications/queue.ts.

import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Conservative per-message ceiling. Verizon truncates near 130; other
 * carriers allow up to 160. Staying low costs an extra message
 * occasionally and guarantees nothing gets cut off.
 */
const MAX_PART_LEN = 130;

/** Room for the "(1/2) " prefix that gets prepended to multi-part sends. */
const PART_MARKER_LEN = 7;

/** Pause between parts so the carrier delivers them in order. */
const INTER_PART_DELAY_MS = 700;

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

/**
 * Split a message into gateway-sized chunks, breaking on line boundaries
 * so a URL or a labelled value never gets cut in half. A single line
 * longer than the limit (a very long address, say) is hard-split as a
 * last resort.
 */
export function chunkForSmsGateway(body: string, maxLen: number): string[] {
  const lines = (body ?? "").split("\n");
  const parts: string[] = [];
  let current = "";

  const flush = () => {
    if (current.length > 0) {
      parts.push(current);
      current = "";
    }
  };

  for (const line of lines) {
    if (line.length > maxLen) {
      flush();
      for (let i = 0; i < line.length; i += maxLen) {
        parts.push(line.slice(i, i + maxLen));
      }
      continue;
    }

    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > maxLen) {
      flush();
      current = line;
    } else {
      current = candidate;
    }
  }

  flush();
  return parts.length > 0 ? parts : [""];
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

  const from = bareFromAddress();

  // Measure against the smaller budget only if we'll actually need markers.
  const singleFit = body.trim().length <= MAX_PART_LEN;
  const parts = singleFit
    ? [body.trim()]
    : chunkForSmsGateway(body, MAX_PART_LEN - PART_MARKER_LEN);

  const total = parts.length;

  for (let i = 0; i < total; i++) {
    const text = total > 1 ? `(${i + 1}/${total}) ${parts[i]}` : parts[i];

    // Subject stays empty — gateways prepend it to the message body, so any
    // subject line eats into the character budget for no benefit.
    await resend.emails.send({
      from,
      to,
      subject: "",
      text,
    });

    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, INTER_PART_DELAY_MS));
    }
  }
}
