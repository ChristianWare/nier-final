/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

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
      "RESEND_FROM (or CONTACT_FROM) is empty. Set an address like noreply@yourdomain.com or 'Name <noreply@yourdomain.com>'."
    );
  }
  if (NAME_ADDR_RE.test(raw)) return raw;
  if (EMAIL_ONLY_RE.test(raw)) return `${brand} <${raw}>`;
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

function emailHtmlVerify(
  email: string,
  verifyLink: string,
  submittedAt: string
) {
  const brandBlue = "#4e94ec";
  const brandYellow = "#d0311e";
  // const sand = "#f8f7ec";
  const white = "#ffffff";
  const ink = "#0f1720";
  return `
  <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; background:${white}; padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.08)">
      <tr>
        <td style="background:${brandYellow}; color:#fff; padding:20px 24px">
          <div style="font-size:14px; opacity:.9; letter-spacing:.08em; text-transform:uppercase;">Email Verification</div>
          <div style="font-size:20px; font-weight:700; margin-top:4px; color:#f8f7ec;">${escapeHtml(
            BRAND
          )} — Verify Your Email</div>
          <div style="font-size:12px; opacity:.9; margin-top:6px">${submittedAt}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px; color:${ink}">
          <p style="margin:0 0 12px; font-size:16px;">Thanks for signing up with <strong>${escapeHtml(
            BRAND
          )}</strong>.</p>
          <p style="margin:0 0 18px; font-size:14px; opacity:.9;">Please confirm that <strong>${escapeHtml(
            email
          )}</strong> is your email address. This link will expire in 1 hour.</p>
          <div style="margin:18px 0;">
            <a href="${escapeHtml(
              verifyLink
            )}" style="display:inline-block; padding:12px 18px; background:${brandYellow}; color:#f8f7ec; text-decoration:none; border-radius:10px; font-weight:600;">Verify email</a>
          </div>
          <p style="margin:18px 0 0; font-size:13px; line-height:1.6; opacity:.85;">If the button doesn’t work, copy and paste this URL into your browser:</p>
          <p style="margin:8px 0 18px; font-size:13px; word-break:break-all;">
            <a href="${escapeHtml(
              verifyLink
            )}" style="color:${brandBlue}; text-decoration:none;">${escapeHtml(
              verifyLink
            )}</a>
          </p>
          <div style="margin-top:16px; padding:12px 14px; background:#f8fbff; border:1px solid #e5f0ff; border-radius:12px; font-size:13px;">
            If you didn’t create an account, you can ignore this email.
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

function emailTextVerify(
  email: string,
  verifyLink: string,
  submittedAt: string
) {
  return [
    `Email Verification — ${BRAND}`,
    `Submitted: ${submittedAt}`,
    ``,
    `Please confirm that this is your email: ${email}`,
    `This link expires in 1 hour.`,
    ``,
    `Verify link:`,
    verifyLink,
    ``,
    `If you didn’t create an account, ignore this email.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const sendEmailVerificationToken = async (
  email: string,
  token: string
) => {
  try {
    requireEnv("RESEND_API_KEY");
    if (!BASE_URL) throw new Error("Missing required env var: BASE_URL");

    const from = normalizeFrom(BRAND, RAW_FROM);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailVerificationLink = `${BASE_URL.replace(/\/+$/, "")}/email-verification?token=${encodeURIComponent(
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

    const subject = `Verify your email — ${BRAND}`;
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
        token
      )}`;
      console.warn(
        "[DEV] sendEmailVerificationToken caught:",
        err?.message || err
      );
      console.warn("[DEV] Verification link:", emailVerificationLink);
      return { error: null };
    }
    return { error: err?.message || "Unknown send error" };
  }
};
