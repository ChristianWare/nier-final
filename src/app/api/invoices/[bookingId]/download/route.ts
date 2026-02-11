// src/app/api/invoices/[bookingId]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../../../actions/admin/companySettings";
import { generateInvoicePDF } from "@/lib/invoice";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helper to convert Decimal to number
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

// Resolve session user ID
async function resolveSessionUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any,
): Promise<string | null> {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;

    // Auth check
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch booking with all needed data
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        serviceType: { select: { name: true } },
        vehicle: { select: { name: true } },
        payment: {
          select: {
            status: true,
            amountPaidCents: true,
            amountRefundedCents: true,
            tipCents: true,
            paidAt: true,
          },
        },
        stops: {
          orderBy: { stopOrder: "asc" },
          select: { address: true, stopOrder: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check ownership
    if (booking.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if paid
    if (booking.payment?.status !== "PAID") {
      return NextResponse.json(
        { error: "Invoice only available for paid bookings" },
        { status: 400 },
      );
    }

    // Get company settings
    const companySettings = await getCompanySettings();

    // Build invoice data
    const invoiceNumber = bookingId.slice(0, 8).toUpperCase();
    const invoiceDate = formatInvoiceDate(booking.createdAt);
    const paidDate = booking.payment.paidAt
      ? formatInvoiceDate(booking.payment.paidAt)
      : null;

    // Build line items
    const lineItems: InvoiceLineItem[] = [];

    // Base fare (subtotal minus stop surcharge)
    const stopCount = booking.stops?.length ?? 0;
    const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
    const baseFareCents = booking.subtotalCents - stopSurchargeCents;

    lineItems.push({
      description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.vehicle?.name ?? "Vehicle"}`,
      amount: baseFareCents,
    });

    // Stop surcharge
    if (stopCount > 0 && stopSurchargeCents > 0) {
      lineItems.push({
        description: `Extra Stop${stopCount > 1 ? "s" : ""} (${stopCount} × $15.00)`,
        amount: stopSurchargeCents,
      });
    }

    // Fees
    if (booking.feesCents > 0) {
      lineItems.push({
        description: "Service Fee",
        amount: booking.feesCents,
      });
    }

    // Taxes
    if (booking.taxesCents > 0) {
      lineItems.push({
        description: "Tax",
        amount: booking.taxesCents,
      });
    }

    const invoiceData: InvoiceData = {
      invoiceNumber,
      invoiceDate,
      paidDate,

      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },

      customer: {
        name: booking.user?.name?.trim() || booking.user?.email || "Customer",
        email: booking.user?.email || "",
        phone: booking.user?.phone || null,
      },

      trip: {
        date: formatTripDateTime(booking.pickupAt),
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
        distanceMiles: toNumber(booking.distanceMiles),
        durationMinutes: booking.durationMinutes,
      },

      lineItems,

      subtotalCents: booking.subtotalCents,
      feesCents: booking.feesCents,
      taxesCents: booking.taxesCents,
      totalCents: booking.totalCents,
      tipCents: booking.payment.tipCents ?? 0,
      amountPaidCents:
        (booking.payment.amountPaidCents ?? 0) +
        (booking.payment.tipCents ?? 0),
      amountRefundedCents: booking.payment.amountRefundedCents ?? 0,

      currency: booking.currency,
    };

    // Generate PDF using helper function
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF
    const filename = `invoice-${invoiceNumber}.pdf`;

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 },
    );
  }
}
