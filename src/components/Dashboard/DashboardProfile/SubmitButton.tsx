"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  className,
  text,
}: {
  className: string;
  text: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type='submit' className={className} disabled={pending}>
      {pending ? "Saving..." : text}
    </button>
  );
}
