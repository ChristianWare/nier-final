// src/lib/corporateOnboarding.ts
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

/* ─────────────────────────────────────────────
   Env helpers (same pattern as passwordResetToken.ts)
   ───────────────────────────────────────────── */

const BRAND = process.env.BRAND_NAME || "Nier Transportation";
const BASE_URL = process.env.BASE_URL || "";
const RAW_FROM = (
  process.env.RESEND_FROM ||
  process.env.CONTACT_FROM ||
  ""
).trim();

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const EMAIL_ONLY_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_ADDR_RE = /^([^<>]+)<\s*([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)\s*>$/i;

function normalizeFrom(brand: string, raw: string) {
  if (!raw) {
    throw new Error(
      "RESEND_FROM (or CONTACT_FROM) is empty. Set an address like noreply@yourdomain.com or 'Name <noreply@yourdomain.com>'.",
    );
  }
  if (NAME_ADDR_RE.test(raw)) return raw;
  if (EMAIL_ONLY_RE.test(raw)) return `${brand} <${raw}>`;
  throw new Error(
    `RESEND_FROM is invalid. Use 'email@example.com' or 'Name <email@example.com>'. Received: "${raw}"`,
  );
}

/* ─────────────────────────────────────────────
   Token: generate / validate / clear
   ───────────────────────────────────────────── */

/**
 * Generate a password-set token for a user (48-hour expiry).
 * Stores the token + expiry directly on the User record.
 */
export async function generatePasswordSetToken(userId: string) {
  const token = uuidv4();
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await db.user.update({
    where: { id: userId },
    data: {
      passwordSetToken: token,
      passwordSetTokenExpiry: expiry,
    },
  });

  return token;
}

/**
 * Validate a password-set token. Returns the user if valid, null otherwise.
 */
export async function validatePasswordSetToken(token: string) {
  const user = await db.user.findUnique({
    where: { passwordSetToken: token },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      passwordSetTokenExpiry: true,
    },
  });

  if (!user) return null;
  if (!user.passwordSetTokenExpiry) return null;
  if (new Date() > user.passwordSetTokenExpiry) return null;

  return user;
}

/**
 * Clear the password-set token fields after successful password set.
 */
export async function clearPasswordSetToken(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      passwordSetToken: null,
      passwordSetTokenExpiry: null,
    },
  });
}

/* ─────────────────────────────────────────────
   Display helpers — human-friendly labels
   ───────────────────────────────────────────── */

function paymentTermsLabel(terms: string) {
  switch (terms) {
    case "NET_15":
      return "Payment due within 15 days of invoice";
    case "NET_30":
      return "Payment due within 30 days of invoice";
    case "NET_45":
      return "Payment due within 45 days of invoice";
    case "DUE_ON_RECEIPT":
      return "Payment due upon receipt";
    default:
      return terms;
  }
}

function billingCycleLabel(cycle: string) {
  switch (cycle) {
    case "MONTHLY":
      return "Monthly";
    case "WEEKLY":
      return "Weekly";
    case "PER_RIDE":
      return "Per Ride";
    default:
      return cycle;
  }
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case "INVOICE":
      return "Electronic Invoice";
    case "CHECK":
      return "Physical Check";
    case "CARD_ON_FILE":
      return "Card on File";
    default:
      return method;
  }
}

function estimatedRidesLabel(value: string) {
  switch (value) {
    case "1-10":
      return "1 – 10 rides/month";
    case "11-25":
      return "11 – 25 rides/month";
    case "26-50":
      return "26 – 50 rides/month";
    case "50+":
      return "50+ rides/month";
    default:
      return value;
  }
}

/* ─────────────────────────────────────────────
   Welcome email (matches passwordResetToken.ts styling)
   ───────────────────────────────────────────── */

export async function sendCorporateWelcomeEmail(args: {
  to: string;
  contactName: string;
  companyName: string;
  billingCycle: string;
  paymentMethod: string;
  paymentTerms: string;
  discountPercent?: number | null;
  setPasswordToken: string;
}) {
  requireEnv("RESEND_API_KEY");
  if (!BASE_URL) throw new Error("Missing required env var: BASE_URL");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = normalizeFrom(BRAND, RAW_FROM);

  const firstName = (args.contactName || "").split(" ")[0] || "there";
  const setPasswordLink = `${BASE_URL.replace(/\/+$/, "")}/set-password?token=${encodeURIComponent(args.setPasswordToken)}`;

  const subject = `Welcome to ${BRAND} — Your Corporate Account is Ready`;

  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    green: "#16a34a",
    darkGreen: "#0b7547",
    lightGreen: "rgba(22, 163, 74, 0.15)",
    blue: "#2563eb",
    darkBlue: "#1d4ed8",
    lightBlue: "rgba(37, 99, 235, 0.1)",
    amber: "#f59e0b",
    lightAmber: "rgba(245, 158, 11, 0.15)",
  };

  const discountLine = args.discountPercent
    ? `
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">💰</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Discount</span>
                          <br>
                          <span style="color: ${colors.darkGreen}; font-size: 15px; font-weight: 700;">${args.discountPercent}% off all rides</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${BRAND}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${colors.black}; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: ${colors.white}; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">
                NIER TRANSPORTATION
              </h1>
            </td>
          </tr>

          <!-- Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightGreen}; border: 1px solid ${colors.green}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkGreen}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✓ Corporate Account Ready
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
                Welcome, ${firstName}!
              </h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                Your corporate account for <strong style="color: ${colors.black};">${args.companyName}</strong> has been created. Set your password to access your dashboard and start booking rides for your team.
              </p>
            </td>
          </tr>

          <!-- Account Details Card -->
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Account Details
                    </span>
                  </td>
                </tr>

                <!-- Company -->
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🏢</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Company</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${args.companyName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Billing Cycle -->
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">📅</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Billing Cycle</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${billingCycleLabel(args.billingCycle)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Payment Method -->
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">💳</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Payment Method</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${paymentMethodLabel(args.paymentMethod)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Payment Terms -->
                <tr>
                  <td style="padding: 12px 20px${args.discountPercent ? "" : " 16px 20px"};">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">📋</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Payment Terms</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${paymentTermsLabel(args.paymentTerms)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${discountLine}

              </table>
            </td>
          </tr>

          <!-- What You Can Do -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.lightBlue}; border: 1px solid ${colors.blue}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="color: ${colors.darkBlue}; font-size: 14px; font-weight: 700; display: block; margin-bottom: 12px;">What you can do from your dashboard:</span>
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr><td style="padding: 4px 0; color: ${colors.darkBlue}; font-size: 14px;">✓ &nbsp;Book rides for your employees</td></tr>
                      <tr><td style="padding: 4px 0; color: ${colors.darkBlue}; font-size: 14px;">✓ &nbsp;Manage your employee roster</td></tr>
                      <tr><td style="padding: 4px 0; color: ${colors.darkBlue}; font-size: 14px;">✓ &nbsp;View invoices and payment history</td></tr>
                      <tr><td style="padding: 4px 0; color: ${colors.darkBlue}; font-size: 14px;">✓ &nbsp;Track rides and spending reports</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 16px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${setPasswordLink}" target="_blank" style="display: inline-block; padding: 18px 48px; color: ${colors.white}; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">
                      Set Your Password →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Link fallback -->
          <tr>
            <td style="padding: 0 32px 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; font-size: 13px; word-break: break-all;">
                <a href="${setPasswordLink}" style="color: ${colors.blue}; text-decoration: none;">${setPasswordLink}</a>
              </p>
            </td>
          </tr>

          <!-- Expiration Warning -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.lightAmber}; border: 1px solid ${colors.amber}; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">⏰</span>
                        </td>
                        <td>
                          <span style="color: #92400e; font-size: 14px; font-weight: 600;">This link expires in 48 hours</span>
                          <br>
                          <span style="color: #78350f; font-size: 13px; line-height: 1.5;">For security reasons, this link is only valid for a limited time. If it expires, contact us and we'll send a new one.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                Questions? Reply to this email or contact us anytime.
              </p>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 12px; opacity: 0.7;">
                © ${new Date().getFullYear()} ${BRAND}. All rights reserved.
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

  const text = [
    "═══════════════════════════════════════",
    "NIER TRANSPORTATION",
    "═══════════════════════════════════════",
    "",
    "✓ CORPORATE ACCOUNT READY",
    "",
    `Welcome, ${firstName}!`,
    "",
    `Your corporate account for ${args.companyName} has been created.`,
    "Set your password to access your dashboard and start booking rides.",
    "",
    "───────────────────────────────────────",
    "ACCOUNT DETAILS",
    "───────────────────────────────────────",
    "",
    `🏢 Company: ${args.companyName}`,
    `📅 Billing Cycle: ${billingCycleLabel(args.billingCycle)}`,
    `💳 Payment Method: ${paymentMethodLabel(args.paymentMethod)}`,
    `📋 Payment Terms: ${paymentTermsLabel(args.paymentTerms)}`,
    ...(args.discountPercent
      ? [`💰 Discount: ${args.discountPercent}% off all rides`]
      : []),
    "",
    "───────────────────────────────────────",
    "WHAT YOU CAN DO",
    "───────────────────────────────────────",
    "",
    "✓ Book rides for your employees",
    "✓ Manage your employee roster",
    "✓ View invoices and payment history",
    "✓ Track rides and spending reports",
    "",
    "───────────────────────────────────────",
    "SET YOUR PASSWORD",
    "───────────────────────────────────────",
    "",
    "Click the link below to set your password:",
    "",
    setPasswordLink,
    "",
    "⏰ This link expires in 48 hours.",
    "",
    "───────────────────────────────────────",
    "",
    "Questions? Reply to this email or contact us anytime.",
    "",
    `© ${new Date().getFullYear()} ${BRAND}. All rights reserved.`,
  ].join("\n");

  try {
    const res = await resend.emails.send({
      from,
      to: args.to,
      subject,
      html,
      text,
      headers: { "X-Website": BRAND, "X-Template": "CorporateWelcome" },
    });

    if (res.error) {
      console.error("[CorporateWelcome] Resend error:", res.error);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DEV] Set password link:", setPasswordLink);
        return { error: null };
      }
      return { error: res.error.message || "Email send failed" };
    }

    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown email send error";
    console.error("[CorporateWelcome] Error:", msg);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV] Set password link:", setPasswordLink);
      return { error: null };
    }
    return { error: msg };
  }
}

/* ─────────────────────────────────────────────
   Inquiry confirmation email
   ───────────────────────────────────────────── */

export async function sendCorporateInquiryConfirmationEmail(args: {
  to: string;
  contactName: string;
  companyName: string;
  estimatedMonthlyRides: string;
}) {
  requireEnv("RESEND_API_KEY");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = normalizeFrom(BRAND, RAW_FROM);

  const firstName = (args.contactName || "").split(" ")[0] || "there";

  const subject = `We've Received Your Corporate Account Inquiry`;

  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    green: "#16a34a",
    darkGreen: "#0b7547",
    lightGreen: "rgba(22, 163, 74, 0.15)",
    blue: "#2563eb",
    darkBlue: "#1d4ed8",
    lightBlue: "rgba(37, 99, 235, 0.1)",
  };

  const CONTACT_EMAIL =
    process.env.CONTACT_EMAIL || process.env.RESEND_FROM || "";
  const CONTACT_PHONE = process.env.CONTACT_PHONE || "";

  const contactLine = [
    CONTACT_EMAIL
      ? `<a href="mailto:${CONTACT_EMAIL}" style="color: ${colors.blue}; text-decoration: none;">${CONTACT_EMAIL}</a>`
      : "",
    CONTACT_PHONE
      ? `or call us at <strong style="color: ${colors.black};">${CONTACT_PHONE}</strong>`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const contactLineText = [
    CONTACT_EMAIL || "",
    CONTACT_PHONE ? `or call us at ${CONTACT_PHONE}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inquiry Received — ${BRAND}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream};">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${colors.black}; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: ${colors.white}; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">
                NIER TRANSPORTATION
              </h1>
            </td>
          </tr>

          <!-- Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightGreen}; border: 1px solid ${colors.green}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkGreen}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✓ Inquiry Received
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
                Thank you, ${firstName}!
              </h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                We've received your corporate account inquiry for <strong style="color: ${colors.black};">${args.companyName}</strong>. Our team will review your request and reach out within <strong style="color: ${colors.black};">1 business day</strong> to discuss your company's transportation needs, usage estimates, and pricing.
              </p>
            </td>
          </tr>

          <!-- What You Submitted Card -->
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">

                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Inquiry Details
                    </span>
                  </td>
                </tr>

                <!-- Company -->
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🏢</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Company</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${args.companyName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contact -->
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">👤</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Contact</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${args.contactName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Estimated Rides -->
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🚗</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Estimated Volume</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${estimatedRidesLabel(args.estimatedMonthlyRides)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.lightBlue}; border: 1px solid ${colors.blue}; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="color: ${colors.darkBlue}; font-size: 14px; font-weight: 700; display: block; margin-bottom: 12px;">What happens next:</span>
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr><td style="padding: 4px 0; color: ${colors.darkBlue}; font-size: 14px;">1. &nbsp;Our team reviews your inquiry</td></tr>
                      <tr><td style="padding: 4px 0; color: ${colors.darkBlue}; font-size: 14px;">2. &nbsp;We'll reach out to discuss rates, billing, and terms</td></tr>
                      <tr><td style="padding: 4px 0; color: ${colors.darkBlue}; font-size: 14px;">3. &nbsp;Once agreed, your account is activated and ready to book</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contact Info -->
          ${
            contactLine
              ? `
          <tr>
            <td style="padding: 0 32px 28px 32px; text-align: center;">
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 15px; line-height: 1.6;">
                In the meantime, if you have any questions, reach us at
                <br>
                ${contactLine}
              </p>
            </td>
          </tr>`
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                You're receiving this because you submitted a corporate account inquiry at ${BRAND}.
              </p>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 12px; opacity: 0.7;">
                © ${new Date().getFullYear()} ${BRAND}. All rights reserved.
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

  const text = [
    "═══════════════════════════════════════",
    "NIER TRANSPORTATION",
    "═══════════════════════════════════════",
    "",
    "✓ INQUIRY RECEIVED",
    "",
    `Thank you, ${firstName}!`,
    "",
    `We've received your corporate account inquiry for ${args.companyName}.`,
    "Our team will review your request and reach out within 1 business day",
    "to discuss your company's transportation needs, usage estimates, and pricing.",
    "",
    "───────────────────────────────────────",
    "YOUR INQUIRY DETAILS",
    "───────────────────────────────────────",
    "",
    `🏢 Company: ${args.companyName}`,
    `👤 Contact: ${args.contactName}`,
    `🚗 Estimated Volume: ${estimatedRidesLabel(args.estimatedMonthlyRides)}`,
    "",
    "───────────────────────────────────────",
    "WHAT HAPPENS NEXT",
    "───────────────────────────────────────",
    "",
    "1. Our team reviews your inquiry",
    "2. We'll reach out to discuss rates, billing, and terms",
    "3. Once agreed, your account is activated and ready to book",
    "",
    ...(contactLineText
      ? [
          "───────────────────────────────────────",
          "",
          `Questions? Reach us at ${contactLineText}`,
          "",
        ]
      : []),
    "───────────────────────────────────────",
    "",
    `You're receiving this because you submitted a corporate account inquiry at ${BRAND}.`,
    "",
    `© ${new Date().getFullYear()} ${BRAND}. All rights reserved.`,
  ].join("\n");

  try {
    const res = await resend.emails.send({
      from,
      to: args.to,
      subject,
      html,
      text,
      headers: {
        "X-Website": BRAND,
        "X-Template": "CorporateInquiryConfirmation",
      },
    });

    if (res.error) {
      console.error("[CorporateInquiryConfirmation] Resend error:", res.error);
      return { error: res.error.message || "Email send failed" };
    }

    return { error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown email send error";
    console.error("[CorporateInquiryConfirmation] Error:", msg);
    return { error: msg };
  }
}
