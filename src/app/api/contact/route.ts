/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  siteUrl?: string;
  projectDescription: string;
  services?: string[];
};

const BRAND = process.env.BRAND_NAME || "Nier Transportation";
const CONTACT_TO = process.env.CONTACT_TO || process.env.SMTP_USER;
const CONTACT_FROM = process.env.CONTACT_FROM || process.env.SMTP_USER;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function escapeHtml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asList(items: string[] = []) {
  if (!items.length) return "<em style='opacity:.7'>None selected</em>";
  return `
    <ul style="margin:8px 0 0; padding-left:18px; line-height:1.6">
      ${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}
    </ul>
  `;
}

function emailHtml(payload: ContactPayload, submittedAt: string) {
  const {
    firstName,
    lastName,
    email,
    company,
    siteUrl,
    projectDescription,
    services = [],
  } = payload;

  const brandBlue = "#4e94ec";
  const sand = "#f4efe7";
  const ink = "#0f1720";

  return `
  <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; background:${sand}; padding:24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(0,0,0,.08)">
      <tr>
        <td style="background:${brandBlue}; color:#fff; padding:20px 24px">
          <div style="font-size:14px; opacity:.9; letter-spacing:.08em; text-transform:uppercase;">New Inquiry</div>
          <div style="font-size:20px; font-weight:700; margin-top:4px">${escapeHtml(
            BRAND
          )} — Contact Form</div>
          <div style="font-size:12px; opacity:.9; margin-top:6px">${submittedAt}</div>
        </td>
      </tr>

      <tr>
        <td style="padding:24px">
          <h2 style="margin:0 0 12px; font-size:18px; color:${ink}">Contact</h2>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; font-size:14px; color:${ink}">
            <tr>
              <td style="width:180px; padding:6px 0; opacity:.8">Name</td>
              <td style="padding:6px 0; font-weight:600">${escapeHtml(
                `${firstName} ${lastName}`.trim()
              )}</td>
            </tr>
            <tr>
              <td style="width:180px; padding:6px 0; opacity:.8">Email</td>
              <td style="padding:6px 0;">
                <a href="mailto:${encodeURIComponent(email)}" style="color:${brandBlue}; text-decoration:none">${escapeHtml(
                  email
                )}</a>
              </td>
            </tr>
            ${
              company
                ? `<tr><td style="width:180px; padding:6px 0; opacity:.8">Company</td><td style="padding:6px 0;">${escapeHtml(
                    company
                  )}</td></tr>`
                : ""
            }
            ${
              siteUrl
                ? `<tr><td style="width:180px; padding:6px 0; opacity:.8">Current booking URL</td><td style="padding:6px 0;"><a href="${escapeHtml(
                    siteUrl
                  )}" style="color:${brandBlue}; text-decoration:none">${escapeHtml(
                    siteUrl
                  )}</a></td></tr>`
                : ""
            }
          </table>

          <hr style="border:none; border-top:1px solid #eee; margin:20px 0" />

          <h2 style="margin:0 0 8px; font-size:18px; color:${ink}">Requested Services</h2>
          <div style="font-size:14px">${asList(services)}</div>

          <hr style="border:none; border-top:1px solid #eee; margin:20px 0" />

          <h2 style="margin:0 8px 8px 0; font-size:18px; color:${ink}">Project Description</h2>
          <div style="white-space:pre-wrap; background:#fafafa; border:1px solid #eee; border-radius:10px; padding:12px; font-size:14px; line-height:1.6; color:${ink}">
            ${escapeHtml(projectDescription)}
          </div>

          <div style="margin-top:20px; padding:12px 14px; background:#f8fbff; border:1px solid #e5f0ff; border-radius:12px; font-size:13px; color:${ink}">
            <strong>Reply tip:</strong> hit reply to contact <a href="mailto:${encodeURIComponent(
              email
            )}" style="color:${brandBlue}; text-decoration:none">${escapeHtml(
              email
            )}</a>. This email was generated from the ${escapeHtml(
              BRAND
            )} website contact form.
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

function emailText(payload: ContactPayload, submittedAt: string) {
  const {
    firstName,
    lastName,
    email,
    company,
    siteUrl,
    projectDescription,
    services = [],
  } = payload;

  return [
    `New Inquiry — ${BRAND}`,
    `Submitted: ${submittedAt}`,
    ``,
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : ``,
    siteUrl ? `Current booking URL: ${siteUrl}` : ``,
    ``,
    `Requested Services:`,
    services.length
      ? services.map((s) => `• ${s}`).join("\n")
      : `None selected`,
    ``,
    `Project Description:`,
    projectDescription,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    // --- Validate env
    requireEnv("SMTP_HOST");
    requireEnv("SMTP_PORT");
    requireEnv("SMTP_USER");
    requireEnv("SMTP_PASS");
    if (!CONTACT_TO || !CONTACT_FROM) {
      throw new Error("CONTACT_TO and CONTACT_FROM must be set");
    }

    // --- Parse body
    const body = (await req.json()) as Partial<ContactPayload>;
    const errors: string[] = [];

    if (!body.firstName) errors.push("firstName");
    if (!body.lastName) errors.push("lastName");
    if (!body.email) errors.push("email");
    if (!body.projectDescription) errors.push("projectDescription");

    if (errors.length) {
      return NextResponse.json(
        { error: "Missing required fields", fields: errors },
        { status: 422 }
      );
    }

    const payload: ContactPayload = {
      firstName: body.firstName!,
      lastName: body.lastName!,
      email: body.email!,
      company: body.company || "",
      siteUrl: body.siteUrl || "",
      projectDescription: body.projectDescription!,
      services: Array.isArray(body.services) ? body.services : [],
    };

    const submittedAt = new Date().toLocaleString("en-US", {
      timeZone: "America/Phoenix",
      hour12: true,
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    // --- Transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false otherwise
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    const subject = `New inquiry — ${BRAND} — ${payload.firstName} ${payload.lastName}${
      payload.company ? ` (${payload.company})` : ""
    }`;

    const info = await transporter.sendMail({
      from: `${BRAND} <${CONTACT_FROM}>`,
      to: CONTACT_TO,
      replyTo: payload.email,
      subject,
      html: emailHtml(payload, submittedAt),
      text: emailText(payload, submittedAt),
      headers: {
        "X-Website": BRAND,
        "X-Form": "Contact",
      },
    });

    return NextResponse.json({ messageId: info.messageId, ok: true });
  } catch (err: any) {
    console.error("CONTACT_POST_ERROR", err);
    return NextResponse.json(
      { error: "Internal error sending message" },
      { status: 500 }
    );
  }
}

// Optional: quick health check
export async function GET() {
  return NextResponse.json({ ok: true, brand: BRAND });
}
