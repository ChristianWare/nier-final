/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/estimate/[bookingId]/download/route.ts
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getBookingEstimateData } from "../../../../../../actions/bookings/getBookingEstimateData";
import EstimatePDF from "@/lib/invoice/EstimatePDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  const result = await getBookingEstimateData(bookingId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    createElement(EstimatePDF, { invoice: result.data }) as any,
  );

  const filename = `estimate-${result.data.invoiceNumber}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
