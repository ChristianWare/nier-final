"use client";

import { useState, useTransition } from "react";
import {
  approvePriceAction,
  unapprovePriceAction,
} from "../../../../../actions/admin/approvePriceAction";
import Button from "@/components/shared/Button/Button";

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
    <Button
      text={
        isPending
          ? "Saving..."
          : approved
            ? "✓ Price Approved"
            : "Approve Price"
      }
      btnType='greenReg'
      onClick={handleToggle}
      disabled={isPending}
    />
  );
}
