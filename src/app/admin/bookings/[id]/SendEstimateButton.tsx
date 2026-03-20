"use client";

// src/app/admin/bookings/[id]/SendEstimateButton.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { sendEstimateEmail } from "../../../../../actions/admin/sendEstimateEmail";
import Button from "@/components/shared/Button/Button";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Props = {
  bookingId: string;
  customerEmail: string | null;
};

export default function SendEstimateButton({
  bookingId,
  customerEmail,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showOverride, setShowOverride] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleSend() {
    setOverrideError(null);

    if (showOverride) {
      if (!overrideEmail.trim()) {
        setOverrideError("Please enter an email address.");
        return;
      }
      if (!isValidEmail(overrideEmail.trim())) {
        setOverrideError("Please enter a valid email address.");
        return;
      }
    }

    const formData = new FormData();
    formData.append("bookingId", bookingId);
    if (showOverride && overrideEmail.trim()) {
      formData.append("overrideEmail", overrideEmail.trim().toLowerCase());
    }

    startTransition(async () => {
      const result = await sendEstimateEmail(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const target =
        showOverride && overrideEmail.trim()
          ? overrideEmail.trim().toLowerCase()
          : (customerEmail?.toLowerCase() ?? "customer");

      toast.success(`Estimate sent to ${target}`);
      setSent(true);
      if (showOverride) {
        setShowOverride(false);
        setOverrideEmail("");
      }
      router.refresh();
    });
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/estimate/${bookingId}/download`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate-${bookingId.slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not generate estimate PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className='cardTitle h5' style={{ marginBottom: 20 }}>Send Estimate to Customer (optional)</div>

      <Button
        btnType='blackReg'
        text={
          isPending
            ? "Sending..."
            : sent
              ? "✓ Estimate sent"
              : "Email estimate to client"
        }
        disabled={isPending}
        onClick={handleSend}
        type='button'
      />

      <Button
        btnType='greenReg'
        text={
          showOverride
            ? "✕ Cancel — use original email"
            : "Send to a different email"
        }
        onClick={() => {
          setShowOverride((prev) => !prev);
          setOverrideEmail("");
          setOverrideError(null);
        }}
        type='button'
      />

      {showOverride && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            type='email'
            value={overrideEmail}
            onChange={(e) => {
              setOverrideEmail(e.target.value);
              setOverrideError(null);
            }}
            placeholder='Enter alternate email address...'
            className='input emptySmall'
            autoFocus
            style={{
              borderColor: overrideError ? "rgba(180,0,0,0.6)" : undefined,
            }}
          />
          {overrideError && (
            <p style={{ color: "#c00", fontSize: "1.4rem", margin: 0 }}>
              {overrideError}
            </p>
          )}
          <p
            style={{
              fontSize: "1.3rem",
              color: "var(--paragraph)",
              margin: 0,
              opacity: 0.85,
            }}
          >
            The estimate will be sent to this address instead of the
            customer&apos;s email on file. Then click the button above to send.
          </p>
        </div>
      )}

      <Button
        btnType='blueReg'
        text={isDownloading ? "Generating PDF..." : "Download estimate PDF"}
        disabled={isDownloading}
        onClick={handleDownload}
        type='button'
      />
    </div>
  );
}
