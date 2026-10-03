"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteDiscountCode,
  setDiscountCodeActive,
} from "../../../../actions/admin/discountCodes";
import own from "./DiscountCodes.module.css";

/** Copy the share link, turn the code on or off, or delete an unused code. */
export default function CodeActions({
  id,
  code,
  active,
  used,
}: {
  id: string;
  code: string;
  active: boolean;
  used: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className={own.actions}>
      <button
        type='button'
        className='tab'
        onClick={async () => {
          const link = `${window.location.origin}/book?code=${encodeURIComponent(code)}`;
          try {
            await navigator.clipboard.writeText(link);
            setMessage("Share link copied.");
          } catch {
            setMessage(link);
          }
        }}
      >
        Copy share link
      </button>
      <button
        type='button'
        className='tab'
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await setDiscountCodeActive(id, !active);
            setMessage(
              "error" in res
                ? res.error
                : active
                  ? "Turned off."
                  : "Turned on.",
            );
            router.refresh();
          })
        }
      >
        {active ? "Turn off" : "Turn on"}
      </button>
      {!used ? (
        <button
          type='button'
          className='tab'
          disabled={isPending}
          onClick={() => {
            if (!window.confirm(`Delete ${code}? This can't be undone.`))
              return;
            startTransition(async () => {
              const res = await deleteDiscountCode(id);
              if ("error" in res) {
                setMessage(res.error);
                return;
              }
              router.push("/admin/discount-codes");
            });
          }}
        >
          Delete
        </button>
      ) : null}
      {message ? <span className='miniNote'>{message}</span> : null}
    </div>
  );
}
