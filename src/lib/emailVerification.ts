/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import { getCompanySettings } from "../../actions/admin/companySettings";

export const getVerificationTokenByEmail = async (email: string) => {
  try {
    const verificationToken = await db.emailVerificationToken.findFirst({
      where: { email },
    });
    return verificationToken;
  } catch {
    return null;
  }
};

export const generateEmailVerificationToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(Date.now() + 3600 * 1000);

  const existingToken = await getVerificationTokenByEmail(email);
  if (existingToken) {
    await db.emailVerificationToken.delete({
      where: { id: existingToken.id },
    });
  }

  const emailVerificationToken = await db.emailVerificationToken.create({
    data: { email, token, expires },
  });

  return emailVerificationToken;
};

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

function escapeHtml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailHtmlVerify(
  email: string,
  verifyLink: string,
  submittedAt: string,
) {
  // Brand colors matching other Nier Transportation emails
  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    blue: "#2563eb",
    lightBlue: "rgba(37, 99, 235, 0.1)",
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
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

          <!-- Status Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightBlue}; border: 1px solid ${colors.blue}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.blue}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✉️ Verify Your Email
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
                Welcome!
              </h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                Thanks for signing up with ${escapeHtml(BRAND)}. Please verify your email address to complete your registration.
              </p>
            </td>
          </tr>

          <!-- Email Info Card -->
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Account Details
                    </span>
                  </td>
                </tr>

                <!-- Email -->
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">📧</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Email Address</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${escapeHtml(email)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Submitted At -->
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🕐</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Requested</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500;">${submittedAt}</span>
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
            <td style="padding: 0 32px 16px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${escapeHtml(verifyLink)}" target="_blank" style="display: inline-block; padding: 18px 48px; color: ${colors.white}; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">
                      Verify Email Address →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry Note -->
          <tr>
            <td style="padding: 0 32px 24px 32px; text-align: center;">
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                This verification link will expire in <strong>1 hour</strong>.
              </p>
            </td>
          </tr>

          <!-- Fallback Link -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 12px;">
                Button not working? Copy and paste this link:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${escapeHtml(verifyLink)}" style="color: ${colors.blue}; text-decoration: underline;">${escapeHtml(verifyLink)}</a>
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">
                      🔒 <strong>Didn't create an account?</strong> You can safely ignore this email. Someone may have entered your email by mistake.
                    </p>
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
                © ${new Date().getFullYear()} ${escapeHtml(BRAND)}. All rights reserved.
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
}

function emailTextVerify(
  email: string,
  verifyLink: string,
  submittedAt: string,
) {
  return [
    "═══════════════════════════════════════",
    "NIER TRANSPORTATION",
    "═══════════════════════════════════════",
    "",
    "✉️ VERIFY YOUR EMAIL",
    "",
    "Welcome!",
    "",
    `Thanks for signing up with ${BRAND}. Please verify your email`,
    "address to complete your registration.",
    "",
    "───────────────────────────────────────",
    "ACCOUNT DETAILS",
    "───────────────────────────────────────",
    "",
    `📧 Email: ${email}`,
    `🕐 Requested: ${submittedAt}`,
    "",
    "───────────────────────────────────────",
    "",
    "Verify your email by clicking this link:",
    verifyLink,
    "",
    "⏰ This link will expire in 1 hour.",
    "",
    "───────────────────────────────────────",
    "",
    "🔒 Didn't create an account?",
    "You can safely ignore this email. Someone may have",
    "entered your email by mistake.",
    "",
    "───────────────────────────────────────",
    "",
    "Questions? Reply to this email or contact us anytime.",
    "",
    `© ${new Date().getFullYear()} ${BRAND}`,
  ].join("\n");
}

export const sendEmailVerificationToken = async (
  email: string,
  token: string,
) => {
  try {
    requireEnv("RESEND_API_KEY");
    if (!BASE_URL) throw new Error("Missing required env var: BASE_URL");

    const from = normalizeFrom(BRAND, RAW_FROM);
    const { timezone: companyTz } = await getCompanySettings();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailVerificationLink = `${BASE_URL.replace(/\/+$/, "")}/email-verification?token=${encodeURIComponent(
      token,
    )}`;
    const submittedAt = new Date().toLocaleString("en-US", {
      timeZone: companyTz,
      hour12: true,
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const subject = `✉️ Verify Your Email | ${BRAND}`;
    const res = await resend.emails.send({
      from,
      to: email,
      subject,
      html: emailHtmlVerify(email, emailVerificationLink, submittedAt),
      text: emailTextVerify(email, emailVerificationLink, submittedAt),
      headers: { "X-Website": BRAND, "X-Template": "EmailVerification" },
    });

    if (res.error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DEV] Resend error:", res.error);
        console.warn("[DEV] Verification link:", emailVerificationLink);
        return { error: null };
      }
      return { error: res.error.message || "Email send failed" };
    }

    return { error: null };
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      const emailVerificationLink = `${BASE_URL.replace(/\/+$/, "")}/email-verification?token=${encodeURIComponent(
        token,
      )}`;
      console.warn(
        "[DEV] sendEmailVerificationToken caught:",
        err?.message || err,
      );
      console.warn("[DEV] Verification link:", emailVerificationLink);
      return { error: null };
    }
    return { error: err?.message || "Unknown send error" };
  }
};
