/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/email/sendInvoiceLinkEmail.ts
import { Resend } from "resend";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import { renderInvoicePdfBuffer } from "@/lib/invoice/buildInvoicePdfData";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export type InvoiceLinkLineItem = {
  description: string;
  quantity: number;
  unitAmountCents: number;
};

export type InvoiceLinkArgs = {
  to: string;
  name?: string | null;
  invoiceNumber: string;
  lineItems: InvoiceLinkLineItem[];
  subtotalCents: number;
  totalDueCents: number;
  currency: string;
  payUrl: string;
  memo?: string | null;
  dueDateISO?: string | null;
  invoiceId?: string | null;
};

export async function sendInvoiceLinkEmail(args: InvoiceLinkArgs): Promise<void> {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const settings = await getCompanySettings();
  const companyName = settings.companyName ?? "Nier Transportation";
  const supportEmail = settings.supportEmail ?? settings.emailReplyTo ?? "";
  const dispatchPhone = settings.dispatchPhone ?? "";
  const footerText = settings.emailFooterText ?? "";

  const firstName = (args.name ?? "").trim().split(" ")[0] || "there";
  const currency = args.currency ?? "usd";
  const dueOn = fmtDate(args.dueDateISO ?? null);

  const itemRows = args.lineItems
    .map((li) => {
      const lineTotal = li.quantity * li.unitAmountCents;
      const qtyNote =
        li.quantity > 1
          ? `<div style="font-size:13px;color:#888;">${li.quantity} × ${money(li.unitAmountCents, currency)}</div>`
          : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:15px;color:#1a1a1a;">
            ${li.description}${qtyNote}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:15px;color:#1a1a1a;text-align:right;white-space:nowrap;">
            ${money(lineTotal, currency)}
          </td>
        </tr>`;
    })
    .join("");

  const memoBlock = args.memo
    ? `<p style="margin:20px 0 0;padding:14px 16px;background:#f6f5f2;border-radius:8px;font-size:14px;color:#555;">${args.memo}</p>`
    : "";

  const html = `
  <div style="background:#f4f4f4;padding:32px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eaeaea;">
      <div style="background:#000000;padding:28px 32px;">
        <div style="color:#ffffff;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;">${companyName}</div>
        <div style="color:#ffffff;font-size:24px;font-weight:800;margin-top:4px;">Invoice ${args.invoiceNumber}</div>
      </div>

      <div style="padding:32px;">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 4px;">Hi ${firstName},</p>
        <p style="font-size:15px;color:#555;margin:0 0 24px;">
          Here's your invoice from ${companyName}${dueOn ? `, due ${dueOn}` : ""}.
          You can pay securely online using the button below.
        </p>

        <table style="width:100%;border-collapse:collapse;">
          ${itemRows}
        </table>

        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">Subtotal</td>
            <td style="padding:6px 0;font-size:14px;color:#555;text-align:right;">${money(args.subtotalCents, currency)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;font-size:17px;font-weight:800;color:#1a1a1a;border-top:2px solid #000;">Amount due</td>
            <td style="padding:12px 0 0;font-size:17px;font-weight:800;color:#1a1a1a;text-align:right;border-top:2px solid #000;">${money(args.totalDueCents, currency)}</td>
          </tr>
        </table>

        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${args.payUrl}"
             style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 32px;border-radius:8px;">
            Pay ${money(args.totalDueCents, currency)}
          </a>
        </div>
        <p style="text-align:center;font-size:12px;color:#aaa;margin:0;">
          Or paste this link into your browser:<br />${args.payUrl}
        </p>

        ${memoBlock}

        <p style="font-size:13px;color:#999;margin:28px 0 0;">
          ${supportEmail ? `Questions? Email ${supportEmail}. ` : ""}${dispatchPhone ? `Call ${dispatchPhone}.` : ""}
        </p>
        ${footerText ? `<p style="font-size:12px;color:#bbb;margin:12px 0 0;">${footerText}</p>` : ""}
      </div>
    </div>
  </div>`;

  const text = [
    `Invoice ${args.invoiceNumber} from ${companyName}`,
    dueOn ? `Due ${dueOn}` : "",
    ``,
    ...args.lineItems.map(
      (li) =>
        `${li.description}${li.quantity > 1 ? ` (${li.quantity} × ${money(li.unitAmountCents, currency)})` : ""}: ${money(li.quantity * li.unitAmountCents, currency)}`,
    ),
    ``,
    `Amount due: ${money(args.totalDueCents, currency)}`,
    ``,
    `Pay online: ${args.payUrl}`,
    ...(args.memo ? ["", args.memo] : []),
  ]
    .filter(Boolean)
    .join("\n");

  // ── Attach the invoice PDF (best-effort) ──
  let attachments: Array<{ filename: string; content: Buffer }> | undefined;
  if (args.invoiceId) {
    const pdf = await renderInvoicePdfBuffer(args.invoiceId);
    if (pdf) {
      attachments = [
        { filename: `invoice-${args.invoiceNumber}.pdf`, content: pdf },
      ];
    }
  }

  await resend.emails.send({
    from,
    to: args.to,
    subject: `Invoice ${args.invoiceNumber} from ${companyName}`,
    html,
    text,
    ...(attachments ? { attachments } : {}),
  });
}