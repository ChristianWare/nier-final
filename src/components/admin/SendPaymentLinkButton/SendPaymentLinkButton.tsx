/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createPaymentLinkAndEmail } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";

export default function SendPaymentLinkButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      style={{ marginTop: "1rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("bookingId", bookingId);

        startTransition(() => {
          createPaymentLinkAndEmail(fd).then(async (res) => {
            if (res?.error) {
              toast.error(res.error);

              const url = (res as any)?.checkoutUrl as string | undefined;
              if (url && typeof navigator !== "undefined") {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Checkout URL copied to clipboard");
                } catch {}
              }

              router.refresh();
              return;
            }

            const reused = Boolean((res as any)?.reused);
            toast.success(
              reused ? "Payment link re-sent" : "Payment link emailed",
            );
            router.refresh();
          });
        });
      }}
    >
      <Button
        disabled={isPending}
        type='submit'
        text={isPending ? "Sending..." : "Email payment link"}
        btnType='gray'
        email
      />
    </form>
  );
}
