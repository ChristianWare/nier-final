"use client";

import { useFormStatus } from "react-dom";

export default function CancelTripButton({ className }: { className: string }) {
  const { pending } = useFormStatus();

  return (
    <button type='submit' className={className} disabled={pending}>
      {pending ? "Cancelling..." : "Cancel"}
    </button>
  );
}
