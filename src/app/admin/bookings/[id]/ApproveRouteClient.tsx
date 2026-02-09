"use client";

import { useState, useTransition } from "react";
import {
  approveRouteAction,
  unapproveRouteAction,
} from "../../../../../actions/admin/approveRouteAction";
import Button from "@/components/shared/Button/Button";

export default function ApproveRouteClient({
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
        await unapproveRouteAction(bookingId);
        setApproved(false);
      } else {
        await approveRouteAction(bookingId);
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
            ? "✓ Route Approved"
            : "Approve Route"
      }
      btnType='greenReg'
      onClick={handleToggle}
      disabled={isPending}
    />
  );
}
