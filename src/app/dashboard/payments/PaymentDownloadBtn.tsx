"use client";

import { useState } from "react";
import styles from "./PaymentsPage.module.css";

export default function PaymentDownloadBtn({
  bookingId,
}: {
  bookingId: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${bookingId}/download`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${bookingId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Invoice download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type='button'
      className={styles.downloadBtn}
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? "Downloading…" : "Download"}
    </button>
  );
}
