"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import styles from "./InvoicePdfpanel.module.css";

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  isPaid: boolean;
};


export default function InvoicePdfPanel({
  invoiceId,
  invoiceNumber,
  isPaid,
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const src = `/api/admin/invoices/${invoiceId}/pdf`;

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const res = await fetch(`${src}?download=1`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${isPaid ? "receipt" : "invoice"}-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error("Could not generate the PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>
            {isPaid ? "Receipt PDF" : "Invoice PDF"}
          </h2>
          <p className={styles.sub}>
            {isPaid
              ? "This is the paid receipt the customer received."
              : "This is what the customer sees. It becomes a paid receipt automatically once they pay."}
          </p>
        </div>
        <div className={styles.headActions}>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ghostBtn}
          >
            Open in new tab
          </a>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>

      <div className={styles.frameWrap}>
        <iframe
          src={src}
          title={`Invoice ${invoiceNumber} PDF`}
          className={styles.frame}
        />
      </div>
    </div>
  );
}