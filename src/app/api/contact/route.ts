/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getCompanySettings } from "../../../../actions/admin/companySettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceNeeded?: string;
  groupSize?: string;
  message: string;
  captchaToken: string;
};

const BRAND = process.env.CLIENT_NAME || "Nier Transportation";
const RESEND_FROM = process.env.RESEND_FROM!;

function escapeHtml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── reCAPTCHA Verification ───
async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("RECAPTCHA_SECRET_KEY not set — skipping verification");
    return true;
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("reCAPTCHA verification failed:", err);
    return false;
  }
}

// ─── Email HTML ───
function emailHtml(payload: ContactPayload, submittedAt: string) {
  const {
    firstName,
    lastName,
    email,
    phone,
    serviceNeeded,
    groupSize,
    message,
  } = payload;

  const brandColor = "#1a1a1a";
  const sand = "#f4efe7";
  const ink = "#0f1720";

  return `
  <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; background:${sand}; padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.08)">
      <tr>
        <td style="background:${brandColor}; color:#fff; padding:20px 24px">
          <div style="font-size:14px; opacity:.9; letter-spacing:.08em; text-transform:uppercase;">New Inquiry</div>
          <div style="font-size:20px; font-weight:700; margin-top:4px">${escapeHtml(BRAND)} — Contact Form</div>
          <div style="font-size:12px; opacity:.9; margin-top:6px">${submittedAt}</div>
        </td>
      </tr>

      <tr>
        <td style="padding:24px">
          <h2 style="margin:0 0 12px; font-size:18px; color:${ink}">Contact Details</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; font-size:14px; color:${ink}">
            <tr>
              <td style="width:180px; padding:6px 0; opacity:.8">Name</td>
              <td style="padding:6px 0; font-weight:600">${escapeHtml(`${firstName} ${lastName}`.trim())}</td>
            </tr>
            <tr>
              <td style="width:180px; padding:6px 0; opacity:.8">Email</td>
              <td style="padding:6px 0;">
                <a href="mailto:${encodeURIComponent(email)}" style="color:#4e94ec; text-decoration:none">${escapeHtml(email)}</a>
              </td>
            </tr>
            <tr>
              <td style="width:180px; padding:6px 0; opacity:.8">Phone</td>
              <td style="padding:6px 0;">
                <a href="tel:${escapeHtml(phone.replace(/\D/g, ""))}" style="color:#4e94ec; text-decoration:none">${escapeHtml(phone)}</a>
              </td>
            </tr>
            ${
              serviceNeeded
                ? `<tr><td style="width:180px; padding:6px 0; opacity:.8">Service Needed</td><td style="padding:6px 0; font-weight:600">${escapeHtml(serviceNeeded)}</td></tr>`
                : ""
            }
            ${
              groupSize
                ? `<tr><td style="width:180px; padding:6px 0; opacity:.8">Group Size</td><td style="padding:6px 0;">${escapeHtml(groupSize)} passengers</td></tr>`
                : ""
            }
          </table>

          <hr style="border:none; border-top:1px solid #eee; margin:20px 0" />

          <h2 style="margin:0 8px 8px 0; font-size:18px; color:${ink}">Message</h2>
          <div style="white-space:pre-wrap; background:#fafafa; border:1px solid #eee; border-radius:10px; padding:12px; font-size:14px; line-height:1.6; color:${ink}">
            ${escapeHtml(message)}
          </div>

          <div style="margin-top:20px; padding:12px 14px; background:#f8fbff; border:1px solid #e5f0ff; border-radius:12px; font-size:13px; color:${ink}">
            <strong>Reply tip:</strong> Hit reply to contact <a href="mailto:${encodeURIComponent(email)}" style="color:#4e94ec; text-decoration:none">${escapeHtml(email)}</a> or call <a href="tel:${escapeHtml(phone.replace(/\D/g, ""))}" style="color:#4e94ec; text-decoration:none">${escapeHtml(phone)}</a>.
          </div>
        </td>
      </tr>

      <tr>
        <td style="background:#fafafa; padding:14px 24px; font-size:12px; color:#6b7280">
          &copy; ${new Date().getFullYear()} ${escapeHtml(BRAND)}. This email was generated from the website contact form.
        </td>
      </tr>
    </table>
  </div>
  `;
}

// ─── POST Handler ───
export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY env var");
    }
    if (!RESEND_FROM) {
      throw new Error("Missing RESEND_FROM env var");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = (await req.json()) as Partial<ContactPayload>;

    // ─── Validate reCAPTCHA ───
    if (!body.captchaToken) {
      return NextResponse.json(
        { error: "reCAPTCHA verification required" },
        { status: 422 },
      );
    }

    const captchaValid = await verifyCaptcha(body.captchaToken);
    if (!captchaValid) {
      return NextResponse.json(
        { error: "reCAPTCHA verification failed" },
        { status: 422 },
      );
    }

    // ─── Validate required fields ───
    const errors: string[] = [];
    if (!body.firstName?.trim()) errors.push("firstName");
    if (!body.lastName?.trim()) errors.push("lastName");
    if (!body.email?.trim()) errors.push("email");
    if (!body.phone?.trim()) errors.push("phone");
    if (!body.message?.trim()) errors.push("message");

    if (errors.length) {
      return NextResponse.json(
        { error: "Missing required fields", fields: errors },
        { status: 422 },
      );
    }

    const payload: ContactPayload = {
      firstName: body.firstName!.trim(),
      lastName: body.lastName!.trim(),
      email: body.email!.trim(),
      phone: body.phone!.trim(),
      serviceNeeded: body.serviceNeeded?.trim() || "",
      groupSize: body.groupSize?.trim() || "",
      message: body.message!.trim(),
      captchaToken: body.captchaToken,
    };

    const { timezone: companyTz, supportEmail } = await getCompanySettings();

    const submittedAt = new Date().toLocaleString("en-US", {
      timeZone: companyTz,
      hour12: true,
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const toEmail =
      supportEmail?.trim() ||
      process.env.CONTACT_TO ||
      "reservations@niertransportation.com";

    const subject = `New inquiry — ${payload.firstName} ${payload.lastName}${
      payload.serviceNeeded ? ` — ${payload.serviceNeeded}` : ""
    }`;

    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: toEmail,
      replyTo: payload.email,
      subject,
      html: emailHtml(payload, submittedAt),
    });

    if (error) {
      console.error("RESEND_ERROR", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 },
      );
    }

    return NextResponse.json({ messageId: data?.id, ok: true });
  } catch (err: any) {
    console.error("CONTACT_POST_ERROR", err);
    return NextResponse.json(
      { error: "Internal error sending message" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, brand: BRAND });
}
