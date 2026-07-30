// src/lib/sms/carriers.ts
//
// US carrier email-to-SMS gateways. Sending a plain email to
// <10-digit-number>@<gateway> lands as a text message on that phone.
//
// NOTE: this is NOT a server-only file — the carrier list is imported by
// the client-side settings form to build its dropdown. Keep it free of
// secrets and server imports.
//
// CAVEAT: carriers deprecate and change these gateways occasionally, and
// MVNO gateways follow whichever host network they resell. If a number
// stops receiving texts, the gateway is the first thing to re-verify.

export type SmsCarrier = {
  value: string;
  label: string;
  /** SMS gateway — 160 char limit, plain text */
  gateway: string;
  /** MMS gateway — handles longer bodies, arrives as a multimedia text */
  mmsGateway?: string;
};

export const SMS_CARRIERS: SmsCarrier[] = [
  // ── Major networks ──
  {
    value: "verizon",
    label: "Verizon",
    gateway: "vtext.com",
    mmsGateway: "vzwpix.com",
  },
  {
    value: "att",
    label: "AT&T",
    gateway: "txt.att.net",
    mmsGateway: "mms.att.net",
  },
  { value: "tmobile", label: "T-Mobile", gateway: "tmomail.net" },
  { value: "uscellular", label: "US Cellular", gateway: "email.uscc.net" },

  // ── Prepaid / MVNO (these ride on a host network) ──
  { value: "googlefi", label: "Google Fi", gateway: "msg.fi.google.com" },
  {
    value: "cricket",
    label: "Cricket Wireless",
    gateway: "sms.cricketwireless.net",
  },
  { value: "metro", label: "Metro by T-Mobile", gateway: "mymetropcs.com" },
  { value: "boost", label: "Boost Mobile", gateway: "sms.myboostmobile.com" },
  { value: "mint", label: "Mint Mobile (T-Mobile)", gateway: "tmomail.net" },
  {
    value: "visible",
    label: "Visible (Verizon)",
    gateway: "vtext.com",
    mmsGateway: "vzwpix.com",
  },
  {
    value: "xfinity",
    label: "Xfinity Mobile (Verizon)",
    gateway: "vtext.com",
    mmsGateway: "vzwpix.com",
  },
  {
    value: "spectrum",
    label: "Spectrum Mobile (Verizon)",
    gateway: "vtext.com",
    mmsGateway: "vzwpix.com",
  },
  {
    value: "straighttalk",
    label: "Straight Talk (Verizon)",
    gateway: "vtext.com",
    mmsGateway: "vzwpix.com",
  },
  {
    value: "consumercellular",
    label: "Consumer Cellular",
    gateway: "mailmymobile.net",
  },
];

export function getCarrier(
  value: string | null | undefined,
): SmsCarrier | null {
  if (!value) return null;
  return SMS_CARRIERS.find((c) => c.value === value) ?? null;
}

/**
 * Strip a phone number down to the 10 digits the gateways expect.
 * Accepts "+1 (917) 769-1192", "9177691192", "1-917-769-1192", etc.
 * Returns null if it isn't a usable US 10-digit number.
 */
export function toTenDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

/**
 * Build the gateway email address for a phone + carrier.
 * Pass preferMms: true to use the carrier's MMS gateway (longer bodies).
 * Returns null if the phone or carrier is missing/unusable.
 */
export function toGatewayAddress(
  phone: string | null | undefined,
  carrierValue: string | null | undefined,
  opts?: { preferMms?: boolean },
): string | null {
  const digits = toTenDigits(phone);
  const carrier = getCarrier(carrierValue);
  if (!digits || !carrier) return null;

  const domain =
    opts?.preferMms && carrier.mmsGateway
      ? carrier.mmsGateway
      : carrier.gateway;

  return `${digits}@${domain}`;
}

/**
 * Trim a notification body for carrier-gateway delivery.
 *
 * The admin SMS template is 4 lines: "<emoji> <event> — <when>", service,
 * "<pickup> → <dropoff>", "Admin: <url>". SMS gateways cap at 160 chars
 * and split (or truncate) beyond that, so this drops the least important
 * line first and always preserves line 1 and the Admin URL line.
 *
 * Written defensively so it degrades sanely if the template changes.
 */
export function trimForGateway(body: string, maxLen = 300): string {
  const clean = (body ?? "").trim();
  if (clean.length <= maxLen) return clean;

  const lines = clean.split("\n").filter(Boolean);
  if (lines.length <= 2) return clean.slice(0, maxLen);

  const first = lines[0];
  const urlLine =
    lines.find((l) => /https?:\/\//.test(l)) ?? lines[lines.length - 1];
  const middle = lines.filter((l) => l !== first && l !== urlLine);

  // Rebuild from most to least important, dropping middle lines as needed.
  for (let keep = middle.length; keep >= 0; keep--) {
    const candidate = [first, ...middle.slice(-keep), urlLine]
      .filter(Boolean)
      .join("\n");
    if (candidate.length <= maxLen) return candidate;
  }

  // Still too long: keep the first line and the URL, truncating the first.
  const room = Math.max(0, maxLen - urlLine.length - 2);
  return `${first.slice(0, room)}\n${urlLine}`;
}
