"use client";

import { useState } from "react";

type Props = {
  bookingId: string;
};

export default function EstimateDownload({ bookingId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/estimate/${bookingId}/download`);
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
      <p
        style={{
          fontSize: "1.2rem",
          color: "#64748b",
          margin: 0,
        }}
      >
        This is a non-binding estimate. Final price may vary. A confirmed
        invoice will be sent once payment is complete.
      </p>
    </div>
  );
}
