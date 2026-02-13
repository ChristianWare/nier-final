/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import { getCompanySettings } from "../../actions/admin/companySettings";

export const getPasswordResetTokenByToken = async (token: string) => {
  try {
    return await db.passwordResetToken.findUnique({ where: { token } });
  } catch {
    return null;
  }
};

export const getPasswordResetTokenByEmail = async (email: string) => {
  try {
    return await db.passwordResetToken.findFirst({ where: { email } });
  } catch {
    return null;
  }
};

export const generatePasswordResetToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(Date.now() + 3600 * 1000);

  const existing = await getPasswordResetTokenByEmail(email);
  if (existing) {
    await db.passwordResetToken.delete({ where: { id: existing.id } });
  }

  return await db.passwordResetToken.create({
    data: { email, token, expires },
  });
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

  const hasNameFormat = NAME_ADDR_RE.test(raw);
  if (hasNameFormat) {
    return raw;
  }

  if (EMAIL_ONLY_RE.test(raw)) {
    return `${brand} <${raw}>`;
  }

  throw new Error(
    `RESEND_FROM is invalid. Use 'email@example.com' or 'Name <email@example.com>'. Received: "${raw}"`,
  );
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function emailHtmlReset(email: string, resetLink: string, submittedAt: string) {
  // Brand colors (matching your other emails)
  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    blue: "#2563eb",
    darkBlue: "#1d4ed8",
    lightBlue: "rgba(37, 99, 235, 0.1)",
    amber: "#f59e0b",
    lightAmber: "rgba(245, 158, 11, 0.15)",
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
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

          <!-- Password Reset Badge -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightBlue}; border: 1px solid ${colors.blue}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkBlue}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      🔐 Password Reset
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
                Reset Your Password
              </h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                We received a request to reset the password for your account.
              </p>
            </td>
          </tr>

          <!-- Request Details Card -->
          <tr>
            <td style="padding: 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Request Details
                    </span>
                  </td>
                </tr>

                <!-- Email -->
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">📧</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Account Email</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${email}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Requested At -->
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">🕐</span>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Requested At</span>
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
            <td style="padding: 0 32px 24px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 18px 48px; color: ${colors.white}; font-size: 16px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">
                      Reset Password →
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
                <a href="${resetLink}" style="color: ${colors.blue}; text-decoration: none;">${resetLink}</a>
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
                          <span style="color: #92400e; font-size: 14px; font-weight: 600;">This link expires in 1 hour</span>
                          <br>
                          <span style="color: #78350f; font-size: 13px; line-height: 1.5;">For security reasons, password reset links are only valid for a limited time. If the link expires, you can request a new one.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Didn't Request This -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">ℹ️</span>
                        </td>
                        <td>
                          <span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">Didn't request this?</span>
                          <br>
                          <span style="color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</span>
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
                Questions? Reply to this email or contact support.
              </p>
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
}

function emailTextReset(email: string, resetLink: string, submittedAt: string) {
  return [
    "═══════════════════════════════════════",
    "NIER TRANSPORTATION",
    "═══════════════════════════════════════",
    "",
    "🔐 PASSWORD RESET",
    "",
    "We received a request to reset the password for your account.",
    "",
    "───────────────────────────────────────",
    "REQUEST DETAILS",
    "───────────────────────────────────────",
    "",
    `📧 Account Email: ${email}`,
    `🕐 Requested At: ${submittedAt}`,
    "",
    "───────────────────────────────────────",
    "RESET YOUR PASSWORD",
    "───────────────────────────────────────",
    "",
    "Click the link below to reset your password:",
    "",
    resetLink,
    "",
    "───────────────────────────────────────",
    "⏰ IMPORTANT",
    "───────────────────────────────────────",
    "",
    "This link expires in 1 hour.",
    "",
    "For security reasons, password reset links are only",
    "valid for a limited time. If the link expires,",
    "you can request a new one.",
    "",
    "───────────────────────────────────────",
    "DIDN'T REQUEST THIS?",
    "───────────────────────────────────────",
    "",
    "If you didn't request a password reset, you can",
    "safely ignore this email. Your password will",
    "remain unchanged.",
    "",
    "───────────────────────────────────────",
    "",
    "Questions? Reply to this email or contact support.",
    "",
    `© ${new Date().getFullYear()} Nier Transportation. All rights reserved.`,
  ].join("\n");
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
  try {
    requireEnv("RESEND_API_KEY");
    if (!BASE_URL) throw new Error("Missing required env var: BASE_URL");

    const from = normalizeFrom(BRAND, RAW_FROM);
    const { timezone: companyTz } = await getCompanySettings();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const resetLink = `${BASE_URL.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    const submittedAt = formatDate(new Date(), companyTz);
    const subject = `🔐 Reset Your Password — ${BRAND}`;

    const res = await resend.emails.send({
      from,
      to: email,
      subject,
      html: emailHtmlReset(email, resetLink, submittedAt),
      text: emailTextReset(email, resetLink, submittedAt),
      headers: { "X-Website": BRAND, "X-Template": "PasswordReset" },
    });

    if (res.error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DEV] Resend error:", res.error);
        console.warn("[DEV] Password reset link:", resetLink);
        return { error: null };
      }
      return { error: res.error.message || "Email send failed" };
    }

    return { error: null };
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      const resetLink = `${BASE_URL.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
      console.warn("[DEV] sendPasswordResetEmail caught:", err?.message || err);
      console.warn("[DEV] Password reset link:", resetLink);
      return { error: null };
    }
    return { error: err?.message || "Unknown send error" };
  }
};
