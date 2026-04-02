/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";

type Props = {
  bookingId: string;
  depositMode?: boolean;
  depositPercent?: number | null;
  depositCents?: number | null;
  balanceCents?: number | null;
  totalCents?: number | null;
  currency?: string;
};

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function EstimateDownload({
  bookingId,
  depositMode,
  depositPercent,
  depositCents,
  balanceCents,
  totalCents,
  currency = "USD",
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      // Pass deposit info to the PDF route so it can render deposit rows
      const params = new URLSearchParams();
      if (depositMode && depositPercent) {
        params.set("depositPercent", String(depositPercent));
        if (depositCents != null)
          params.set("depositCents", String(depositCents));
        if (balanceCents != null)
          params.set("balanceCents", String(balanceCents));
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/estimate/${bookingId}/download${query}`);
      if (!res.ok) throw new Error("Failed to generate estimate");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate-${bookingId.slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate estimate. Please contact support.");
    } finally {
      setIsDownloading(false);
    }
  }

  const hasDeposit =
    depositMode && depositPercent && depositCents != null && depositCents > 0;

  return (
    <div
      style={{
        display: "grid",
        gap: "1.2rem",
        padding: "1.6rem",
        background: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: 10,
        marginTop: "1.6rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "1.8rem" }}>📄</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>
            Download Your Estimate
          </div>
          <div style={{ fontSize: "1.3rem", color: "#64748b", marginTop: 2 }}>
            Need internal approval? Download a price estimate PDF to share with
            your team or company.
          </div>
        </div>
      </div>

      {/* Deposit callout */}
      {hasDeposit && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.8rem",
            padding: "1rem 1.2rem",
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: 8,
            fontSize: "1.3rem",
          }}
        >
          <span>💳</span>
          <div style={{ lineHeight: 1.6 }}>
            <strong>Deposit option included:</strong> customer can pay a{" "}
            {depositPercent}% deposit of{" "}
            <strong>{fmt(depositCents!, currency)}</strong> now
            {balanceCents != null && balanceCents > 0 ? (
              <>
                , then the <strong>{fmt(balanceCents, currency)}</strong>{" "}
                balance later
              </>
            ) : null}
            , or pay the full amount upfront. This is reflected in the PDF.
          </div>
        </div>
      )}

      {/* Download button */}
      <button
        type='button'
        onClick={handleDownload}
        disabled={isDownloading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.8rem",
          padding: "0.9rem 2rem",
          background: isDownloading ? "#94a3b8" : "#1e40af",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: "1.4rem",
          fontWeight: 600,
          cursor: isDownloading ? "not-allowed" : "pointer",
          width: "fit-content",
          transition: "background 0.15s",
        }}
      >
        {isDownloading ? (
          <>
            <span
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Generating PDF...
          </>
        ) : (
          <>📥 Download Estimate PDF</>
        )}
      </button>

      {/* Disclaimer */}
      <p style={{ fontSize: "1.2rem", color: "#64748b", margin: 0 }}>
        This is a non-binding estimate. Final price may vary. A confirmed
        invoice will be sent once payment is complete.
      </p>
    </div>
  );
}
