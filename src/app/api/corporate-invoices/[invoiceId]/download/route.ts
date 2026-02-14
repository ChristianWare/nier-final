// src/app/api/corporate-invoices/[invoiceId]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../../../actions/admin/companySettings";
import { generateInvoicePDF } from "@/lib/invoice";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (val as any).toNumber === "function")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (val as any).toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const { invoiceId } = await params;

    // Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId =
      (session.user as { id?: string }).id ??
      (session.user as { userId?: string }).userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: true },
    });

    const isAdmin = user?.roles?.includes("ADMIN") ?? false;

    // Fetch invoice with line items and corporate account
    const invoice = await db.corporateInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        corporateAccount: {
          select: {
            id: true,
            name: true,
            billingEmail: true,
            billingAddress: true,
            billingCity: true,
            billingState: true,
            billingZip: true,
            discountPercent: true,
          },
        },
        lineItems: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Authorization: admin or corporate contact for this account
    if (!isAdmin) {
      const contact = await db.corporateContact.findFirst({
        where: {
          userId,
          corporateAccountId: invoice.corporateAccountId,
        },
      });
      if (!contact) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch booking details for each line item
    const bookingIds = invoice.lineItems
      .map((li) => li.bookingId)
      .filter(Boolean) as string[];

    const bookings = await db.booking.findMany({
      where: { id: { in: bookingIds } },
      include: {
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        corporatePassenger: { select: { name: true } },
        stops: {
          orderBy: { stopOrder: "asc" },
          select: { address: true, stopOrder: true },
        },
      },
    });

    // Get company settings
    const companySettings = await getCompanySettings();

    // Build line items — prepend booking confirmation to each description
    const lineItems: InvoiceLineItem[] = invoice.lineItems.map((li) => {
      const confirmationCode = li.bookingId
        ? li.bookingId.slice(0, 8).toUpperCase()
        : null;
      const prefix = confirmationCode ? `[#${confirmationCode}] ` : "";

      return {
        description: `${prefix}${li.description}`,
        amount: li.amountCents,
      };
    });

    // If there's a discount, add it as a line item
    if (invoice.discountCents > 0) {
      lineItems.push({
        description: `Corporate Discount (${invoice.corporateAccount?.discountPercent ?? ""}%)`,
        amount: -invoice.discountCents,
      });
    }

    // Use the first booking for trip details
    const firstBooking = bookings[0] ?? null;
    const account = invoice.corporateAccount;

    // Build booking confirmation for invoice header
    const firstBookingId = invoice.lineItems[0]?.bookingId ?? null;
    const bookingConfirmation = firstBookingId
      ? firstBookingId.slice(0, 8).toUpperCase()
      : null;

    const displayInvoiceNumber = bookingConfirmation
      ? `${invoice.invoiceNumber}  ·  Booking #${bookingConfirmation}`
      : invoice.invoiceNumber;

    const billingAddress = [
      account?.billingAddress,
      account?.billingCity,
      account?.billingState,
      account?.billingZip,
    ]
      .filter(Boolean)
      .join(", ");

    const invoiceData: InvoiceData = {
      invoiceNumber: displayInvoiceNumber,
      invoiceDate: formatInvoiceDate(invoice.createdAt),
      paidDate: invoice.paidAt ? formatInvoiceDate(invoice.paidAt) : null,

      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },

      customer: {
        name: account?.name ?? "Corporate Client",
        email: account?.billingEmail ?? "",
        phone: billingAddress || null,
      },

      trip: firstBooking
        ? {
            date: formatTripDateTime(
              firstBooking.pickupAt,
              companySettings.timezone,
            ),
            pickupAddress: firstBooking.pickupAddress,
            dropoffAddress: firstBooking.dropoffAddress,
            stops: firstBooking.stops.map((s) => ({
              address: s.address,
              stopOrder: s.stopOrder,
            })),
            serviceName: firstBooking.serviceType?.name ?? "Transportation",
            vehicleName: firstBooking.vehicle?.name ?? "Vehicle",
            passengers: firstBooking.passengers,
            luggage: firstBooking.luggage,
            distanceMiles: toNumber(firstBooking.distanceMiles),
            durationMinutes: firstBooking.durationMinutes,
          }
        : {
            date: formatInvoiceDate(invoice.periodStart),
            pickupAddress: "—",
            dropoffAddress: "—",
            stops: [],
            serviceName: "Corporate Transportation",
            vehicleName: "—",
            passengers: 0,
            luggage: 0,
            distanceMiles: null,
            durationMinutes: null,
          },

      lineItems,

      subtotalCents: invoice.subtotalCents,
      feesCents: 0,
      taxesCents: 0,
      totalCents: invoice.totalCents,
      tipCents: 0,
      amountPaidCents: invoice.amountPaidCents,
      amountRefundedCents: 0,

      currency: "usd",
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData);
    const uint8Array = new Uint8Array(pdfBuffer);
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Corporate invoice PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 },
    );
  }
}
