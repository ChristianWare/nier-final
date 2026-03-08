/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/dashboard/trips/[id]/InvoiceSection.tsx
"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import InvoicePreview from "@/components/Dashboard/InvoicePreview/InvoicePreview";
import InvoicePDF from "@/lib/invoice/InvoicePDF";
import type { InvoiceData } from "@/lib/invoice/types";

type Props = {
  invoice: InvoiceData;
  bookingId: string;
};

export default function InvoiceSection({ invoice, bookingId: _ }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      // Pre-fetch the logo and convert to base64 so react-pdf gets raw
      // image bytes rather than a Cloudinary redirect URL, which causes
      // the double-render artifact.
      let resolvedInvoice = invoice;
      if (invoice.logoUrl) {
        try {
          const imgRes = await fetch(invoice.logoUrl);
          const imgBlob = await imgRes.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imgBlob);
          });
          resolvedInvoice = { ...invoice, logoUrl: base64 };
        } catch {
          // If logo fetch fails, proceed without it rather than blocking
          resolvedInvoice = { ...invoice, logoUrl: undefined };
        }
      }

      const blob = await pdf(<InvoicePDF invoice={resolvedInvoice} />).toBlob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Invoice PDF generation error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate invoice",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <InvoicePreview
      invoice={invoice}
      onDownload={handleDownload}
      isDownloading={isDownloading}
    />
  );
}
