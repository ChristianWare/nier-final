/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

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

// Very light email check; Resend does its own strict validation too.
const EMAIL_ONLY_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Detects "Display Name <email@domain.com>"
const NAME_ADDR_RE = /^([^<>]+)<\s*([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)\s*>$/i;

function normalizeFrom(brand: string, raw: string) {
  if (!raw) {
    throw new Error(
      "RESEND_FROM (or CONTACT_FROM) is empty. Set an address like noreply@yourdomain.com or 'Name <noreply@yourdomain.com>'."
    );
  }

  const hasNameFormat = NAME_ADDR_RE.test(raw);
  if (hasNameFormat) {
    return raw; // already "Name <email>"
  }

  if (EMAIL_ONLY_RE.test(raw)) {
    return `${brand} <${raw}>`; // add display name
  }

  throw new Error(
    `RESEND_FROM is invalid. Use 'email@example.com' or 'Name <email@example.com>'. Received: "${raw}"`
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

function emailHtmlReset(email: string, resetLink: string, submittedAt: string) {
  const brandBlue = "#4e94ec";
  const sand = "#f4efe7";
  const ink = "#0f1720";
  return `
  <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; background:${sand}; padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.08)">
      <tr>
        <td style="background:${brandBlue}; color:#fff; padding:20px 24px">
          <div style="font-size:14px; opacity:.9; letter-spacing:.08em; text-transform:uppercase;">Password Reset</div>
          <div style="font-size:20px; font-weight:700; margin-top:4px">${escapeHtml(
            BRAND
          )} — Reset Your Password</div>
          <div style="font-size:12px; opacity:.9; margin-top:6px">${submittedAt}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px; color:${ink}">
          <p style="margin:0 0 12px; font-size:16px;">We received a request to reset the password for <strong>${escapeHtml(
            email
          )}</strong>.</p>
          <p style="margin:0 0 18px; font-size:14px; opacity:.9;">Click the button below to choose a new password. This link will expire in 1 hour.</p>
          <div style="margin:18px 0;">
            <a href="${escapeHtml(
              resetLink
            )}" style="display:inline-block; padding:12px 18px; background:${brandBlue}; color:#fff; text-decoration:none; border-radius:10px; font-weight:600;">Reset password</a>
          </div>
          <p style="margin:18px 0 0; font-size:13px; line-height:1.6; opacity:.85;">If the button doesn’t work, copy and paste this URL into your browser:</p>
          <p style="margin:8px 0 18px; font-size:13px; word-break:break-all;">
            <a href="${escapeHtml(
              resetLink
            )}" style="color:${brandBlue}; text-decoration:none;">${escapeHtml(
              resetLink
            )}</a>
          </p>
          <div style="margin-top:16px; padding:12px 14px; background:#f8fbff; border:1px solid #e5f0ff; border-radius:12px; font-size:13px;">
            If you didn’t request this, you can safely ignore this email.
          </div>
        </td>
      </tr>
      <tr>
        <td style="background:#fafafa; padding:14px 24px; font-size:12px; color:#6b7280">
          © ${new Date().getFullYear()} ${escapeHtml(
            BRAND
          )}. “Fonts” for design. “Footers” for the technical foundation.
        </td>
      </tr>
    </table>
  </div>
  `;
}

function emailTextReset(email: string, resetLink: string, submittedAt: string) {
  return [
    `Password Reset — ${BRAND}`,
    `Submitted: ${submittedAt}`,
    ``,
    `We received a request to reset the password for: ${email}`,
    `This link expires in 1 hour.`,
    ``,
    `Reset link:`,
    resetLink,
    ``,
    `If you didn’t request this, ignore this email.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
  try {
    requireEnv("RESEND_API_KEY");
    if (!BASE_URL) throw new Error("Missing required env var: BASE_URL");

    const from = normalizeFrom(BRAND, RAW_FROM);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const resetLink = `${BASE_URL.replace(/\/+$/, "")}/password-reset-form?token=${encodeURIComponent(
      token
    )}`;
    const submittedAt = new Date().toLocaleString("en-US", {
      timeZone: "America/Phoenix",
      hour12: true,
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const subject = `Reset your password — ${BRAND}`;
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
      const resetLink = `${BASE_URL.replace(/\/+$/, "")}/password-reset-form?token=${encodeURIComponent(
        token
      )}`;
      console.warn("[DEV] sendPasswordResetEmail caught:", err?.message || err);
      console.warn("[DEV] Password reset link:", resetLink);
      return { error: null };
    }
    return { error: err?.message || "Unknown send error" };
  }
};
