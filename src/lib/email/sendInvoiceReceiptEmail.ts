/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/email/sendInvoiceReceiptEmail.ts
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

export type InvoiceReceiptLineItem = {
  description: string;
  quantity: number;
  unitAmountCents: number;
};

export type InvoiceReceiptArgs = {
  to: string;
  name?: string | null;
  invoiceNumber: string;
  lineItems: InvoiceReceiptLineItem[];
  subtotalCents: number;
  tipCents: number;
  amountPaidCents: number;
  currency: string;
  paidAtISO: string | null;
  memo?: string | null;
  invoiceId?: string | null;
};

export async function sendInvoiceReceiptEmail(
  args: InvoiceReceiptArgs,
): Promise<void> {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const settings = await getCompanySettings();
  const companyName = settings.companyName ?? "Nier Transportation";
  const supportEmail = settings.supportEmail ?? settings.emailReplyTo ?? "";
  const dispatchPhone = settings.dispatchPhone ?? "";
  const footerText = settings.emailFooterText ?? "";

  const firstName = (args.name ?? "").trim().split(" ")[0] || "there";
  const currency = args.currency ?? "usd";

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

  const tipRow =
    args.tipCents > 0
      ? `<tr>
           <td style="padding:6px 0;font-size:14px;color:#555;">Tip</td>
           <td style="padding:6px 0;font-size:14px;color:#555;text-align:right;">${money(args.tipCents, currency)}</td>
         </tr>`
      : "";

  const memoBlock = args.memo
    ? `<p style="margin:24px 0 0;padding:14px 16px;background:#f6f5f2;border-radius:8px;font-size:14px;color:#555;">${args.memo}</p>`
    : "";

  const paidOn = fmtDate(args.paidAtISO);

  const html = `
  <div style="background:#f4f4f4;padding:32px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #eaeaea;">
      <div style="background:#000000;padding:28px 32px;">
        <div style="color:#ffffff;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;">${companyName}</div>
        <div style="color:#ffffff;font-size:24px;font-weight:800;margin-top:4px;">Payment received</div>
      </div>

      <div style="padding:32px;">
        <p style="font-size:16px;color:#1a1a1a;margin:0 0 4px;">Hi ${firstName},</p>
        <p style="font-size:15px;color:#555;margin:0 0 24px;">
          Thanks — we've received your payment for invoice
          <strong>${args.invoiceNumber}</strong>${paidOn ? ` on ${paidOn}` : ""}.
        </p>

        <table style="width:100%;border-collapse:collapse;">
          ${itemRows}
        </table>

        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">Subtotal</td>
            <td style="padding:6px 0;font-size:14px;color:#555;text-align:right;">${money(args.subtotalCents, currency)}</td>
          </tr>
          ${tipRow}
          <tr>
            <td style="padding:12px 0 0;font-size:17px;font-weight:800;color:#1a1a1a;border-top:2px solid #000;">Total paid</td>
            <td style="padding:12px 0 0;font-size:17px;font-weight:800;color:#1a1a1a;text-align:right;border-top:2px solid #000;">${money(args.amountPaidCents, currency)}</td>
          </tr>
        </table>

        ${memoBlock}

        <p style="font-size:13px;color:#999;margin:28px 0 0;">
          ${supportEmail ? `Questions? Email ${supportEmail}. ` : ""}${dispatchPhone ? `Call ${dispatchPhone}.` : ""}
        </p>
        ${footerText ? `<p style="font-size:12px;color:#bbb;margin:12px 0 0;">${footerText}</p>` : ""}
      </div>
    </div>
  </div>`;

  const text = [
    `Payment received — invoice ${args.invoiceNumber}`,
    ``,
    ...args.lineItems.map(
      (li) =>
        `${li.description}${li.quantity > 1 ? ` (${li.quantity} × ${money(li.unitAmountCents, currency)})` : ""}: ${money(li.quantity * li.unitAmountCents, currency)}`,
    ),
    ``,
    `Subtotal: ${money(args.subtotalCents, currency)}`,
    ...(args.tipCents > 0 ? [`Tip: ${money(args.tipCents, currency)}`] : []),
    `Total paid: ${money(args.amountPaidCents, currency)}`,
    ...(args.memo ? ["", args.memo] : []),
  ].join("\n");

  // ── Attach the receipt PDF (best-effort) ──
  let attachments: Array<{ filename: string; content: Buffer }> | undefined;
  if (args.invoiceId) {
    const pdf = await renderInvoicePdfBuffer(args.invoiceId);
    if (pdf) {
      attachments = [
        { filename: `receipt-${args.invoiceNumber}.pdf`, content: pdf },
      ];
    }
  }

  await resend.emails.send({
    from,
    to: args.to,
    subject: `Receipt for invoice ${args.invoiceNumber} — ${companyName}`,
    html,
    text,
    ...(attachments ? { attachments } : {}),
  });
}