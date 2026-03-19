/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/email/sendPaymentConfirmationEmail.ts
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import InvoicePDF from "@/lib/invoice/InvoicePDF";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function formatMoney(cents: number, currency: string) {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPickupDate(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatPickupTime(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export type PaymentConfirmationArgs = {
  to: string;
  name?: string | null;
  bookingId: string;

  pickupAtISO: string;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName?: string | null;
  vehicleName?: string | null;
  passengers?: number;
  luggage?: number;

  totalCents: number;
  amountPaidCents: number;
  tipCents?: number;
  currency: string;
  paymentMethod?: string | null;

  isGroupBooking?: boolean;
  groupLegs?: Array<{
    legNumber: number;
    date: string;
    pickupAddress: string;
    dropoffAddress: string;
    serviceName: string;
    amountCents: number;
  }>;

  invoiceData?: InvoiceData | null;
  successUrl?: string | null;
};

export async function sendPaymentConfirmationEmail(
  args: PaymentConfirmationArgs,
): Promise<void> {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("RESEND_FROM");

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone ?? "America/Phoenix";

  const name = (args.name ?? "").trim();
  const firstName = name.split(" ")[0] || "there";
  const confirmationCode = args.bookingId.slice(0, 8).toUpperCase();

  const pickupDate = formatPickupDate(args.pickupAtISO, companyTz);
  const pickupTime = formatPickupTime(args.pickupAtISO, companyTz);
  const totalFormatted = formatMoney(args.totalCents, args.currency);
  const amountPaidFormatted = formatMoney(args.amountPaidCents, args.currency);
  const tipFormatted =
    args.tipCents && args.tipCents > 0
      ? formatMoney(args.tipCents, args.currency)
      : null;

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const dashboardUrl = `${APP_URL}/dashboard`;

  const subject = `🎉 Payment Confirmed – Your Ride is Booked | Nier Transportation`;

  const colors = {
    black: "#000000",
    white: "#ffffff",
    cream: "#eae9e6",
    accent: "#d0311e",
    paragraph: "#676767",
    stroke: "#d8d6d2",
    green: "#16a34a",
    darkGreen: "#0b7547",
    lightGreen: "rgba(22, 163, 74, 0.15)",
  };

  const legsHtml =
    args.isGroupBooking && args.groupLegs && args.groupLegs.length > 0
      ? `
        <tr>
          <td style="padding: 0 32px 28px 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                  <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    Trip Itinerary (${args.groupLegs.length} Rides)
                  </span>
                </td>
              </tr>
              ${args.groupLegs
                .map(
                  (leg, idx) => `
                <tr>
                  <td style="padding: 14px 20px; ${idx < (args.groupLegs?.length ?? 0) - 1 ? `border-bottom: 1px solid ${colors.stroke};` : ""}">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;">
                          <div style="width: 24px; height: 24px; background-color: ${colors.black}; border-radius: 50%; text-align: center; line-height: 24px;">
                            <span style="color: ${colors.white}; font-size: 11px; font-weight: 700;">${leg.legNumber}</span>
                          </div>
                        </td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;">Ride ${leg.legNumber} · ${leg.serviceName}</span>
                          <br>
                          <span style="color: ${colors.black}; font-size: 13px; font-weight: 600;">${leg.date}</span>
                          <br>
                          <span style="color: ${colors.paragraph}; font-size: 12px; line-height: 1.4;">${leg.pickupAddress} → ${leg.dropoffAddress}</span>
                        </td>
                        <td align="right" valign="top">
                          <span style="color: ${colors.black}; font-size: 14px; font-weight: 700;">${formatMoney(leg.amountCents, args.currency)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              `,
                )
                .join("")}
            </table>
          </td>
        </tr>
      `
      : "";

  const tipRowHtml = tipFormatted
    ? `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px solid ${colors.stroke};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td><span style="color: ${colors.paragraph}; font-size: 14px;">Driver Tip</span></td>
              <td align="right"><span style="color: ${colors.darkGreen}; font-size: 14px; font-weight: 600;">+ ${tipFormatted}</span></td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : "";

  const paymentMethodHtml = args.paymentMethod
    ? `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px solid ${colors.stroke};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td><span style="color: ${colors.paragraph}; font-size: 14px;">Payment Method</span></td>
              <td align="right"><span style="color: ${colors.black}; font-size: 14px; font-weight: 500;">${args.paymentMethod}</span></td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <tr>
            <td style="background-color: ${colors.black}; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: ${colors.white}; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">NIER TRANSPORTATION</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.lightGreen}; border: 1px solid ${colors.green}; border-radius: 50px; padding: 12px 24px;">
                    <span style="color: ${colors.darkGreen}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">✓ Payment Confirmed</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 28px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; color: ${colors.black}; font-size: 26px; font-weight: 600; letter-spacing: -1px; line-height: 1.2;">Thank you, ${firstName}!</h2>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 16px; line-height: 1.5;">
                Your payment has been received and your ride is confirmed. Your invoice is attached to this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${args.isGroupBooking ? `Multi-Day Trip — ${args.groupLegs?.length ?? ""} Rides` : "Trip Details"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px 12px 20px;">
                    <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Confirmation</span><br>
                    <span style="color: ${colors.black}; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${confirmationCode}</span>
                  </td>
                </tr>
                ${
                  !args.isGroupBooking
                    ? `
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">📅</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Pickup Date & Time</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${pickupDate}</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${pickupTime}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">📍</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Pickup</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${args.pickupAddress}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">🏁</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">Dropoff</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 500; line-height: 1.4;">${args.dropoffAddress}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                    : `
                <tr>
                  <td style="padding: 12px 20px 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="padding-right: 12px;"><span style="font-size: 18px;">📅</span></td>
                        <td>
                          <span style="color: ${colors.paragraph}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px;">First Pickup</span><br>
                          <span style="color: ${colors.black}; font-size: 15px; font-weight: 600;">${pickupDate} at ${pickupTime}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                `
                }
              </table>
            </td>
          </tr>

          ${legsHtml}

          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.cream}; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid ${colors.stroke};">
                    <span style="color: ${colors.black}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Payment Summary</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; border-bottom: 1px solid ${colors.stroke};">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td><span style="color: ${colors.paragraph}; font-size: 14px;">Trip Total</span></td>
                              <td align="right"><span style="color: ${colors.black}; font-size: 14px; font-weight: 600;">${totalFormatted}</span></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${tipRowHtml}
                      ${paymentMethodHtml}
                      <tr>
                        <td style="padding: 12px 0 6px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td><span style="color: ${colors.black}; font-size: 16px; font-weight: 700;">Amount Paid</span></td>
                              <td align="right"><span style="color: ${colors.darkGreen}; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${amountPaidFormatted}</span></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #bae6fd;">
                    <span style="color: #0369a1; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">What's Next?</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr><td style="padding: 4px 0;"><span style="color: #0c4a6e; font-size: 14px; line-height: 1.5;">✓ &nbsp;Your invoice is attached to this email</span></td></tr>
                      <tr><td style="padding: 4px 0;"><span style="color: #0c4a6e; font-size: 14px; line-height: 1.5;">✓ &nbsp;Your driver will contact you before pickup</span></td></tr>
                      <tr><td style="padding: 4px 0;"><span style="color: #0c4a6e; font-size: 14px; line-height: 1.5;">✓ &nbsp;Track your ride status in your dashboard</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: ${colors.black}; border-radius: 8px;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: ${colors.white}; font-size: 15px; font-weight: 600; text-decoration: none; letter-spacing: -0.3px;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: ${colors.cream}; padding: 24px 32px; text-align: center; border-top: 1px solid ${colors.stroke};">
              <p style="margin: 0 0 8px 0; color: ${colors.paragraph}; font-size: 13px; line-height: 1.5;">Questions? Reply to this email or contact us anytime.</p>
              <p style="margin: 0; color: ${colors.paragraph}; font-size: 12px; opacity: 0.7;">© ${new Date().getFullYear()} Nier Transportation. All rights reserved.</p>
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
    "NIER TRANSPORTATION",
    "",
    "🎉 PAYMENT CONFIRMED",
    "",
    `Thank you, ${firstName}! Your payment has been received.`,
    "Your invoice is attached to this email.",
    "",
    `Confirmation: ${confirmationCode}`,
    "",
    ...(args.isGroupBooking && args.groupLegs
      ? args.groupLegs.map(
          (leg) =>
            `Ride ${leg.legNumber}: ${leg.serviceName} — ${leg.date}\n  ${leg.pickupAddress} → ${leg.dropoffAddress}\n  ${formatMoney(leg.amountCents, args.currency)}`,
        )
      : [
          `Pickup: ${pickupDate} at ${pickupTime}`,
          `From: ${args.pickupAddress}`,
          `To: ${args.dropoffAddress}`,
        ]),
    "",
    `Trip Total: ${totalFormatted}`,
    ...(tipFormatted ? [`Driver Tip: ${tipFormatted}`] : []),
    ...(args.paymentMethod ? [`Payment Method: ${args.paymentMethod}`] : []),
    `Amount Paid: ${amountPaidFormatted}`,
    "",
    `Track your ride: ${dashboardUrl}`,
    "",
    `© ${new Date().getFullYear()} Nier Transportation`,
  ].join("\n");

  // ── Generate PDF attachment ──
  let pdfAttachment: { filename: string; content: Buffer } | undefined;

  if (args.invoiceData) {
    try {
      let resolvedInvoice = args.invoiceData;
      if (args.invoiceData.logoUrl) {
        try {
          const response = await fetch(args.invoiceData.logoUrl);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/png";
          resolvedInvoice = {
            ...args.invoiceData,
            logoUrl: `data:${mimeType};base64,${base64}`,
          };
        } catch {
          resolvedInvoice = { ...args.invoiceData, logoUrl: undefined };
        }
      }

      // Cast to any to satisfy @react-pdf/renderer's strict ReactElement<DocumentProps> typing
      const pdfBuffer = await renderToBuffer(
        createElement(InvoicePDF, { invoice: resolvedInvoice }) as any,
      );

      pdfAttachment = {
        filename: `invoice-${confirmationCode}.pdf`,
        content: Buffer.from(pdfBuffer),
      };
    } catch (e) {
      console.error("[sendPaymentConfirmationEmail] PDF generation failed:", e);
    }
  }

  await resend.emails.send({
    from,
    to: args.to,
    subject,
    html,
    text,
    ...(pdfAttachment
      ? {
          attachments: [
            {
              filename: pdfAttachment.filename,
              content: pdfAttachment.content,
            },
          ],
        }
      : {}),
  });
}

// ─── Build InvoiceData + emailArgs from a booking ID ─────────────────────────

export async function buildInvoiceDataForBooking(bookingId: string): Promise<{
  invoiceData: InvoiceData | null;
  emailArgs: Partial<PaymentConfirmationArgs>;
}> {
  const { db } = await import("@/lib/db");
  const { getCompanySettings } =
    await import("../../../actions/admin/companySettings");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      user: { select: { name: true, email: true, phone: true } },
      payment: {
        select: {
          status: true,
          amountPaidCents: true,
          tipCents: true,
          amountRefundedCents: true,
          paidAt: true,
          stripePaymentIntentId: true,
        },
      },
      stops: {
        orderBy: { stopOrder: "asc" as const },
        select: { address: true, stopOrder: true },
      },
      assignment: {
        include: { driver: { select: { name: true } } },
      },
      tripGroup: {
        include: {
          bookings: {
            select: {
              id: true,
              pickupAt: true,
              pickupAddress: true,
              dropoffAddress: true,
              totalCents: true,
              serviceType: { select: { name: true } },
            },
            orderBy: { pickupAt: "asc" as const },
          },
        },
      },
    },
  });

  if (!booking) return { invoiceData: null, emailArgs: {} };

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone ?? "America/Phoenix";

  const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
  const tipCents = booking.payment?.tipCents ?? 0;
  const amountRefundedCents = booking.payment?.amountRefundedCents ?? 0;

  const customerName =
    booking.user?.name?.trim() ||
    (booking as any).guestName?.trim() ||
    booking.user?.email ||
    (booking as any).guestEmail ||
    "Guest";

  const customerEmail =
    booking.user?.email || (booking as any).guestEmail || "";
  const customerPhone =
    booking.user?.phone?.trim() || (booking as any).guestPhone?.trim() || null;

  const paymentMethodDisplay = booking.payment?.stripePaymentIntentId
    ? "Credit Card (online)"
    : "Manual Payment (Cash)";

  const logoUrl = (companySettings as any).logoUrl as string | undefined;

  const company = {
    name: companySettings.officeName || "Nier Transportation",
    address: companySettings.officeAddress || "",
    city: companySettings.officeCity || "",
    phone: companySettings.dispatchPhone || "",
    email: companySettings.supportEmail || "",
  };

  let invoiceData: InvoiceData | null = null;
  let isGroupBooking = false;
  let groupLegs: PaymentConfirmationArgs["groupLegs"] = [];

  if (booking.tripGroup) {
    isGroupBooking = true;
    const siblings = booking.tripGroup.bookings;
    const groupTotal = siblings.reduce((sum, b) => sum + b.totalCents, 0);
    const groupInvoiceNumber = booking.tripGroup.id.slice(0, 8).toUpperCase();

    groupLegs = siblings.map((sibling, idx) => ({
      legNumber: idx + 1,
      date: formatTripDateTime(sibling.pickupAt, companyTz),
      pickupAddress: sibling.pickupAddress,
      dropoffAddress: sibling.dropoffAddress,
      serviceName: sibling.serviceType.name,
      amountCents: sibling.totalCents,
    }));

    invoiceData = {
      invoiceNumber: groupInvoiceNumber,
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: booking.payment?.paidAt
        ? formatInvoiceDate(booking.payment.paidAt)
        : null,
      logoUrl,
      company,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      trip: {
        date: formatTripDateTime(
          siblings[0]?.pickupAt ?? booking.pickupAt,
          companyTz,
        ),
        pickupAddress: siblings[0]?.pickupAddress ?? booking.pickupAddress,
        dropoffAddress:
          siblings[siblings.length - 1]?.dropoffAddress ??
          booking.dropoffAddress,
        stops: [],
        serviceName: "Multi-leg Trip",
        vehicleName: `${siblings.length} rides`,
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: null,
        durationMinutes: null,
      },
      lineItems: siblings.map((sibling, idx) => ({
        description: `Ride ${idx + 1}: ${sibling.serviceType.name} — ${formatTripDateTime(sibling.pickupAt, companyTz)}`,
        amount: sibling.totalCents,
      })),
      legs: groupLegs,
      subtotalCents: groupTotal,
      feesCents: 0,
      taxesCents: 0,
      totalCents: groupTotal,
      tipCents,
      amountPaidCents: groupTotal,
      amountRefundedCents: 0,
      currency: booking.currency ?? "usd",
      paymentMethodDisplay,
      bookingConfirmation: groupInvoiceNumber,
    };
  } else {
    const stopCount = booking.stops?.length ?? 0;
    const stopSurchargeCents =
      (booking as any).stopSurchargeCents ?? stopCount * 1500;
    const baseFareCents = booking.subtotalCents - stopSurchargeCents;

    const lineItems: InvoiceLineItem[] = [
      {
        description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.vehicle?.name ?? "Vehicle"}`,
        amount: baseFareCents,
      },
    ];

    if (stopCount > 0 && stopSurchargeCents > 0) {
      lineItems.push({
        description: `Extra Stop${stopCount > 1 ? "s" : ""} (${stopCount} × $15.00)`,
        amount: stopSurchargeCents,
      });
    }
    if (booking.feesCents > 0) {
      lineItems.push({
        description: "Service Fee",
        amount: booking.feesCents,
      });
    }
    if (booking.taxesCents > 0) {
      lineItems.push({ description: "Tax", amount: booking.taxesCents });
    }

    const invoiceAmountPaid =
      Math.abs(amountPaidCents - booking.totalCents) <= 100
        ? amountPaidCents + tipCents
        : amountPaidCents;

    invoiceData = {
      invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: booking.payment?.paidAt
        ? formatInvoiceDate(booking.payment.paidAt)
        : null,
      logoUrl,
      company,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      trip: {
        date: formatTripDateTime(booking.pickupAt, companyTz),
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        stops: booking.stops.map((s) => ({
          address: s.address,
          stopOrder: s.stopOrder,
        })),
        serviceName: booking.serviceType?.name ?? "Transportation",
        vehicleName: booking.vehicle?.name ?? "Vehicle",
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: booking.distanceMiles
          ? Number(booking.distanceMiles)
          : null,
        durationMinutes: booking.durationMinutes,
      },
      lineItems,
      subtotalCents: booking.subtotalCents,
      feesCents: booking.feesCents,
      taxesCents: booking.taxesCents,
      totalCents: booking.totalCents,
      tipCents,
      amountPaidCents: invoiceAmountPaid,
      amountRefundedCents,
      currency: booking.currency ?? "usd",
      paymentMethodDisplay,
      driverName: booking.assignment?.driver?.name ?? undefined,
      bookingConfirmation: booking.id.slice(0, 8).toUpperCase(),
    };
  }

  const emailArgs: Partial<PaymentConfirmationArgs> = {
    pickupAtISO: booking.pickupAt.toISOString(),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    serviceName: booking.serviceType?.name ?? null,
    vehicleName: booking.vehicle?.name ?? null,
    passengers: booking.passengers,
    luggage: booking.luggage,
    totalCents: isGroupBooking
      ? booking.tripGroup!.bookings.reduce((s, b) => s + b.totalCents, 0)
      : booking.totalCents,
    amountPaidCents,
    tipCents: tipCents > 0 ? tipCents : undefined,
    currency: booking.currency ?? "usd",
    paymentMethod: paymentMethodDisplay,
    isGroupBooking,
    groupLegs,
  };

  return { invoiceData, emailArgs };
}
