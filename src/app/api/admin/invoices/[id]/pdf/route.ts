/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/admin/invoices/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { auth } from "../../../../../../../auth";
import { renderInvoicePdfBuffer, buildInvoicePdfData } from "@/lib/invoice/buildInvoicePdfData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const role = (session?.user as any)?.role ?? null;
  const roles = ((session?.user as any)?.roles ?? []) as string[];
  const isAdmin = role === "ADMIN" || roles.includes("ADMIN");
  if (!session || !isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;

  const data = await buildInvoicePdfData(id);
  if (!data) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const buffer = await renderInvoicePdfBuffer(id);
  if (!buffer) {
    return NextResponse.json(
      { error: "Could not generate PDF." },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
  const filename = `${data.status === "PAID" ? "receipt" : "invoice"}-${data.invoiceNumber}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}