"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createPaymentLinkAndEmail } from "../../../../actions/admin/bookings";

export default function SendPaymentLinkButton({
  bookingId,
}: {
  bookingId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set("bookingId", bookingId);

        startTransition(() => {
          createPaymentLinkAndEmail(fd).then((res) => {
            if (res?.error) return toast.error(res.error);
            toast.success("Payment link emailed");
            router.refresh();
          });
        });
      }}
    >
      <button disabled={isPending} style={btnStyle} type='submit'>
        {isPending ? "Sending..." : "Email payment link"}
      </button>
    </form>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "0.85rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
};
