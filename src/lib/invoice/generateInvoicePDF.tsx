// src/lib/invoice/generateInvoicePDF.tsx
import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "./InvoicePDF";
import type { InvoiceData } from "./types";

/**
 * Generate a PDF buffer from invoice data
 * This is a separate .tsx file to handle JSX properly
 */
export async function generateInvoicePDF(
  invoiceData: InvoiceData,
): Promise<Buffer> {
  const pdfBuffer = await renderToBuffer(<InvoicePDF invoice={invoiceData} />);
  return pdfBuffer as Buffer;
}
