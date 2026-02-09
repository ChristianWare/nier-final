"use client";

import { useState, useTransition } from "react";
import { approvePriceAction, unapprovePriceAction } from "../../../../../actions/admin/approvePriceAction"

export default function ApprovePriceClient({
  bookingId,
  isApproved,
}: {
  bookingId: string;
  isApproved: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [approved, setApproved] = useState(isApproved);

  function handleToggle() {
    startTransition(async () => {
      if (approved) {
        await unapprovePriceAction(bookingId);
        setApproved(false);
      } else {
        await approvePriceAction(bookingId);
        setApproved(true);
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      style={{
        padding: "0.6rem 1.2rem",
        borderRadius: 8,
        border: approved ? "2px solid #22c55e" : "2px solid var(--stroke)",
        background: approved ? "rgba(34, 197, 94, 0.1)" : "var(--white)",
        color: approved ? "#15803d" : "var(--black)",
        fontWeight: 700,
        fontSize: "1.3rem",
        cursor: isPending ? "wait" : "pointer",
        transition: "all 0.2s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "inherit",
        letterSpacing: "normal",
      }}
    >
      {isPending
        ? "Saving..."
        : approved
          ? "✓ Price Approved"
          : "Approve Price"}
    </button>
  );
}
