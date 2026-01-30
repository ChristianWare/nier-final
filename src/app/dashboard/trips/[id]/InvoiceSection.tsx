// src/app/dashboard/trips/[id]/InvoiceSection.tsx
"use client";

import { useState } from "react";
import InvoicePreview from "@/components/Dashboard/InvoicePreview/InvoicePreview";
import type { InvoiceData } from "@/lib/invoice/types";

type Props = {
  invoice: InvoiceData;
  bookingId: string;
};

export default function InvoiceSection({ invoice, bookingId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const response = await fetch(`/api/invoices/${bookingId}/download`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download invoice");
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to download invoice",
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
