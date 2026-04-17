"use server";

import { Resend } from "resend";
import { auth } from "../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "./companySettings";
import { revalidatePath } from "next/cache";
import { generateInvoicePDF } from "@/lib/invoice";
import { buildInvoiceDataForBooking } from "@/lib/email/sendPaymentConfirmationEmail";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function sendInvoiceEmail(formData: FormData): Promise<{
  success?: true;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const bookingId = formData.get("bookingId")?.toString().trim();
  const overrideEmail =
    formData.get("overrideEmail")?.toString().trim() || null;

  if (!bookingId) return { error: "Missing booking ID" };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      user: { select: { email: true, name: true } },
      guestEmail: true,
      guestName: true,
      totalCents: true,
      currency: true,
    },
  });

  if (!booking) return { error: "Booking not found" };

  const recipientEmail =
    overrideEmail ?? booking.user?.email ?? booking.guestEmail ?? null;

  if (!recipientEmail)
    return { error: "No email address found for this booking." };
  if (!isValidEmail(recipientEmail)) return { error: "Invalid email address." };

  const recipientName =
    booking.user?.name?.trim() || booking.guestName?.trim() || "there";
  const firstName = recipientName.split(" ")[0] || "there";
  const confirmationCode = bookingId.slice(0, 8).toUpperCase();

  const companySettings = await getCompanySettings();
  const companyName = companySettings.officeName || "Nier Transportation";

  // Generate PDF directly without HTTP round-trip (avoids auth issues)
  let pdfBuffer: Buffer;
  try {
    const { invoiceData } = await buildInvoiceDataForBooking(bookingId);
    if (!invoiceData) return { error: "Could not build invoice data." };
    pdfBuffer = await generateInvoicePDF(invoiceData);
  } catch (e) {
    console.error("Invoice PDF generation failed:", e);
    return { error: "Failed to generate invoice PDF." };
  }

  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    green: "#16a34a",
    lightGreen: "#dcfce7",
    darkGreen: "#14532d",
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Invoice</title></head>
<body style="margin:0;padding:0;background-color:${colors.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${colors.cream};">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:${colors.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background-color:${colors.black};padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:${colors.white};font-size:22px;font-weight:600;letter-spacing:-0.5px;">${companyName.toUpperCase()}</h1>
        </td></tr>
        <tr><td style="padding:32px 32px 0 32px;text-align:center;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
            <tr><td style="background-color:${colors.lightGreen};border:1px solid ${colors.green};border-radius:50px;padding:12px 24px;">
              <span style="color:${colors.darkGreen};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">✅ Invoice</span>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px 28px 32px;text-align:center;">
          <h2 style="margin:0 0 12px 0;color:${colors.black};font-size:26px;font-weight:600;letter-spacing:-1px;">Hi ${firstName}!</h2>
          <p style="margin:0;color:${colors.paragraph};font-size:16px;line-height:1.5;">Please find your invoice attached to this email. Thank you for choosing ${companyName}.</p>
        </td></tr>
        <tr><td style="padding:0 32px 28px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${colors.cream};border-radius:12px;overflow:hidden;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid ${colors.stroke};">
              <span style="color:${colors.black};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Invoice Summary</span>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <span style="color:${colors.paragraph};font-size:12px;text-transform:uppercase;letter-spacing:0.3px;">Invoice #</span><br>
              <span style="color:${colors.black};font-size:18px;font-weight:700;font-family:monospace;letter-spacing:1px;">${confirmationCode}</span>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color:${colors.cream};padding:24px 32px;text-align:center;border-top:1px solid ${colors.stroke};">
          <p style="margin:0 0 8px 0;color:${colors.paragraph};font-size:13px;">Questions? Reply to this email or contact us anytime.</p>
          <p style="margin:0;color:${colors.paragraph};font-size:12px;opacity:0.7;">${companyName} · ${companySettings.supportEmail ?? ""} · ${companySettings.dispatchPhone ?? ""}</p>
          <p style="margin:8px 0 0 0;color:${colors.paragraph};font-size:12px;opacity:0.7;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = [
    companyName.toUpperCase(),
    "",
    "INVOICE",
    `Hi ${firstName},`,
    "Please find your invoice attached. Thank you for choosing " +
      companyName +
      ".",
    "",
    `Invoice #: ${confirmationCode}`,
    "",
    `Questions? ${companySettings.supportEmail ?? ""} | ${companySettings.dispatchPhone ?? ""}`,
  ].join("\n");

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const { error: resendError } = await resend.emails.send({
    from,
    to: recipientEmail,
    subject: `Invoice — ${companyName} (Ref #${confirmationCode})`,
    html,
    text,
    attachments: [
      {
        filename: `invoice-${confirmationCode}.pdf`,
        content: Buffer.from(pdfBuffer),
      },
    ],
  });

  if (resendError)
    return { error: resendError.message ?? "Failed to send email." };

  await db.bookingStatusEvent.create({
    data: {
      bookingId,
      status: booking.status,
      eventType: "INVOICE_SENT",
      metadata: {
        recipientEmail,
        isOverrideEmail: Boolean(overrideEmail),
      },
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
